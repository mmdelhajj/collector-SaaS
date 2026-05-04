<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Jobs\ReactivateServiceJob;
use App\Jobs\SendPaymentReceiptJob;
use App\Models\CollectorAssignment;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

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
