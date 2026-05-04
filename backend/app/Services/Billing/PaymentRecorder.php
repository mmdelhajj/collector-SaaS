<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Jobs\ReactivateServiceJob;
use App\Jobs\SendPaymentReceiptJob;
use App\Models\CollectorAssignment;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Encapsulates the side-effects of recording a payment:
 *   1. Insert the Payment row.
 *   2. Apply the payment to the linked invoice (paid_amount, status).
 *   3. Recompute the customer's outstanding balance from the source of truth
 *      (sum of unpaid invoice balances).
 *
 * Wrapped in a single transaction with a row-lock on the invoice to prevent
 * race conditions when two collectors record payments on the same invoice
 * at the same time.
 */
class PaymentRecorder
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function record(array $attributes): Payment
    {
        // Dual-currency normalization: the caller may pass either
        //   `amount` + `currency` (legacy / web-admin path — taken as the
        //      invoice-currency value, no conversion needed)
        // OR
        //   `amount_received` + `currency_received` (mobile path — the
        //      actual cash the customer handed over). We compute `amount`
        //      in invoice currency by converting at the tenant's locked
        //      rate, and snapshot the rate on the row so a later rate
        //      change doesn't retroactively alter accounting.
        $attributes = $this->normalizeCurrency($attributes);

        $payment = DB::transaction(function () use ($attributes) {
            $payment = Payment::query()->create($attributes);

            if ($payment->invoice_id) {
                $this->applyToInvoice($payment);
            }

            $this->recomputeCustomerBalance($payment->customer_id);

            return $payment->fresh();
        });

        // Receipt-send is async — we never want WhatsApp/SMS latency to slow
        // a collector standing at a customer's door. Dispatched after the
        // transaction commits so the worker reads the committed row.
        if ($payment->status === 'completed') {
            SendPaymentReceiptJob::dispatch($payment->id)->afterCommit();
            // Lift any RADIUS suspension if this payment cleared the balance.
            // The job no-ops if the customer still owes anything.
            ReactivateServiceJob::dispatch($payment->customer_id)->afterCommit();
        }

        return $payment;
    }

    /**
     * Normalize an inbound payment payload across the two call sites:
     * web admin (knows invoice currency, sends amount in invoice currency)
     * vs mobile collector (sends what the customer paid, may differ).
     *
     * Output guarantees:
     *   - `amount`              — invoice-currency value (used in invoice math)
     *   - `currency`            — = invoice.currency if invoice_id given
     *   - `amount_received`     — exactly what customer handed over (preserved)
     *   - `currency_received`   — currency they used
     *   - `exchange_rate_used`  — 1.0 if same currency, else the locked tenant rate
     *
     * @param  array<string, mixed>  $a
     * @return array<string, mixed>
     */
    private function normalizeCurrency(array $a): array
    {
        $invoiceCurrency = null;
        if (! empty($a['invoice_id'])) {
            $invoice = Invoice::query()
                ->where('id', $a['invoice_id'])
                ->first(['id', 'currency']);
            if ($invoice) {
                $invoiceCurrency = $invoice->currency;
            }
        }

        // Resolve "received" tuple — what the customer actually paid.
        $amountReceived = isset($a['amount_received']) ? (float) $a['amount_received'] : null;
        $currencyReceived = $a['currency_received'] ?? null;

        if ($amountReceived === null) {
            // Legacy path: caller provided amount + currency, no conversion.
            $amountReceived = isset($a['amount']) ? (float) $a['amount'] : 0.0;
            $currencyReceived = $a['currency'] ?? $invoiceCurrency ?? 'USD';
        }
        if (! $currencyReceived) {
            $currencyReceived = $invoiceCurrency ?? 'USD';
        }

        $targetCurrency = $invoiceCurrency ?? $currencyReceived;

        if ($currencyReceived === $targetCurrency) {
            $a['amount'] = round($amountReceived, 2);
            $a['currency'] = $targetCurrency;
            $a['amount_received'] = round($amountReceived, 2);
            $a['currency_received'] = $currencyReceived;
            $a['exchange_rate_used'] = 1.0;

            return $a;
        }

        // Need a real conversion. Look up the tenant's currency pair + rate.
        $tenant = $this->resolveTenant($a);
        if (! $tenant || ! $tenant->exchange_rate || $tenant->exchange_rate <= 0) {
            throw new InvalidArgumentException(
                'No exchange rate configured — cannot record a payment in a currency '
                .'that differs from the invoice currency.'
            );
        }

        $rate = (float) $tenant->exchange_rate;
        $primary = $tenant->currency_primary;
        $secondary = $tenant->currency_secondary;

        // Validate the pair we're being asked to convert.
        $pair = [$currencyReceived, $targetCurrency];
        if (! in_array($primary, $pair, true) || ! in_array($secondary, $pair, true)) {
            throw new InvalidArgumentException(
                "Currency conversion {$currencyReceived}→{$targetCurrency} is not "
                ."supported by tenant pair {$primary}/{$secondary}."
            );
        }

        // exchange_rate stores secondary-per-primary (see RefreshExchangeRatesJob).
        // primary → secondary: multiply; secondary → primary: divide.
        if ($currencyReceived === $primary && $targetCurrency === $secondary) {
            $convertedAmount = $amountReceived * $rate;
        } elseif ($currencyReceived === $secondary && $targetCurrency === $primary) {
            $convertedAmount = $amountReceived / $rate;
        } else {
            // Same currency — already handled above; reach here only via bug.
            $convertedAmount = $amountReceived;
        }

        $a['amount'] = round($convertedAmount, 2);
        $a['currency'] = $targetCurrency;
        $a['amount_received'] = round($amountReceived, 2);
        $a['currency_received'] = $currencyReceived;
        $a['exchange_rate_used'] = round($rate, 6);

        return $a;
    }

    /**
     * @param  array<string, mixed>  $a
     */
    private function resolveTenant(array $a): ?Tenant
    {
        if (! empty($a['tenant_id'])) {
            return Tenant::query()->find($a['tenant_id']);
        }
        $ctx = app(TenantContext::class);

        return $ctx->isSet() ? $ctx->get() : null;
    }

    private function applyToInvoice(Payment $payment): void
    {
        // Lock the invoice row for the duration of this transaction. Withdraws
        // the row from any concurrent writer until commit/rollback.
        $invoice = Invoice::query()
            ->where('id', $payment->invoice_id)
            ->lockForUpdate()
            ->firstOrFail();

        $newPaid = round((float) $invoice->paid_amount + (float) $payment->amount, 2);
        $total = (float) $invoice->total;

        $status = match (true) {
            $newPaid >= $total => 'paid',
            $newPaid > 0 => 'partial',
            default => $invoice->status,
        };

        $invoice->update([
            'paid_amount' => $newPaid,
            'status' => $status,
            'paid_at' => $newPaid >= $total ? ($invoice->paid_at ?? $payment->collected_at) : null,
        ]);

        // Update the collector's assignment to reflect reality:
        //   - Fully paid → mark completed (drops off the To-do list)
        //   - Partial    → bump to in_progress (still on the route — collector
        //                  needs to come back for the rest)
        if ($payment->collected_by_user_id) {
            $newStatus = $status === 'paid' ? 'completed' : 'in_progress';
            $update = [
                'status' => $newStatus,
                'updated_at' => now(),
            ];
            if ($newStatus === 'completed') {
                $update['completed_at'] = $payment->collected_at ?? now();
            }
            CollectorAssignment::query()
                ->where('invoice_id', $invoice->id)
                ->where('collector_user_id', $payment->collected_by_user_id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->update($update);
        }
    }

    private function recomputeCustomerBalance(string $customerId): void
    {
        $balance = (float) Invoice::query()
            ->where('customer_id', $customerId)
            ->whereIn('status', ['open', 'partial', 'overdue'])
            ->sum('balance_due');

        Customer::query()
            ->where('id', $customerId)
            ->update(['balance_due' => round($balance, 2)]);
    }

    /**
     * Roll back a payment's effects. Used by the refund flow.
     */
    public function refund(Payment $payment): Payment
    {
        return DB::transaction(function () use ($payment) {
            $payment->update(['status' => 'refunded']);

            if ($payment->invoice_id) {
                $invoice = Invoice::query()
                    ->where('id', $payment->invoice_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $newPaid = max(0, round(
                    (float) $invoice->paid_amount - (float) $payment->amount,
                    2,
                ));
                $total = (float) $invoice->total;
                $status = match (true) {
                    $newPaid >= $total => 'paid',
                    $newPaid > 0 => 'partial',
                    default => 'open',
                };

                $invoice->update([
                    'paid_amount' => $newPaid,
                    'status' => $status,
                    'paid_at' => $newPaid >= $total ? $invoice->paid_at : null,
                ]);
            }

            $this->recomputeCustomerBalance($payment->customer_id);

            return $payment->fresh();
        });
    }
}
