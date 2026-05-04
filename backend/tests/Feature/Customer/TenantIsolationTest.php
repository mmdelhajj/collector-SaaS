<?php

declare(strict_types=1);

use App\Models\Customer;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac;
use App\Support\TenantContext;

/*
 * Bedrock guarantee: no code path should ever expose a tenant's data
 * to a user from another tenant. These tests pin that invariant by
 * trying every CRUD verb against a foreign-tenant resource and asserting
 * the request fails — and also by counting rows in /index to be sure
 * the global scope is doing its job.
 */

beforeEach(function () {
    $this->tenantA = Tenant::factory()->create(['name' => 'Tenant A']);
    $this->tenantB = Tenant::factory()->create(['name' => 'Tenant B']);
    $this->userA = User::factory()->forTenant($this->tenantA)
        ->withRole(Rbac::ROLE_TENANT_OWNER)->create();
    $this->userB = User::factory()->forTenant($this->tenantB)
        ->withRole(Rbac::ROLE_TENANT_OWNER)->create();

    app(TenantContext::class)->set($this->tenantA);
    $this->customerA = Customer::factory()->create(['tenant_id' => $this->tenantA->id]);

    app(TenantContext::class)->set($this->tenantB);
    $this->customerB = Customer::factory()->create(['tenant_id' => $this->tenantB->id]);

    app(TenantContext::class)->clear();
});

it('lists only the requesting tenant\'s customers', function () {
    $resA = $this->actingAs($this->userA, 'sanctum')->getJson('/api/v1/customers')
        ->assertOk();
    expect($resA->json('data.0.id'))->toBe($this->customerA->id);
    expect($resA->json('meta.total'))->toBe(1);

    $resB = $this->actingAs($this->userB, 'sanctum')->getJson('/api/v1/customers')
        ->assertOk();
    expect($resB->json('data.0.id'))->toBe($this->customerB->id);
    expect($resB->json('meta.total'))->toBe(1);
});

it('returns 404 when tenant A reads tenant B\'s customer by id', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->getJson("/api/v1/customers/{$this->customerB->id}")
        ->assertNotFound();
});

it('returns 404 when tenant A updates tenant B\'s customer', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->patchJson("/api/v1/customers/{$this->customerB->id}", ['city' => 'Hijack'])
        ->assertNotFound();

    expect($this->customerB->fresh()->city)->not->toBe('Hijack');
});

it('returns 404 when tenant A deletes tenant B\'s customer', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->deleteJson("/api/v1/customers/{$this->customerB->id}")
        ->assertNotFound();

    expect(Customer::withoutTenant()->find($this->customerB->id))->not->toBeNull();
});

it('cannot reach tenant routes without an authenticated user', function () {
    $this->getJson('/api/v1/customers')->assertUnauthorized();
});

it('falsifies global scope when no context is set (defence in depth)', function () {
    // Even if some controller accidentally bypasses middleware, the BelongsToTenant
    // global scope must return zero rows when no tenant is active.
    Customer::factory()->count(3)->create(['tenant_id' => $this->tenantA->id]);

    app(TenantContext::class)->clear();

    expect(Customer::query()->count())->toBe(0);
    expect(Customer::withoutTenant()->count())->toBeGreaterThan(0);
});
