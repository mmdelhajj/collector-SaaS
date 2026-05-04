<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
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
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

/**
 * Public self-service signup. Creates a tenant + first owner user + 14-day
 * trial in one atomic transaction. The owner receives a Sanctum token in
 * the response so the frontend can drop them straight into their dashboard
 * without a separate login round-trip.
 *
 * Rate-limited per IP to slow down spam signups before Stripe sees the card.
 */
class SignupController extends Controller
{
    public function plans(): JsonResponse
    {
        $plans = Plan::query()
            ->where('is_public', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Plan $p) => [
                'code' => $p->code,
                'name' => $p->name,
                'description' => $p->description,
                'price_monthly' => (float) $p->price_monthly,
                'price_annual' => $p->price_annual ? (float) $p->price_annual : null,
                'limits' => [
                    'customers' => $p->limit_customers,
                    'users' => $p->limit_users,
                    'collectors' => $p->limit_collectors,
                ],
                'features' => [
                    'radius' => $p->feature_radius,
                    'whatsapp' => $p->feature_whatsapp,
                    'sms' => $p->feature_sms,
                    'priority_support' => $p->feature_priority_support,
                ],
            ]);

        return response()->json(['data' => $plans]);
    }

    public function signup(Request $request): JsonResponse
    {
        // 5 signups per IP per hour — generous for legit demo flows, harsh
        // enough to stop scripts.
        $key = 'signup:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => "Too many signups from this IP. Try again in {$seconds}s.",
            ])->status(429);
        }
        RateLimiter::hit($key, 3600);

        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:120'],
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required', 'email', 'max:255',
                Rule::unique('users', 'email'),
            ],
            'password' => ['required', 'string', 'min:8', 'max:120'],
            'plan' => ['required', Rule::in(['starter', 'growth', 'pro'])],
            'billing_period' => ['sometimes', Rule::in(['monthly', 'annual'])],
            'locale' => ['sometimes', Rule::in(['en', 'ar', 'fr'])],
        ]);

        $plan = Plan::query()->where('code', $data['plan'])->firstOrFail();

        $result = DB::transaction(function () use ($data, $plan) {
            // 1. Create the tenant with a 14-day trial.
            $slug = Str::slug($data['company_name']).'-'.Str::lower(Str::random(4));
            $tenant = Tenant::query()->create([
                'name' => $data['company_name'],
                'slug' => $slug,
                'currency_primary' => 'USD',
                'timezone' => 'Asia/Beirut',
                'locale' => $data['locale'] ?? 'en',
                'plan' => $plan->code,
                'plan_id' => $plan->id,
                'billing_period' => $data['billing_period'] ?? 'monthly',
                'status' => 'trial',
                'trial_ends_at' => now()->addDays(14),
            ]);

            // 2. Create owner user (no tenant scope — we set tenant_id explicitly).
            $user = User::query()->create([
                'tenant_id' => $tenant->id,
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => null,
                'locale' => $data['locale'] ?? 'en',
                'timezone' => 'Asia/Beirut',
                'password' => Hash::make($data['password']),
                'is_active' => true,
            ]);

            // 3. Seed RBAC for this tenant + assign owner role.
            (new RolesSeeder)->seedForTenant($tenant->id);
            app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
            $user->assignRole(Rbac::ROLE_TENANT_OWNER);

            // 4. Seed default message templates (with tenant scope active).
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

        // Audit needs an active tenant context to scope the row.
        $context = app(TenantContext::class);
        $previous = $context->get();
        $context->set($tenant);
        try {
            Audit::record('tenant.signed_up', $tenant, [
                'plan' => $plan->code,
                'billing_period' => $data['billing_period'] ?? 'monthly',
            ], $tenant->name);
        } finally {
            if ($previous) {
                $context->set($previous);
            } else {
                $context->clear();
            }
        }

        // 5. Issue an API token so the frontend can drop them straight in.
        $token = $user->createToken('Web Admin', ['*'], now()->addDays(30));

        return response()->json([
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'plan' => $plan->code,
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
            ],
            'user' => new UserResource($user->load('roles')),
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at?->toIso8601String(),
        ], 201);
    }
}
