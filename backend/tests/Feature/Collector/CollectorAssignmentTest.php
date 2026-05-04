<?php

declare(strict_types=1);

use App\Models\CollectorAssignment;
use App\Models\Customer;
use App\Models\Invoice;
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

    $this->manager = User::factory()->forTenant($this->tenant)->create();
    $this->manager->assignRole(Rbac::ROLE_MANAGER);

    $this->collector = User::factory()->forTenant($this->tenant)->create(['name' => 'Ahmad K.']);
    $this->collector->assignRole(Rbac::ROLE_COLLECTOR);

    $this->customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('manager can bulk-assign invoices to a collector', function () {
    $invoices = Invoice::factory()->count(3)->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'status' => 'open',
    ]);

    $resp = $this->actingAs($this->manager, 'sanctum')
        ->postJson('/api/v1/collector-assignments/bulk-assign', [
            'collector_user_id' => $this->collector->id,
            'invoice_ids' => $invoices->pluck('id')->all(),
            'priority' => 2,
        ])
        ->assertCreated();

    expect($resp->json('assigned'))->toBe(3);
    expect($resp->json('skipped'))->toBe(0);
    expect(CollectorAssignment::query()->where('collector_user_id', $this->collector->id)->count())
        ->toBe(3);
});

it('reassigning marks the previous active assignment as reassigned', function () {
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
    ]);
    $other = User::factory()->forTenant($this->tenant)->create();
    $other->assignRole(Rbac::ROLE_COLLECTOR);

    // First assignment
    $this->actingAs($this->manager, 'sanctum')
        ->postJson('/api/v1/collector-assignments/bulk-assign', [
            'collector_user_id' => $this->collector->id,
            'invoice_ids' => [$invoice->id],
        ])->assertCreated();

    // Reassign to a different collector
    $this->actingAs($this->manager, 'sanctum')
        ->postJson('/api/v1/collector-assignments/bulk-assign', [
            'collector_user_id' => $other->id,
            'invoice_ids' => [$invoice->id],
        ])->assertCreated();

    expect(CollectorAssignment::query()->where('invoice_id', $invoice->id)->count())->toBe(2);
    expect(
        CollectorAssignment::query()
            ->where('invoice_id', $invoice->id)
            ->where('status', 'reassigned')->count()
    )->toBe(1);
    expect(
        CollectorAssignment::query()
            ->where('invoice_id', $invoice->id)
            ->where('status', 'pending')->count()
    )->toBe(1);
});

it('a non-manager (e.g. collector) cannot bulk-assign — 403', function () {
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/collector-assignments/bulk-assign', [
            'collector_user_id' => $this->collector->id,
            'invoice_ids' => [$invoice->id],
        ])
        ->assertForbidden();
});

it('collector can update their own assignment status', function () {
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
    ]);
    $assignment = CollectorAssignment::factory()->create([
        'tenant_id' => $this->tenant->id,
        'collector_user_id' => $this->collector->id,
        'invoice_id' => $invoice->id,
        'status' => 'pending',
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->patchJson("/api/v1/collector-assignments/{$assignment->id}", [
            'status' => 'in_progress',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'in_progress');
});

it('a collector cannot update a different collector\'s assignment', function () {
    $other = User::factory()->forTenant($this->tenant)->create();
    $other->assignRole(Rbac::ROLE_COLLECTOR);

    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
    ]);
    $assignment = CollectorAssignment::factory()->create([
        'tenant_id' => $this->tenant->id,
        'collector_user_id' => $other->id,
        'invoice_id' => $invoice->id,
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->patchJson("/api/v1/collector-assignments/{$assignment->id}", [
            'status' => 'completed',
        ])
        ->assertForbidden();
});

it('marking assignment completed sets completed_at', function () {
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
    ]);
    $assignment = CollectorAssignment::factory()->create([
        'tenant_id' => $this->tenant->id,
        'collector_user_id' => $this->collector->id,
        'invoice_id' => $invoice->id,
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->patchJson("/api/v1/collector-assignments/{$assignment->id}", [
            'status' => 'completed',
        ])
        ->assertOk();

    expect($assignment->fresh()->completed_at)->not->toBeNull();
});

it('GET /collector/my-assignments returns only my assignments for today', function () {
    $other = User::factory()->forTenant($this->tenant)->create();

    Invoice::factory()->count(3)->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
    ])->each(function ($inv) {
        CollectorAssignment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'collector_user_id' => $this->collector->id,
            'invoice_id' => $inv->id,
            'assigned_at' => now()->startOfDay(),
        ]);
    });

    Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
    ]);

    // Foreign collector's assignment — should not appear.
    $foreignInv = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
    ]);
    CollectorAssignment::factory()->create([
        'tenant_id' => $this->tenant->id,
        'collector_user_id' => $other->id,
        'invoice_id' => $foreignInv->id,
        'assigned_at' => now()->startOfDay(),
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->getJson('/api/v1/collector/my-assignments')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

it('GET /collector/my-stats returns today/week/month totals', function () {
    $resp = $this->actingAs($this->collector, 'sanctum')
        ->getJson('/api/v1/collector/my-stats')
        ->assertOk();

    expect($resp->json())->toHaveKeys(['today', 'this_week', 'this_month']);
    expect($resp->json('today'))->toHaveKeys(['collected', 'assignments']);
});

it('cross-tenant isolation: cannot read assignments from other tenants', function () {
    $tenantB = Tenant::factory()->create();
    (new RolesSeeder)->seedForTenant($tenantB->id);

    app(TenantContext::class)->set($tenantB);
    $custB = Customer::factory()->create(['tenant_id' => $tenantB->id]);
    $invB = Invoice::factory()->create(['tenant_id' => $tenantB->id, 'customer_id' => $custB->id]);
    $userB = User::factory()->forTenant($tenantB)->create();
    $assignmentB = CollectorAssignment::factory()->create([
        'tenant_id' => $tenantB->id,
        'collector_user_id' => $userB->id,
        'invoice_id' => $invB->id,
    ]);

    app(TenantContext::class)->set($this->tenant);

    $this->actingAs($this->manager, 'sanctum')
        ->getJson("/api/v1/collector-assignments/{$assignmentB->id}")
        ->assertNotFound();
});
