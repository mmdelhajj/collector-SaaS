<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\MessageLog;
use App\Models\Tenant;
use App\Services\Notifications\MessageRenderer;
use App\Support\Notifications\MessageGateway;
use App\Support\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sends a reminder or overdue-chase message to the customer for one invoice.
 * Mirrors SendPaymentReceiptJob's channel-fallback logic (WhatsApp → SMS → Email)
 * and reuses the same MessageRenderer + MessageGateway pipeline so the
 * driver swap (Twilio / 360dialog) is consistent.
 */
class SendInvoiceReminderJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public string $invoiceId,
        public string $templateKey, // invoice_reminder | invoice_overdue
    ) {}

    public function handle(MessageGateway $gateway, MessageRenderer $renderer): void
    {
        $invoice = Invoice::withoutTenant()->findOrFail($this->invoiceId);
        $tenant = Tenant::query()->find($invoice->tenant_id);
        if (! $tenant) {
            return;
        }

        $context = app(TenantContext::class);
        $previous = $context->get();
        $context->set($tenant);

        try {
            $invoice->load('customer');
            if (! $invoice->customer) {
                return;
            }

            // Only chase invoices that still owe money — bail if it got paid
            // between scheduling and execution.
            if ((float) $invoice->balance_due <= 0) {
                return;
            }

            $this->dispatchReminder($invoice, $invoice->customer, $tenant, $gateway, $renderer);
        } finally {
            if ($previous) {
                $context->set($previous);
            } else {
                $context->clear();
            }
        }
    }

    private function dispatchReminder(
        Invoice $invoice,
        Customer $customer,
        Tenant $tenant,
        MessageGateway $gateway,
        MessageRenderer $renderer,
    ): void {
        $vars = [
            'customer_name' => $customer->full_name ?? trim(
                ($customer->first_name ?? '').' '.($customer->last_name ?? '')
            ),
            'amount' => number_format((float) $invoice->balance_due, 2),
            'currency' => $invoice->currency,
            'invoice_number' => $invoice->number,
            'due_at' => $invoice->due_at?->format('Y-m-d') ?? '',
            'days_overdue' => $invoice->due_at
                ? (int) max(0, now()->diffInDays($invoice->due_at, false) * -1)
                : 0,
            'tenant_name' => $tenant->name,
            'pay_url' => url("/invoices/{$invoice->id}/pay"),
        ];

        $locale = $customer->locale ?? $tenant->locale ?? 'en';

        $channels = $this->resolveChannels($customer, $tenant);

        foreach ($channels as [$channel, $address]) {
            $rendered = $renderer->render(
                tenantId: $tenant->id,
                key: $this->templateKey,
                channel: $channel,
                locale: $locale,
                vars: $vars,
            );

            $log = MessageLog::query()->create([
                'tenant_id' => $tenant->id,
                'customer_id' => $customer->id,
                'channel' => $channel,
                'template_key' => $this->templateKey,
                'to_address' => $address,
                'status' => 'queued',
                'related_type' => Invoice::class,
                'related_id' => $invoice->id,
                'payload' => ['source' => $rendered['source'], 'vars' => $vars],
            ]);

            $result = $gateway->send(
                channel: $channel,
                toAddress: $address,
                body: $rendered['body'],
                subject: $rendered['subject'],
            );

            $log->update([
                'status' => $result->ok ? 'sent' : 'failed',
                'provider' => $result->provider,
                'provider_message_id' => $result->providerMessageId,
                'cost' => $result->cost,
                'error' => $result->error,
                'sent_at' => $result->ok ? now() : null,
            ]);

            if ($result->ok) {
                return; // first successful channel wins
            }

            Log::warning('Reminder send failed, trying next channel', [
                'invoice' => $invoice->id,
                'channel' => $channel,
                'error' => $result->error,
            ]);
        }
    }

    /**
     * @return list<array{0:string,1:string}>
     */
    private function resolveChannels(Customer $customer, Tenant $tenant): array
    {
        $settings = $tenant->settings['notifications'] ?? [];
        $channels = [];

        if (($settings['whatsapp_enabled'] ?? true) && $customer->whatsapp_phone) {
            $channels[] = ['whatsapp', $customer->whatsapp_phone];
        }
        if (($settings['sms_enabled'] ?? true) && $customer->phone_primary) {
            $channels[] = ['sms', $customer->phone_primary];
        }
        if (($settings['email_enabled'] ?? false) && $customer->email) {
            $channels[] = ['email', $customer->email];
        }

        return $channels;
    }

    public function failed(Throwable $e): void
    {
        Log::error('SendInvoiceReminderJob failed permanently', [
            'invoice_id' => $this->invoiceId,
            'template' => $this->templateKey,
            'error' => $e->getMessage(),
        ]);

        try {
            MessageLog::query()
                ->withoutGlobalScopes()
                ->where('related_type', Invoice::class)
                ->where('related_id', $this->invoiceId)
                ->where('template_key', $this->templateKey)
                ->where('status', 'queued')
                ->update([
                    'status' => 'failed',
                    'error' => 'job exhausted retries: '.substr($e->getMessage(), 0, 480),
                ]);
        } catch (Throwable) {
            // already logging the original failure
        }
    }
}
