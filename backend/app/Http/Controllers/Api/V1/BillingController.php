<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Audit;
use App\Support\Rbac;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Tenant-facing subscription view. Distinct from Api\SuperAdmin\PlansController
 * which is the platform operator's pricing-tier control panel — this endpoint
 * is the tenant's own "what plan am I on, what's my usage, can I change it".
 */
class BillingController extends Controller
{
    public function subscription(): JsonResponse
    {
        $tenant = $this->tenant();
        $plan = Plan::query()->where('code', $tenant->plan)->first();

        $usage = $this->usage($tenant);

        return response()->json([
            'data' => [
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'status' => $tenant->status,
                    'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                    'subscription_ends_at' => $tenant->subscription_ends_at?->toIso8601String(),
                    'billing_period' => $tenant->billing_period,
                    'currency_primary' => $tenant->currency_primary,
                ],
                'plan' => $plan ? $this->serializePlan($plan) : null,
                'usage' => $usage,
                'limits' => [
                    'customers' => $plan?->limit_customers,
                    'users' => $plan?->limit_users,
                    'collectors' => $plan?->limit_collectors,
                ],
            ],
        ]);
    }

    /**
     * Plans the tenant can switch to. Includes their current plan even if
     * marked private, so the UI can show "you're here" alongside upgrades.
     */
    public function availablePlans(): JsonResponse
    {
        $tenant = $this->tenant();
        $plans = Plan::query()
            ->where(function ($q) use ($tenant) {
                $q->where('is_public', true)
                    ->orWhere('code', $tenant->plan);
            })
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $plans->map(fn (Plan $p) => $this->serializePlan($p)),
        ]);
    }

    /**
     * Tenant self-service plan change. Records audit and exits trial state
     * if the tenant explicitly chose `active`. Stripe wiring lives in a
     * follow-up — for now we trust the change and leave billing reconciliation
     * to super-admin.
     */
    public function changePlan(Request $request): JsonResponse
    {
        $this->authorize('billing.manage');
        $tenant = $this->tenant();

        $data = $request->validate([
            'plan_code' => ['required', 'string', Rule::exists('plans', 'code')],
            'billing_period' => ['required', Rule::in(['monthly', 'annual'])],
        ]);

        $plan = Plan::query()->where('code', $data['plan_code'])->firstOrFail();
        $oldPlan = $tenant->plan;
        $oldPeriod = $tenant->billing_period;

        if ($oldPlan === $plan->code && $oldPeriod === $data['billing_period']) {
            return response()->json([
                'message' => 'Already on this plan and billing period.',
            ], 200);
        }

        $tenant->plan = $plan->code;
        $tenant->plan_id = $plan->id;
        $tenant->billing_period = $data['billing_period'];
        // Leaving trial → active when the tenant deliberately picks a plan.
        if ($tenant->status === 'trial' && $tenant->trial_ends_at && $tenant->trial_ends_at->isPast()) {
            $tenant->status = 'active';
        }
        $tenant->save();

        Audit::record('tenant.plan_changed', $tenant, [
            'old_plan' => $oldPlan,
            'new_plan' => $plan->code,
            'old_period' => $oldPeriod,
            'new_period' => $data['billing_period'],
        ], $plan->name);

        return $this->subscription();
    }

    /**
     * Counts of resources that map to plan limits. Customers and tickets
     * are tenant-scoped via global scope; users + collectors live on a
     * cross-tenant table so we filter by tenant_id explicitly.
     */
    private function usage(Tenant $tenant): array
    {
        $customers = Customer::query()->count();

        $usersInTenant = User::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->count();

        // Collectors = users with the 'collector' role within this tenant.
        $collectorsInTenant = User::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->whereHas('roles', fn ($q) => $q->where('name', Rbac::ROLE_COLLECTOR))
            ->count();

        return [
            'customers' => $customers,
            'users' => $usersInTenant,
            'collectors' => $collectorsInTenant,
        ];
    }

    private function serializePlan(Plan $p): array
    {
        return [
            'id' => $p->id,
            'code' => $p->code,
            'name' => $p->name,
            'description' => $p->description,
            'price_monthly' => (float) $p->price_monthly,
            'price_annual' => $p->price_annual !== null ? (float) $p->price_annual : null,
            'limit_customers' => $p->limit_customers,
            'limit_users' => $p->limit_users,
            'limit_collectors' => $p->limit_collectors,
            'feature_radius' => (bool) $p->feature_radius,
            'feature_whatsapp' => (bool) $p->feature_whatsapp,
            'feature_sms' => (bool) $p->feature_sms,
            'feature_priority_support' => (bool) $p->feature_priority_support,
        ];
    }

    private function tenant(): Tenant
    {
        $tenant = app(TenantContext::class)->get();
        abort_if(! $tenant, 404, 'Tenant not found.');

        return $tenant;
    }

    private function authorize(string $permission): void
    {
        abort_unless(
            request()->user()?->can($permission),
            403,
            'You do not have permission for this action.',
        );
    }
}
