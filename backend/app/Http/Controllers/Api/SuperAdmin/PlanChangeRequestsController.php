<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PlanChangeRequest;
use App\Models\Tenant;
use App\Support\Audit;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Super-admin queue for tenant plan-change requests. Tenants submit via
 * BillingController::changePlan; this controller is where the platform
 * operator approves or rejects.
 *
 * On approve: tenants.plan_id is mutated to the requested plan and an
 * audit row is written under the affected tenant's context. Rejection
 * leaves the tenant on their current plan.
 */
class PlanChangeRequestsController extends Controller
{
    /**
     * GET /api/v1/super-admin/plan-change-requests?status=pending
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->string('status')->toString() ?: 'pending';

        $items = PlanChangeRequest::query()
            ->with(['tenant', 'requestedPlan', 'requestedBy', 'decidedBy'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (PlanChangeRequest $r) => $this->serialize($r));

        $pending = PlanChangeRequest::query()->where('status', 'pending')->count();

        return response()->json([
            'data' => $items,
            'pending_count' => $pending,
        ]);
    }

    /**
     * POST /api/v1/super-admin/plan-change-requests/{id}/approve
     */
    public function approve(int $id, Request $request): JsonResponse
    {
        $req = PlanChangeRequest::query()
            ->where('status', 'pending')
            ->findOrFail($id);

        $data = $request->validate([
            'decision_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $tenant = Tenant::query()->findOrFail($req->tenant_id);
        $plan = $req->requestedPlan;
        if (! $plan) {
            return response()->json([
                'message' => 'Requested plan no longer exists.',
            ], 410);
        }

        $oldPlan = $tenant->plan;
        $oldPeriod = $tenant->billing_period;

        $tenant->plan = $plan->code;
        $tenant->plan_id = $plan->id;
        $tenant->billing_period = $req->requested_period;
        // Same trial-exit rule as the old direct-change path.
        if ($tenant->status === 'trial' && $tenant->trial_ends_at && $tenant->trial_ends_at->isPast()) {
            $tenant->status = 'active';
        }
        $tenant->save();

        $req->update([
            'status' => 'approved',
            'decision_note' => $data['decision_note'] ?? null,
            'decided_by_user_id' => $request->user()->id,
            'decided_at' => now(),
        ]);

        // Audit under the tenant's context so the row attributes correctly.
        $this->withTenant($tenant, function () use ($oldPlan, $oldPeriod, $plan, $req) {
            Audit::record(
                'tenant.plan_changed',
                $req->tenant,
                [
                    'old_plan' => $oldPlan,
                    'new_plan' => $plan->code,
                    'old_period' => $oldPeriod,
                    'new_period' => $req->requested_period,
                    'via' => 'super_admin_approval',
                ],
                $plan->name,
            );
        });

        return response()->json([
            'message' => 'Plan change approved and applied.',
            'data' => $this->serialize($req->fresh(['tenant', 'requestedPlan', 'requestedBy', 'decidedBy'])),
        ]);
    }

    /**
     * POST /api/v1/super-admin/plan-change-requests/{id}/reject
     */
    public function reject(int $id, Request $request): JsonResponse
    {
        $req = PlanChangeRequest::query()
            ->where('status', 'pending')
            ->findOrFail($id);

        $data = $request->validate([
            'decision_note' => ['required', 'string', 'max:1000'],
        ]);

        $req->update([
            'status' => 'rejected',
            'decision_note' => $data['decision_note'],
            'decided_by_user_id' => $request->user()->id,
            'decided_at' => now(),
        ]);

        $tenant = Tenant::query()->find($req->tenant_id);
        if ($tenant) {
            $this->withTenant($tenant, function () use ($req, $data) {
                Audit::record(
                    'tenant.plan_change_rejected',
                    $req->tenant,
                    ['reason' => $data['decision_note']],
                );
            });
        }

        return response()->json([
            'message' => 'Plan change rejected.',
            'data' => $this->serialize($req->fresh(['tenant', 'requestedPlan', 'requestedBy', 'decidedBy'])),
        ]);
    }

    private function serialize(PlanChangeRequest $r): array
    {
        return [
            'id' => $r->id,
            'tenant' => $r->tenant ? [
                'id' => $r->tenant->id,
                'name' => $r->tenant->name,
                'slug' => $r->tenant->slug,
                'status' => $r->tenant->status,
                'current_plan' => $r->tenant->plan,
                'current_period' => $r->tenant->billing_period,
            ] : null,
            'status' => $r->status,
            'requested_plan' => $r->requestedPlan ? [
                'code' => $r->requestedPlan->code,
                'name' => $r->requestedPlan->name,
                'price_monthly' => (float) $r->requestedPlan->price_monthly,
                'price_annual' => $r->requestedPlan->price_annual !== null
                    ? (float) $r->requestedPlan->price_annual : null,
            ] : null,
            'requested_period' => $r->requested_period,
            'requested_by' => $r->requestedBy ? [
                'id' => $r->requestedBy->id,
                'name' => $r->requestedBy->name,
                'email' => $r->requestedBy->email,
            ] : null,
            'requester_note' => $r->requester_note,
            'decision_note' => $r->decision_note,
            'decided_by' => $r->decidedBy?->name,
            'created_at' => $r->created_at?->toIso8601String(),
            'decided_at' => $r->decided_at?->toIso8601String(),
        ];
    }

    private function withTenant(Tenant $tenant, callable $cb): void
    {
        $context = app(TenantContext::class);
        $previous = $context->get();
        $context->set($tenant);
        try {
            $cb();
        } finally {
            if ($previous) {
                $context->set($previous);
            } else {
                $context->clear();
            }
        }
    }
}
