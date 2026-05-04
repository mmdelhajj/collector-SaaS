<?php

declare(strict_types=1);

use App\Models\CollectorAssignment;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\ServiceCategory;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac;
use App\Support\TenantContext;
use Database\Seeders\RolesSeeder;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->tenant = Tenant::factory()->create();
    (new RolesSeeder)->seedForTenant($this->tenant->id);
    app(TenantContext::class)->set($this->tenant);
    app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);

    $this->admin = User::factory()->forTenant($this->tenant)->create();
    $this->admin->assignRole(Rbac::ROLE_TENANT_OWNER);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('GET /reports/dashboard returns the rolled-up KPIs', function () {
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'total' => 100,
        'paid_amount' => 0,
        'status' => 'open',
        'due_at' => now()->addDays(5),
    ]);
    Payment::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'amount' => 25,
        'status' => 'completed',
        'collected_at' => now(),
    ]);

    $resp = $this->actingAs($this->admin, 'sanctum')
        ->getJson('/api/v1/reports/dashboard')
        ->assertOk();

    expect((float) $resp->json('collected_today'))->toBeGreaterThanOrEqual(25.0);
    expect((float) $resp->json('total_outstanding'))->toBe(100.0);
    expect($resp->json())->toHaveKeys([
        'collected_today', 'collected_this_month', 'collected_last_month',
        'total_outstanding', 'overdue_outstanding',
    ]);
});

it('GET /reports/aging splits balances into the right buckets', function () {
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);

    // Current
    Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'total' => 50, 'paid_amount' => 0, 'status' => 'open',
        'due_at' => now()->addDays(5),
    ]);
    // 1-30 bucket
    Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'total' => 80, 'paid_amount' => 0, 'status' => 'overdue',
        'due_at' => now()->subDays(20),
    ]);
    // 90+ bucket
    Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'total' => 200, 'paid_amount' => 0, 'status' => 'overdue',
        'due_at' => now()->subDays(120),
    ]);

    $resp = $this->actingAs($this->admin, 'sanctum')
        ->getJson('/api/v1/reports/aging')
        ->assertOk();

    expect((float) $resp->json('buckets.current'))->toBe(50.0);
    expect((float) $resp->json('buckets.1_30'))->toBe(80.0);
    expect((float) $resp->json('buckets.90_plus'))->toBe(200.0);
    expect((float) $resp->json('total'))->toBe(330.0);
    expect($resp->json('invoice_count'))->toBe(3);
});

it('GET /reports/collector-performance returns one row per collector with totals', function () {
    $collector = User::factory()->forTenant($this->tenant)->create(['name' => 'Ahmad K']);
    $collector->assignRole(Rbac::ROLE_COLLECTOR);

    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    Payment::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'collected_by_user_id' => $collector->id,
        'amount' => 200,
        'status' => 'completed',
        'collected_at' => now()->subDays(5),
    ]);
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
    ]);
    CollectorAssignment::factory()->completed()->create([
        'tenant_id' => $this->tenant->id,
        'collector_user_id' => $collector->id,
        'invoice_id' => $invoice->id,
        'assigned_at' => now()->subDays(2),
    ]);

    $resp = $this->actingAs($this->admin, 'sanctum')
        ->getJson('/api/v1/reports/collector-performance')
        ->assertOk();

    $row = collect($resp->json('data'))->firstWhere('name', 'Ahmad K');
    expect($row)->not->toBeNull();
    expect((float) $row['collected'])->toBe(200.0);
    expect($row['assignments_total'])->toBe(1);
    expect($row['assignments_completed'])->toBe(1);
});

it('GET /reports/revenue groups invoice totals by service category', function () {
    $internet = ServiceCategory::factory()->create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Internet',
    ]);
    $package = Package::factory()->create([
        'tenant_id' => $this->tenant->id,
        'service_category_id' => $internet->id,
        'price' => 50,
    ]);
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);

    // Create invoice + item directly (bypass HTTP) so the test stays focused
    // on the report query rather than the create-invoice plumbing.
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'subtotal' => 50, 'total' => 50, 'paid_amount' => 0, 'status' => 'open',
        'issued_at' => now(), // Match the report's default `since` window.
    ]);
    \App\Models\InvoiceItem::query()->create([
        'invoice_id' => $invoice->id,
        'package_id' => $package->id,
        'description' => 'Monthly internet',
        'quantity' => 1,
        'unit_price' => 50,
        'tax_rate' => 0,
        'total' => 50,
    ]);

    $resp = $this->actingAs($this->admin, 'sanctum')
        ->getJson('/api/v1/reports/revenue')
        ->assertOk();

    $internetRow = collect($resp->json('data'))->firstWhere('category_name', 'Internet');
    expect($internetRow)->not->toBeNull();
    expect((float) $internetRow['billed'])->toBe(50.0);
});

it('GET /reports/export?type=aging streams a CSV with the right header', function () {
    $resp = $this->actingAs($this->admin, 'sanctum')
        ->get('/api/v1/reports/export?type=aging');

    $resp->assertOk();
    $resp->assertHeader('Content-Type', 'text/csv; charset=utf-8');
    expect($resp->streamedContent())->toStartWith('"Customer code"');
});

it('users without reports.export cannot download CSVs', function () {
    $support = User::factory()->forTenant($this->tenant)->create();
    $support->assignRole(Rbac::ROLE_SUPPORT);

    $this->actingAs($support, 'sanctum')
        ->get('/api/v1/reports/export?type=aging')
        ->assertForbidden();
});
