<?php

declare(strict_types=1);

namespace App\Services\Billing;

use App\Models\CustomerSubscription;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Support\UniqueRetry;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Stateless service that turns a CustomerSubscription into one open Invoice
 * for the given billing period. Idempotent — if an invoice already exists for
 * the same (subscription_id, period_start, period_end) tuple, returns it
 * unchanged. Caller controls the transaction scope.
 */
class InvoiceGenerator
{
    public function generateForSubscription(
        CustomerSubscription $subscription,
        Carbon $periodStart,
        Carbon $periodEnd,
        ?Carbon $issuedAt = null,
        ?int $netDays = 15,
    ): Invoice {
        $existing = Invoice::query()
            ->where('subscription_id', $subscription->id)
            ->where('period_start', $periodStart)
            ->where('period_end', $periodEnd)
            ->first();

        if ($existing) {
            return $existing;
        }

        $issued = $issuedAt ?? now();
        $package = $subscription->package;
        $price = (float) ($subscription->price_override ?? $package->price);

        return UniqueRetry::run(fn () => DB::transaction(function () use (
            $subscription, $package, $price, $issued, $periodStart, $periodEnd, $netDays
        ) {
            $invoice = Invoice::query()->create([
                'tenant_id' => $subscription->tenant_id,
                'customer_id' => $subscription->customer_id,
                'subscription_id' => $subscription->id,
                'issued_at' => $issued,
                'due_at' => (clone $issued)->addDays($netDays ?? 15),
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'subtotal' => $price,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'total' => $price,
                'currency' => $package->currency,
                'status' => 'open',
                'paid_amount' => 0,
            ]);

            InvoiceItem::query()->create([
                'tenant_id' => $subscription->tenant_id,
                'invoice_id' => $invoice->id,
                'package_id' => $package->id,
                'description' => sprintf(
                    '%s — %s to %s',
                    $package->name,
                    $periodStart->format('d M Y'),
                    $periodEnd->format('d M Y'),
                ),
                'quantity' => 1,
                'unit_price' => $price,
                'tax_rate' => 0,
                'total' => $price,
                'meta' => [
                    'speed_down_mbps' => $package->speed_down_mbps,
                    'speed_up_mbps' => $package->speed_up_mbps,
                ],
            ]);

            return $invoice->fresh('items');
        }));
    }

    /**
     * Run the monthly billing cycle for every active subscription in the
     * current tenant. Returns a summary array.
     *
     * @return array{generated: int, skipped: int, total_amount: float}
     */
    public function runMonthlyBillingForCurrentTenant(?Carbon $month = null): array
    {
        $month ??= now();
        $periodStart = $month->copy()->startOfMonth();
        $periodEnd = $month->copy()->endOfMonth();

        $subs = CustomerSubscription::query()
            ->where('status', 'active')
            ->with('package')
            ->cursor();

        $generated = 0;
        $skipped = 0;
        $total = 0.0;

        foreach ($subs as $sub) {
            if (! $sub->package) {
                $skipped++;

                continue;
            }
            // Check existence BEFORE delegating, since generateForSubscription
            // returns a fresh-loaded instance where wasRecentlyCreated is false.
            $exists = Invoice::query()
                ->where('subscription_id', $sub->id)
                ->where('period_start', $periodStart)
                ->where('period_end', $periodEnd)
                ->exists();

            if ($exists) {
                $skipped++;

                continue;
            }

            $invoice = $this->generateForSubscription(
                $sub,
                $periodStart,
                $periodEnd,
                $periodStart,
            );
            $generated++;
            $total += (float) $invoice->total;
        }

        return [
            'generated' => $generated,
            'skipped' => $skipped,
            'total_amount' => round($total, 2),
        ];
    }
}
