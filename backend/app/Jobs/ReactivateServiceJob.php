<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\RadiusUser;
use App\Services\Radius\CoaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * After a payment lands, check whether the customer's balance is now zero
 * (or the most recent invoice is fully paid) and, if so, lift any RADIUS
 * suspension we previously applied. Sends a CoA Disconnect-Request to
 * force a reauth so the new policy takes effect immediately.
 *
 * Idempotent — safely re-runnable. Only flips users currently in
 * `suspended` state to `active`.
 */
class ReactivateServiceJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public string $customerId) {}

    public function handle(CoaService $coa): void
    {
        $customer = Customer::withoutTenant()->find($this->customerId);
        if (! $customer) {
            return;
        }

        $outstandingCount = (int) Invoice::withoutTenant()
            ->where('customer_id', $customer->id)
            ->whereIn('status', ['open', 'partial', 'overdue'])
            ->count();

        if ($outstandingCount > 0) {
            // Customer still owes — don't reactivate.
            return;
        }

        $suspended = RadiusUser::withoutTenant()
            ->where('customer_id', $customer->id)
            ->where('status', 'suspended')
            ->get();

        foreach ($suspended as $user) {
            $user->update(['status' => 'active']);
            $coa->disconnect($user);
            Log::info('reactivated RADIUS user after payment', [
                'tenant_id' => $user->tenant_id,
                'customer_id' => $customer->id,
                'username' => $user->username,
            ]);
        }
    }

    public function failed(Throwable $e): void
    {
        Log::error('ReactivateServiceJob failed permanently', [
            'customer_id' => $this->customerId,
            'error' => $e->getMessage(),
        ]);
    }
}
