<?php

declare(strict_types=1);

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\NasDevice;
use App\Models\RadiusUser;
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

    $this->collector = User::factory()->forTenant($this->tenant)->create();
    $this->collector->assignRole(Rbac::ROLE_COLLECTOR);

    $this->customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);

    NasDevice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'is_active' => true,
        'last_seen_at' => now(),
    ]);

    $this->radiusUser = RadiusUser::factory()->suspended()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
    ]);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('reactivates the RADIUS user when a payment clears the entire balance', function () {
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'total' => 50,
        'status' => 'open',
        'paid_amount' => 0,
    ]);

    expect($this->radiusUser->fresh()->status)->toBe('suspended');

    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'amount' => 50,
            'method' => 'cash',
        ])
        ->assertCreated();

    expect($this->radiusUser->fresh()->status)->toBe('active');
});

it('does NOT reactivate while the customer still owes on another invoice', function () {
    Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'total' => 50,
        'status' => 'open',
        'paid_amount' => 0,
    ]);
    $second = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'total' => 80,
        'status' => 'overdue',
        'paid_amount' => 0,
    ]);

    // Pay the first invoice fully but leave the second one open.
    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'invoice_id' => $second->id,
            'amount' => 30, // partial — second stays partial, first stays open
            'method' => 'cash',
        ])
        ->assertCreated();

    expect($this->radiusUser->fresh()->status)->toBe('suspended');
});

it('partial payment that does not zero the balance keeps RADIUS suspended', function () {
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'total' => 100,
        'status' => 'open',
        'paid_amount' => 0,
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'amount' => 40,
            'method' => 'cash',
        ])
        ->assertCreated();

    expect($this->radiusUser->fresh()->status)->toBe('suspended');
});
