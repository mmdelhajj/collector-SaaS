<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Plan;
use App\Models\PlanChangeRequest;
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
     * Tenant self-service plan change — submits a request, doesn't apply.
     *
     * Pre-this-feature: tenant.plan_id was mutated immediately. Now the
     * change goes through a super-admin approval queue (PlanChangeRequest
     * rows). Tenants see "request pending" until approval.
     *
     * Idempotency: only one pending request per tenant at a time (DB
     * partial unique index enforces it; we also catch the duplicate here
     * for a friendly error).
     */
    public function changePlan(Request $request): JsonResponse
    {
        $this->authorize('billing.manage');
        $tenant = $this->tenant();

        $data = $request->validate([
            'plan_code' => ['required', 'string', Rule::exists('plans', 'code')],
            'billing_period' => ['required', Rule::in(['monthly', 'annual'])],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $plan = Plan::query()->where('code', $data['plan_code'])->firstOrFail();

        if ($tenant->plan === $plan->code && $tenant->billing_period === $data['billing_period']) {
            return response()->json([
                'message' => 'Already on this plan and billing period.',
            ], 200);
        }

        // Existing pending request for this tenant?
        $existing = PlanChangeRequest::query()
            ->where('tenant_id', $tenant->id)
            ->where('status', 'pending')
            ->first();
        if ($existing) {
            return response()->json([
                'message' => 'You already have a pending plan change request awaiting approval.',
                'data' => $this->serializeRequest($existing),
            ], 409);
        }

        $req = PlanChangeRequest::query()->create([
            'tenant_id' => $tenant->id,
            'requested_plan_id' => $plan->id,
            'requested_period' => $data['billing_period'],
            'current_plan_code' => $tenant->plan,
            'current_period' => $tenant->billing_period,
            'status' => 'pending',
            'requester_note' => $data['note'] ?? null,
            'requested_by_user_id' => $request->user()->id,
        ]);

        Audit::record(
            'tenant.plan_change_requested',
            $tenant,
            [
                'from' => $tenant->plan.'/'.$tenant->billing_period,
                'to' => $plan->code.'/'.$data['billing_period'],
            ],
            $plan->name,
        );

        return response()->json([
            'message' => 'Your plan change has been submitted for super-admin approval.',
            'data' => $this->serializeRequest($req->fresh(['requestedPlan', 'requestedBy'])),
        ], 202);
    }

    /**
     * Tenant view of their pending request (if any). Used by the billing UI
     * to show "Pending: Pro/annual — submitted 2h ago" instead of the change-
     * plan button when a request is in-flight.
     */
    public function pendingPlanRequest(): JsonResponse
    {
        $tenant = $this->tenant();
        $req = PlanChangeRequest::query()
            ->with(['requestedPlan', 'requestedBy'])
            ->where('tenant_id', $tenant->id)
            ->where('status', 'pending')
            ->latest()
            ->first();

        return response()->json([
            'data' => $req ? $this->serializeRequest($req) : null,
        ]);
    }

    /**
     * Tenant cancels their own pending request (changed their mind before
     * super-admin decides).
     */
    public function cancelPlanRequest(int $id, Request $request): JsonResponse
    {
        $this->authorize('billing.manage');
        $tenant = $this->tenant();

        $req = PlanChangeRequest::query()
            ->where('tenant_id', $tenant->id)
            ->where('id', $id)
            ->where('status', 'pending')
            ->firstOrFail();

        $req->update([
            'status' => 'cancelled',
            'decided_by_user_id' => $request->user()->id,
            'decided_at' => now(),
        ]);

        Audit::record('tenant.plan_change_cancelled', $tenant, null);

        return response()->json(['message' => 'Request cancelled.']);
    }

    private function serializeRequest(PlanChangeRequest $r): array
    {
        return [
            'id' => $r->id,
            'status' => $r->status,
            'requested_plan' => $r->requestedPlan ? [
                'code' => $r->requestedPlan->code,
                'name' => $r->requestedPlan->name,
                'price_monthly' => (float) $r->requestedPlan->price_monthly,
                'price_annual' => $r->requestedPlan->price_annual !== null
                    ? (float) $r->requestedPlan->price_annual : null,
            ] : null,
            'requested_period' => $r->requested_period,
            'current_plan_code' => $r->current_plan_code,
            'current_period' => $r->current_period,
            'requester_note' => $r->requester_note,
            'decision_note' => $r->decision_note,
            'requested_by' => $r->requestedBy?->name,
            'created_at' => $r->created_at?->toIso8601String(),
            'decided_at' => $r->decided_at?->toIso8601String(),
        ];
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
