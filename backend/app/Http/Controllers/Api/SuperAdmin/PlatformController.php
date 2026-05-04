<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Audit;
use App\Support\Rbac;
use App\Support\TenantContext;
use Database\Seeders\MessageTemplatesSeeder;
use Database\Seeders\RolesSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\PermissionRegistrar;

class PlatformController extends Controller
{
    /**
     * Platform-wide summary KPIs the super-admin sees on /super-admin/dashboard.
     */
    public function overview(): JsonResponse
    {
        $now = now();

        $tenants = Tenant::query()->get();
        $byStatus = $tenants->groupBy('status')->map->count();

        // MRR estimate: sum of (plan.price_monthly) across active tenants.
        $plans = Plan::query()->get()->keyBy('code');
        $mrr = $tenants
            ->where('status', 'active')
            ->sum(fn ($t) => (float) ($plans->get($t->plan)?->price_monthly ?? 0));

        return response()->json([
            'data' => [
                'tenants' => [
                    'total' => $tenants->count(),
                    'trial' => (int) ($byStatus['trial'] ?? 0),
                    'active' => (int) ($byStatus['active'] ?? 0),
                    'suspended' => (int) ($byStatus['suspended'] ?? 0),
                ],
                'users' => User::query()
                    ->whereNotNull('tenant_id')
                    ->count(),
                'customers' => Customer::withoutGlobalScopes()->count(),
                'invoices' => Invoice::withoutGlobalScopes()->count(),
                'payments' => Payment::withoutGlobalScopes()->count(),
                'mrr' => round((float) $mrr, 2),
                'arr' => round((float) $mrr * 12, 2),
                'collected_30d' => round((float) Payment::withoutGlobalScopes()
                    ->where('status', 'completed')
                    ->where('collected_at', '>=', $now->copy()->subDays(30))
                    ->sum('amount'), 2),
            ],
        ]);
    }

