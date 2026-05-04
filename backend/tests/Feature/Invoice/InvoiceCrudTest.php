<?php

declare(strict_types=1);

use App\Models\Customer;
use App\Models\CustomerSubscription;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;

beforeEach(function () {
    $this->tenant = Tenant::factory()->create();
    $this->user = User::factory()->forTenant($this->tenant)->create();
    app(TenantContext::class)->set($this->tenant);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('lists invoices with customer relation eager-loaded', function () {
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    Invoice::factory()->count(3)->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
    ]);

    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/invoices')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'number', 'total', 'status', 'customer' => ['code', 'full_name']]],
        ]);
});

it('auto-generates per-tenant invoice numbers like INV-YYYY-00001', function () {
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    $package = Package::factory()->create(['tenant_id' => $this->tenant->id]);

    $resp = $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/invoices', [
            'customer_id' => $customer->id,
            'due_at' => now()->addDays(15)->toIso8601String(),
            'items' => [
                ['description' => 'Monthly internet', 'unit_price' => 50, 'package_id' => $package->id],
            ],
        ])
        ->assertCreated();

    $year = now()->format('Y');
    expect($resp->json('data.number'))->toBe("INV-{$year}-00001");
    expect((float) $resp->json('data.total'))->toBe(50.0);
    expect((float) $resp->json('data.balance_due'))->toBe(50.0);
});

it('computes subtotal, tax, total from items', function () {
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);

    $resp = $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/invoices', [
            'customer_id' => $customer->id,
            'due_at' => now()->addDays(15)->toIso8601String(),
            'items' => [
                ['description' => 'Item A', 'quantity' => 2, 'unit_price' => 25],
                ['description' => 'Item B', 'quantity' => 1, 'unit_price' => 10, 'tax_rate' => 11],
            ],
        ])
        ->assertCreated();

    expect((float) $resp->json('data.subtotal'))->toBe(60.0);  // 50 + 10
    expect((float) $resp->json('data.tax_amount'))->toBe(1.1); // 10 × 11%
    expect((float) $resp->json('data.total'))->toBe(61.1);
});

it('refuses to delete an invoice that has received payment', function () {
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    $invoice = Invoice::factory()->paid()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'total' => 25,
    ]);

    $this->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/invoices/{$invoice->id}")
        ->assertStatus(409);
});

it('can search by invoice number or customer name', function () {
    $alice = Customer::factory()->create([
        'tenant_id' => $this->tenant->id,
        'first_name' => 'Alice', 'last_name' => 'Mendoza',
    ]);
    $bob = Customer::factory()->create([
        'tenant_id' => $this->tenant->id,
        'first_name' => 'Bob', 'last_name' => 'Carter',
    ]);
    Invoice::factory()->create(['tenant_id' => $this->tenant->id, 'customer_id' => $alice->id]);
    Invoice::factory()->create(['tenant_id' => $this->tenant->id, 'customer_id' => $bob->id]);

    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/invoices?search=mendoza')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.customer.full_name', 'Alice Mendoza');
});

it('runs bulk billing for active subscriptions exactly once per period', function () {
    $package = Package::factory()->create(['tenant_id' => $this->tenant->id, 'price' => 30]);
    $c1 = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    $c2 = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    CustomerSubscription::query()->create([
        'tenant_id' => $this->tenant->id, 'customer_id' => $c1->id,
        'package_id' => $package->id, 'status' => 'active',
    ]);
    CustomerSubscription::query()->create([
        'tenant_id' => $this->tenant->id, 'customer_id' => $c2->id,
        'package_id' => $package->id, 'status' => 'active',
    ]);

    $first = $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/invoices/generate-bulk')
        ->assertOk()
        ->json();
    expect($first['generated'])->toBe(2);
    expect((float) $first['total_amount'])->toBe(60.0);

    // Idempotent: re-running on the same period generates nothing new.
    $second = $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/invoices/generate-bulk')
        ->assertOk()
        ->json();
    expect($second['generated'])->toBe(0);
    expect($second['skipped'])->toBe(2);
});
