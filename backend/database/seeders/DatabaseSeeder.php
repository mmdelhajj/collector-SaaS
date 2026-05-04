<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\CustomerSubscription;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\ServiceCategory;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Billing\InvoiceGenerator;
use App\Support\Rbac;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Platform super-admin (no tenant) — operates everything from outside.
        User::query()->updateOrCreate(
            ['email' => 'super@isp-saas.test'],
            [
                'tenant_id' => null,
                'name' => 'Platform Super-Admin',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ],
        );

        $this->seedTenant('Demo ISP', 'demo-isp', 'admin@demoisp.com');
        $this->seedTenant('Demo Electric', 'demo-electric', 'admin@demoelectric.com');
    }

    private function seedTenant(string $name, string $slug, string $adminEmail): void
    {
        $tenant = Tenant::query()->updateOrCreate(
            ['slug' => $slug],
            [
                'name' => $name,
                'primary_color' => '#cc785c',
                'currency_primary' => 'USD',
                'currency_secondary' => 'LBP',
                'exchange_rate' => 89500,
                'timezone' => 'Asia/Beirut',
                'locale' => 'en',
                'plan' => 'growth',
                'status' => 'active',
                'trial_ends_at' => now()->addDays(30),
                'settings' => [],
            ],
        );

        // Bind tenant context so BelongsToTenant trait passes its `creating` hook.
        $ctx = app(TenantContext::class);
        $ctx->set($tenant);

        try {
            $this->seedTenantContent($tenant, $adminEmail, $name);
        } finally {
            $ctx->clear();
        }
    }

    private function seedTenantContent(Tenant $tenant, string $adminEmail, string $tenantName): void
    {
        // RBAC: 8 roles + permission grid for this tenant.
        (new RolesSeeder)->seedForTenant($tenant->id);
        // Message templates (WhatsApp / SMS / email per locale).
        (new MessageTemplatesSeeder)->seedForTenant($tenant->id);

        // Tenant admin user.
        $admin = User::query()->updateOrCreate(
            ['email' => $adminEmail],
            [
                'tenant_id' => $tenant->id,
                'name' => "{$tenantName} Admin",
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ],
        );

        // Set the team context so role assignment lands on this tenant.
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
        $admin->syncRoles([Rbac::ROLE_TENANT_OWNER]);

        // 4 staff users per tenant — one of each non-owner role.
        if (User::query()->where('tenant_id', $tenant->id)->count() < 5) {
            $staffRoles = [
                Rbac::ROLE_MANAGER,
                Rbac::ROLE_ACCOUNTANT,
                Rbac::ROLE_SUPPORT,
                Rbac::ROLE_COLLECTOR,
            ];
            foreach ($staffRoles as $role) {
                $user = User::factory()->forTenant($tenant)->create([
                    'name' => ucfirst($role).' Staff',
                ]);
                $user->syncRoles([$role]);
            }
        }

        // Service categories.
        foreach (['Internet', 'Electricity', 'Satellite'] as $idx => $catName) {
            ServiceCategory::query()->updateOrCreate(
                ['tenant_id' => $tenant->id, 'name' => $catName],
                [
                    'icon' => Str::lower($catName),
                    'color' => '#cc785c',
                    'is_active' => true,
                    'sort_order' => $idx,
                ],
            );
        }

        // 50 customers per tenant (idempotent: only seed if below threshold).
        $existing = Customer::withoutTenant()->where('tenant_id', $tenant->id)->count();
        if ($existing < 50) {
            $categoryIds = ServiceCategory::query()
                ->where('tenant_id', $tenant->id)
                ->pluck('id')
                ->all();

            Customer::factory()
                ->count(50 - $existing)
                ->state(fn () => [
                    'tenant_id' => $tenant->id,
                    'service_category_id' => fake()->randomElement($categoryIds),
                ])
                ->create();
        }

        // 5 internet packages per tenant.
        $internet = ServiceCategory::query()
            ->where('tenant_id', $tenant->id)
            ->where('name', 'Internet')
            ->first();

        $packageDefinitions = [
            ['Bronze 25Mbps', 'BRONZE-25', 15, 25, 10],
            ['Silver 50Mbps', 'SILVER-50', 25, 50, 25],
            ['Gold 100Mbps', 'GOLD-100', 40, 100, 50],
            ['Platinum 200Mbps', 'PLATINUM-200', 65, 200, 100],
            ['Family Unlimited', 'FAMILY-UL', 90, 500, 250],
        ];

        foreach ($packageDefinitions as $idx => [$name, $code, $price, $down, $up]) {
            Package::query()->updateOrCreate(
                ['tenant_id' => $tenant->id, 'code' => $code],
                [
                    'service_category_id' => $internet?->id,
                    'name' => $name,
                    'description' => "{$down}Mbps down / {$up}Mbps up — recurring monthly plan.",
                    'billing_type' => 'recurring',
                    'billing_period' => 'monthly',
                    'price' => $price,
                    'currency' => 'USD',
                    'speed_down_mbps' => $down,
                    'speed_up_mbps' => $up,
                    'radius_group_name' => Str::lower(str_replace(' ', '_', $name)),
                    'is_active' => true,
                    'sort_order' => $idx,
                ],
            );
        }

        // Subscribe each non-prospect customer to a random active package.
        $packageIds = Package::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->pluck('id')
            ->all();

        if (! empty($packageIds)) {
            Customer::withoutTenant()
                ->where('tenant_id', $tenant->id)
                ->whereIn('status', ['active', 'suspended', 'dormant'])
                ->whereDoesntHave('subscriptions')
                ->get()
                ->each(function (Customer $customer) use ($tenant, $packageIds) {
                    $start = $customer->service_started_at ?? now()->subMonths(3);
                    CustomerSubscription::query()->create([
                        'tenant_id' => $tenant->id,
                        'customer_id' => $customer->id,
                        'package_id' => fake()->randomElement($packageIds),
                        'status' => $customer->status === 'suspended' ? 'suspended' : 'active',
                        'started_at' => $start,
                        'current_period_start' => now()->startOfMonth(),
                        'current_period_end' => now()->startOfMonth()->addMonth(),
                        'auto_renew' => true,
                    ]);
                });
        }

        // Seed a NAS device per tenant + radius_users for every active subscription.
        \App\Models\NasDevice::query()->updateOrCreate(
            ['tenant_id' => $tenant->id, 'ip_address' => '10.0.0.1'],
            [
                'name' => 'Core NAS',
                'secret' => 'shared-secret-'.\Illuminate\Support\Str::random(8),
                'type' => 'mikrotik',
                'is_active' => true,
                'last_seen_at' => now(),
            ],
        );

        \App\Models\CustomerSubscription::query()
            ->where('tenant_id', $tenant->id)
            ->whereDoesntHave('customer.subscriptions', fn ($q) => $q->whereNotNull('id'))
            ->with('customer', 'package')
            ->get();

        foreach (\App\Models\CustomerSubscription::query()->where('tenant_id', $tenant->id)->with('package')->get() as $sub) {
            \App\Models\RadiusUser::query()->updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'username' => 'pppoe-'.$sub->customer_id,
                ],
                [
                    'customer_id' => $sub->customer_id,
                    'subscription_id' => $sub->id,
                    'password' => \Illuminate\Support\Str::random(12),
                    'radius_group' => $sub->package->radius_group_name ?? 'default',
                    'status' => $sub->status === 'suspended' ? 'suspended' : 'active',
                    'data_used_mb_current_period' => fake()->randomFloat(2, 0, 50_000),
                    'last_seen_at' => fake()->boolean(70) ? now()->subMinutes(rand(1, 240)) : null,
                ],
            );
        }

        // Three months of invoices (current + 2 prior) for every active sub.
        $generator = app(InvoiceGenerator::class);
        $activeSubs = CustomerSubscription::query()
            ->where('tenant_id', $tenant->id)
            ->where('status', 'active')
            ->with('package')
            ->get();

        // Pick a collector user to attribute the seeded payments to.
        $collector = User::query()
            ->where('tenant_id', $tenant->id)
            ->whereHas('roles', fn ($q) => $q->where('name', 'collector'))
            ->first();

        foreach ($activeSubs as $sub) {
            for ($monthsAgo = 2; $monthsAgo >= 0; $monthsAgo--) {
                $period = now()->subMonths($monthsAgo);
                $invoice = $generator->generateForSubscription(
                    $sub,
                    $period->copy()->startOfMonth(),
                    $period->copy()->endOfMonth(),
                    $period->copy()->startOfMonth(),
                );
                // Mark older invoices as paid; current month stays open. Some
                // mid-month go partial to make the dashboard interesting.
                if ($monthsAgo >= 2) {
                    $this->seedFullPayment($invoice, $tenant->id, $collector?->id);
                } elseif ($monthsAgo === 1) {
                    if (fake()->boolean(70)) {
                        $this->seedFullPayment($invoice, $tenant->id, $collector?->id);
                    } elseif (fake()->boolean(50)) {
                        $this->seedPartialPayment($invoice, $tenant->id, $collector?->id);
                    } elseif (fake()->boolean(40) && now()->isAfter($invoice->due_at)) {
                        $invoice->update(['status' => 'overdue']);
                    }
                }
            }
        }

        // Recompute customer balances from the source of truth.
        Customer::withoutTenant()
            ->where('tenant_id', $tenant->id)
            ->each(function (Customer $c) {
                $bal = (float) Invoice::query()
                    ->where('customer_id', $c->id)
                    ->whereIn('status', ['open', 'partial', 'overdue'])
                    ->sum('balance_due');
                $c->update(['balance_due' => round($bal, 2)]);
            });

        // Seed today's collector assignments — every open/overdue invoice
        // gets handed to the seeded collector with a route order.
        if ($collector) {
            $manager = User::query()
                ->where('tenant_id', $tenant->id)
                ->whereHas('roles', fn ($q) => $q->where('name', 'manager'))
                ->first();

            $openInvoices = Invoice::query()
                ->where('tenant_id', $tenant->id)
                ->whereIn('status', ['open', 'partial', 'overdue'])
                ->orderByDesc('balance_due')
                ->limit(15)
                ->get();

            foreach ($openInvoices as $idx => $inv) {
                \App\Models\CollectorAssignment::query()->create([
                    'tenant_id' => $tenant->id,
                    'collector_user_id' => $collector->id,
                    'invoice_id' => $inv->id,
                    'assigned_by' => $manager?->id,
                    'assigned_at' => now()->startOfDay(),
                    'status' => $idx < 4 ? 'completed' : ($idx < 6 ? 'in_progress' : 'pending'),
                    'completed_at' => $idx < 4 ? now()->subHours(rand(1, 6)) : null,
                    'priority' => fake()->numberBetween(1, 5),
                    'route_order' => $idx,
                ]);
            }

            // Seed today's collector route + a pending cash handover.
            $route = \App\Models\CollectorRoute::query()->updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'collector_user_id' => $collector->id,
                    'date' => now()->toDateString(),
                ],
                [
                    'started_at' => now()->copy()->setTime(8, 30),
                    'start_latitude' => 33.8938,
                    'start_longitude' => 35.5018,
                    'total_collected' => 0,
                ],
            );

            $todayCollected = (float) \App\Models\Payment::query()
                ->where('collected_by_user_id', $collector->id)
                ->where('status', 'completed')
                ->sum('amount');

            \App\Models\CashHandover::query()->create([
                'tenant_id' => $tenant->id,
                'from_user_id' => $collector->id,
                'to_user_id' => null,
                'amount' => max(150, round($todayCollected / 4, 2)),
                'currency' => 'USD',
                'status' => 'pending',
                'notes' => 'End-of-day cash from yesterday\'s collections.',
                'collector_route_id' => $route->id,
                'handed_over_at' => now()->subHours(2),
            ]);

            // A second one already confirmed, for the history view.
            \App\Models\CashHandover::query()->create([
                'tenant_id' => $tenant->id,
                'from_user_id' => $collector->id,
                'to_user_id' => $manager?->id,
                'amount' => max(120, round($todayCollected / 5, 2)),
                'currency' => 'USD',
                'status' => 'confirmed',
                'notes' => 'Yesterday\'s envelope.',
                'collector_route_id' => $route->id,
                'handed_over_at' => now()->subDays(1)->setTime(18, 0),
                'confirmed_at' => now()->subDays(1)->setTime(18, 30),
            ]);
        }
    }

    private function seedFullPayment(\App\Models\Invoice $invoice, string $tenantId, ?int $collectorId): void
    {
        $payment = \App\Models\Payment::query()->create([
            'tenant_id' => $tenantId,
            'customer_id' => $invoice->customer_id,
            'invoice_id' => $invoice->id,
            'amount' => $invoice->total,
            'currency' => $invoice->currency,
            'method' => fake()->randomElement(['cash', 'cash', 'cash', 'whish', 'card']),
            'status' => 'completed',
            'collected_by_user_id' => $collectorId,
            'collected_at' => $invoice->due_at,
            'is_synced' => true,
        ]);
        $invoice->update([
            'status' => 'paid',
            'paid_amount' => $invoice->total,
            'paid_at' => $payment->collected_at,
        ]);
    }

    private function seedPartialPayment(\App\Models\Invoice $invoice, string $tenantId, ?int $collectorId): void
    {
        $half = round((float) $invoice->total / 2, 2);
        \App\Models\Payment::query()->create([
            'tenant_id' => $tenantId,
            'customer_id' => $invoice->customer_id,
            'invoice_id' => $invoice->id,
            'amount' => $half,
            'currency' => $invoice->currency,
            'method' => 'cash',
            'status' => 'completed',
            'collected_by_user_id' => $collectorId,
            'collected_at' => $invoice->due_at,
            'is_synced' => true,
        ]);
        $invoice->update([
            'status' => 'partial',
            'paid_amount' => $half,
        ]);
    }
}