    public function tenants(Request $request): JsonResponse
    {
        $query = Tenant::query();
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('slug', 'ilike', "%{$search}%");
            });
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        $page = $query->orderByDesc('created_at')->paginate(50);

        $plans = Plan::query()->get()->keyBy('code');

        // Counts must bypass BelongsToTenant — super-admin has no tenant
        // context. Two grouped queries cover the whole page.
        $tenantIds = collect($page->items())->pluck('id');
        $userCounts = User::query()
            ->whereIn('tenant_id', $tenantIds)
            ->selectRaw('tenant_id, COUNT(*) AS n')
            ->groupBy('tenant_id')
            ->pluck('n', 'tenant_id');
        $customerCounts = Customer::withoutGlobalScopes()
            ->whereIn('tenant_id', $tenantIds)
            ->selectRaw('tenant_id, COUNT(*) AS n')
            ->groupBy('tenant_id')
            ->pluck('n', 'tenant_id');

        return response()->json([
            'data' => collect($page->items())->map(fn (Tenant $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'slug' => $t->slug,
                'plan' => $t->plan,
                'plan_price' => $plans->get($t->plan)?->price_monthly,
                'status' => $t->status,
                'trial_ends_at' => $t->trial_ends_at?->toIso8601String(),
                'subscription_ends_at' => $t->subscription_ends_at?->toIso8601String(),
                'users_count' => (int) ($userCounts[$t->id] ?? 0),
                'customers_count' => (int) ($customerCounts[$t->id] ?? 0),
                'created_at' => $t->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function tenantDetail(string $id): JsonResponse
    {
        $tenant = Tenant::query()->with('users.roles')->findOrFail($id);
        $plans = Plan::query()->get()->keyBy('code');

        $customerCount = Customer::withoutGlobalScopes()
            ->where('tenant_id', $id)
            ->count();
        $payments30d = Payment::withoutGlobalScopes()
            ->where('tenant_id', $id)
            ->where('status', 'completed')
            ->where('collected_at', '>=', now()->subDays(30))
            ->sum('amount');
        $unpaidInvoices = Invoice::withoutGlobalScopes()
            ->where('tenant_id', $id)
            ->whereIn('status', ['open', 'partial', 'overdue'])
            ->count();

        return response()->json([
            'data' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'plan' => $tenant->plan,
                'plan_price' => $plans->get($tenant->plan)?->price_monthly,
                'billing_period' => $tenant->billing_period,
                'status' => $tenant->status,
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                'subscription_ends_at' => $tenant->subscription_ends_at?->toIso8601String(),
                'created_at' => $tenant->created_at?->toIso8601String(),
                'currency_primary' => $tenant->currency_primary,
                'timezone' => $tenant->timezone,
                'locale' => $tenant->locale,
                'stats' => [
                    'users' => $tenant->users->count(),
                    'customers' => $customerCount,
                    'unpaid_invoices' => $unpaidInvoices,
                    'collected_30d' => round((float) $payments30d, 2),
                ],
                'users' => $tenant->users->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'is_active' => (bool) $u->is_active,
                    'last_login_at' => $u->last_login_at?->toIso8601String(),
                    'roles' => $u->roles->pluck('name'),
                ])->values(),
            ],
        ]);
    }

    /**
     * Super-admin manually provisions a new tenant. Same flow as the public
     * signup, but trial days configurable, plan can be any, and the temp
     * password is returned once for the super-admin to share.
     */
    public function createTenant(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:120'],
            'owner_name' => ['required', 'string', 'max:120'],
            'owner_email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'plan' => ['required', Rule::in(['starter', 'growth', 'pro'])],
            'billing_period' => ['sometimes', Rule::in(['monthly', 'annual'])],
            'trial_days' => ['sometimes', 'integer', 'min:0', 'max:365'],
            'status' => ['sometimes', Rule::in(['trial', 'active'])],
            'locale' => ['sometimes', Rule::in(['en', 'ar', 'fr'])],
            'timezone' => ['sometimes', 'string', 'max:64'],
            'currency_primary' => ['sometimes', 'string', 'size:3'],
        ]);

        $plan = Plan::query()->where('code', $data['plan'])->firstOrFail();
        $trialDays = $data['trial_days'] ?? 14;
        $status = $data['status'] ?? ($trialDays > 0 ? 'trial' : 'active');
        $generatedPassword = Str::password(16);

        $result = DB::transaction(function () use ($data, $plan, $trialDays, $status, $generatedPassword) {
            $slug = Str::slug($data['company_name']).'-'.Str::lower(Str::random(4));
            $tenant = Tenant::query()->create([
                'name' => $data['company_name'],
                'slug' => $slug,
                'currency_primary' => $data['currency_primary'] ?? 'USD',
                'timezone' => $data['timezone'] ?? 'Asia/Beirut',
                'locale' => $data['locale'] ?? 'en',
                'plan' => $plan->code,
                'plan_id' => $plan->id,
                'billing_period' => $data['billing_period'] ?? 'monthly',
                'status' => $status,
                'trial_ends_at' => $trialDays > 0 ? now()->addDays($trialDays) : null,
            ]);

            $user = User::query()->create([
                'tenant_id' => $tenant->id,
                'name' => $data['owner_name'],
                'email' => $data['owner_email'],
                'locale' => $data['locale'] ?? 'en',
                'timezone' => $data['timezone'] ?? 'Asia/Beirut',
                'password' => Hash::make($generatedPassword),
                'is_active' => true,
            ]);

            (new RolesSeeder)->seedForTenant($tenant->id);
            app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
            $user->assignRole(Rbac::ROLE_TENANT_OWNER);

            $context = app(TenantContext::class);
            $previous = $context->get();
            $context->set($tenant);
            try {
                (new MessageTemplatesSeeder)->seedForTenant($tenant->id);
            } finally {
                if ($previous) {
                    $context->set($previous);
                } else {
                    $context->clear();
                }
            }

            return [$tenant, $user];
        });

        [$tenant, $user] = $result;

        $context = app(TenantContext::class);
        $previous = $context->get();
        $context->set($tenant);
        try {
            Audit::record('platform.tenant_created', $tenant, [
                'plan' => $plan->code,
                'created_by_super_admin' => true,
            ], $tenant->name);
        } finally {
            if ($previous) {
                $context->set($previous);
            } else {
                $context->clear();
            }
        }

        return response()->json([
            'data' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'plan' => $plan->code,
                'status' => $tenant->status,
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
            ],
            'owner' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'temporary_password' => $generatedPassword,
            ],
            'message' => 'Share the temporary password via a secure channel — it is shown only once.',
        ], 201);
    }

    public function updateTenant(Request $request, string $id): JsonResponse
    {
        $tenant = Tenant::query()->findOrFail($id);

        $data = $request->validate([
            'plan' => ['sometimes', Rule::in(['starter', 'growth', 'pro'])],
            'billing_period' => ['sometimes', Rule::in(['monthly', 'annual'])],
            'status' => ['sometimes', Rule::in(['trial', 'active', 'suspended'])],
            'extend_trial_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'name' => ['sometimes', 'string', 'max:120'],
        ]);

        $update = [];
        if (isset($data['name'])) {
            $update['name'] = $data['name'];
        }
        if (isset($data['plan'])) {
            $plan = Plan::query()->where('code', $data['plan'])->firstOrFail();
            $update['plan'] = $plan->code;
            $update['plan_id'] = $plan->id;
        }
        if (isset($data['billing_period'])) {
            $update['billing_period'] = $data['billing_period'];
        }
        if (isset($data['status'])) {
            $update['status'] = $data['status'];
        }
        if (isset($data['extend_trial_days'])) {
            $base = $tenant->trial_ends_at && $tenant->trial_ends_at->isFuture()
                ? $tenant->trial_ends_at
                : now();
            $update['trial_ends_at'] = $base->copy()->addDays($data['extend_trial_days']);
        }

        $tenant->update($update);

        $context = app(TenantContext::class);
        $previous = $context->get();
        $context->set($tenant);
        try {
            Audit::record('platform.tenant_updated', $tenant, $data, $tenant->name);
        } finally {
            if ($previous) {
                $context->set($previous);
            } else {
                $context->clear();
            }
        }

        return response()->json(['data' => $tenant->fresh()]);
    }

    public function suspend(string $id): JsonResponse
    {
        $tenant = Tenant::query()->findOrFail($id);
        if ($tenant->status === 'suspended') {
            return response()->json(['data' => $tenant]);
        }
        $tenant->update(['status' => 'suspended']);

        $this->auditWithTenant($tenant, 'platform.tenant_suspended', null);

        return response()->json(['data' => $tenant->fresh()]);
    }

    public function reactivate(string $id): JsonResponse
    {
        $tenant = Tenant::query()->findOrFail($id);
        $next = $tenant->trial_ends_at && $tenant->trial_ends_at->isFuture()
            ? 'trial'
            : 'active';
        $tenant->update(['status' => $next]);

        $this->auditWithTenant($tenant, 'platform.tenant_reactivated', ['status' => $next]);

        return response()->json(['data' => $tenant->fresh()]);
    }

    /**
     * Record an audit event under the affected tenant's context, so the row
     * is attributed to that tenant (rather than landing as a platform-level
     * NULL-tenant audit). Restores any prior context on the way out.
     *
     * @param  array<string, mixed>|null  $changes
     */
    private function auditWithTenant(Tenant $tenant, string $action, ?array $changes): void
    {
        $context = app(TenantContext::class);
        $previous = $context->get();
        $context->set($tenant);
        try {
            Audit::record($action, $tenant, $changes, $tenant->name);
        } finally {
            if ($previous) {
                $context->set($previous);
            } else {
                $context->clear();
            }
        }
    }
}
