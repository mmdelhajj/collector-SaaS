<?php

declare(strict_types=1);

use App\Models\Customer;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac;
use App\Support\TenantContext;
use Database\Seeders\RolesSeeder;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->tenantA = Tenant::factory()->create();
    $this->tenantB = Tenant::factory()->create();
    (new RolesSeeder)->seedForTenant($this->tenantA->id);
    (new RolesSeeder)->seedForTenant($this->tenantB->id);

    $this->userA = User::factory()->forTenant($this->tenantA)->create();
    app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenantA->id);
    $this->userA->assignRole(Rbac::ROLE_TENANT_OWNER);

    $this->userB = User::factory()->forTenant($this->tenantB)->create();
    app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenantB->id);
    $this->userB->assignRole(Rbac::ROLE_TENANT_OWNER);

    app(TenantContext::class)->set($this->tenantA);
    $custA = Customer::factory()->create(['tenant_id' => $this->tenantA->id]);
    $this->payA = Payment::factory()->create([
        'tenant_id' => $this->tenantA->id,
        'customer_id' => $custA->id,
    ]);

    app(TenantContext::class)->set($this->tenantB);
    $custB = Customer::factory()->create(['tenant_id' => $this->tenantB->id]);
    $this->payB = Payment::factory()->create([
        'tenant_id' => $this->tenantB->id,
        'customer_id' => $custB->id,
    ]);

    app(TenantContext::class)->clear();
});

it('lists only the requesting tenant\'s payments', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->getJson('/api/v1/payments')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $this->payA->id);
});

it('returns 404 when reading a foreign tenant\'s payment', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->getJson("/api/v1/payments/{$this->payB->id}")
        ->assertNotFound();
});

it('returns 404 when refunding a foreign tenant\'s payment', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->postJson("/api/v1/payments/{$this->payB->id}/refund")
        ->assertNotFound();
});
