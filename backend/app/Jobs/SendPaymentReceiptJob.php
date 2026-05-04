<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\MessageLog;
use App\Models\Payment;
use App\Models\Tenant;
use App\Services\Notifications\MessageRenderer;
use App\Support\Notifications\MessageGateway;
use App\Support\Notifications\SendResult;
use App\Support\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Generates the receipt artefacts for a payment and notifies the customer.
 *
 * Channel preference:
 *   1. WhatsApp (if customer has a whatsapp_phone)
 *   2. SMS (if customer has a phone_primary)
 *   3. Email (if customer has an email)
 *
 * Each successful send is logged to messages_log with provider + cost. On
 * a WhatsApp failure we automatically fall through to SMS — the customer
 * always gets the receipt as long as one channel works.
 *
 * NOTE: PDF generation + S3 upload + QR code are intentionally NOT yet
 * implemented in this job. They land in the next turn alongside a real
 * Twilio / 360dialog driver. The receipt URL points at our public
 * verification page which renders the payment in HTML for now.
 */
class SendPaymentReceiptJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public string $paymentId) {}

    public function handle(MessageGateway $gateway, MessageRenderer $renderer): void
    {
        // Look up the payment without tenant scope (the job has no HTTP context).
        $payment = Payment::withoutTenant()->findOrFail($this->paymentId);

        $tenant = Tenant::query()->find($payment->tenant_id);
        if (! $tenant) {
            return;
        }

        // Bind the tenant context so eager-loaded relationships pass the
        // BelongsToTenant scope. Snapshot whatever was active before so we
        // can restore it on the way out — never clobber a caller's context.
        $context = app(TenantContext::class);
        $previous = $context->get();
        $context->set($tenant);

        try {
            $payment->load(['customer', 'invoice']);
            $customer = $payment->customer;
            if (! $customer) {
                return;
            }

            $this->dispatchReceipt($payment, $customer, $tenant, $gateway, $renderer);
        } finally {
            if ($previous) {
                $context->set($previous);
            } else {
                $context->clear();
            }
        }
    }

    private function dispatchReceipt(
        Payment $payment,
        \App\Models\Customer $customer,
        Tenant $tenant,
        MessageGateway $gateway,
        MessageRenderer $renderer,
    ): void {

        $vars = [
            'customer_name' => $customer->full_name ?? trim(
                ($customer->first_name ?? '').' '.($customer->last_name ?? '')
            ),
            'amount' => number_format((float) $payment->amount, 2),
            'currency' => $payment->currency,
            'invoice_number' => $payment->invoice?->number ?? '—',
            'receipt_url' => \Illuminate\Support\Facades\URL::temporarySignedRoute(
                'receipts.public',
                now()->addDays((int) ($tenant->settings['receipt_link_ttl_days'] ?? 30)),
                ['paymentId' => $payment->id],
            ),
            'tenant_name' => $tenant->name,
        ];

        $locale = $customer->locale ?? $tenant->locale ?? 'en';

        $channels = $this->resolveChannels($customer);
        $sent = false;
        $usedChannels = [];

        foreach ($channels as [$channel, $address]) {
            $rendered = $renderer->render(
                tenantId: $tenant->id,
                key: 'payment_received',
                channel: $channel,
                locale: $locale,
                vars: $vars,
            );

            $log = MessageLog::query()->create([
                'tenant_id' => $tenant->id,
                'customer_id' => $customer->id,
                'channel' => $channel,
                'template_key' => 'payment_received',
                'to_address' => $address,
                'status' => 'queued',
                'related_type' => Payment::class,
                'related_id' => $payment->id,
                'payload' => ['source' => $rendered['source'], 'vars' => $vars],
            ]);

            $result = $gateway->send(
                channel: $channel,
                toAddress: $address,
                body: $rendered['body'],
                subject: $rendered['subject'],
                context: [
                    'related_type' => Payment::class,
                    'related_id' => $payment->id,
                ],
            );

            $this->applyResult($log, $result);

            if ($result->sent) {
                $sent = true;
                $usedChannels[] = $channel;
                // Stop after the first success — we don't want to send
                // the receipt on every channel.
                break;
            }
        }

        $payment->update([
            'receipt_sent_at' => $sent ? now() : null,
            'receipt_channels' => $sent ? $usedChannels : null,
        ]);
    }

    /**
     * @return list<array{0: string, 1: string}>
     */
    private function resolveChannels(\App\Models\Customer $customer): array
    {
        $channels = [];
        if ($customer->whatsapp_phone) {
            $channels[] = ['whatsapp', $customer->whatsapp_phone];
        }
        if ($customer->phone_primary) {
            $channels[] = ['sms', $customer->phone_primary];
        }
        if ($customer->email) {
            $channels[] = ['email', $customer->email];
        }

        return $channels;
    }

    private function applyResult(MessageLog $log, SendResult $result): void
    {
        if ($result->sent) {
            $log->update([
                'status' => 'sent',
                'provider' => $result->provider,
                'provider_message_id' => $result->providerMessageId,
                'cost' => $result->cost,
                'sent_at' => now(),
            ]);
        } else {
            $log->update([
                'status' => 'failed',
                'provider' => $result->provider,
                'error' => $result->error,
            ]);
        }
    }

    /**
     * Called by the queue worker after $tries attempts have all thrown.
     * We mark any still-queued message_log rows as failed so the audit
     * trail isn't stuck saying "queued" forever, and we leave a hard
     * log entry for ops to investigate.
     */
    public function failed(Throwable $e): void
    {
        Log::error('SendPaymentReceiptJob failed permanently', [
            'payment_id' => $this->paymentId,
            'error' => $e->getMessage(),
        ]);

        // Best-effort cleanup — flip stuck rows to 'failed'. We do this
        // outside any tenant context (the job's context is already gone
        // by the time we reach failed()), so use withoutGlobalScopes.
        try {
            MessageLog::query()
                ->withoutGlobalScopes()
                ->where('related_type', Payment::class)
                ->where('related_id', $this->paymentId)
                ->where('status', 'queued')
                ->update([
                    'status' => 'failed',
                    'error' => 'job exhausted retries: '.substr($e->getMessage(), 0, 480),
                ]);
        } catch (Throwable) {
            // already logging the original failure; don't cascade
        }
    }
}
