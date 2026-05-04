<?php

declare(strict_types=1);

use App\Models\Package;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;

beforeEach(function () {
    $this->tenantA = Tenant::factory()->create(['name' => 'Tenant A']);
    $this->tenantB = Tenant::factory()->create(['name' => 'Tenant B']);
    $this->userA = User::factory()->forTenant($this->tenantA)->create();
    $this->userB = User::factory()->forTenant($this->tenantB)->create();

    app(TenantContext::class)->set($this->tenantA);
    $this->packageA = Package::factory()->create(['tenant_id' => $this->tenantA->id]);

    app(TenantContext::class)->set($this->tenantB);
    $this->packageB = Package::factory()->create(['tenant_id' => $this->tenantB->id]);

    app(TenantContext::class)->clear();
});

it('lists only the requesting tenant\'s packages', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->getJson('/api/v1/packages')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $this->packageA->id);
});

it('returns 404 when reading a foreign tenant\'s package', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->getJson("/api/v1/packages/{$this->packageB->id}")
        ->assertNotFound();
});

it('returns 404 when updating a foreign tenant\'s package', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->patchJson("/api/v1/packages/{$this->packageB->id}", ['price' => 0])
        ->assertNotFound();

    expect((float) $this->packageB->fresh()->price)
        ->toBe((float) $this->packageB->price);
});

it('returns 404 when deleting a foreign tenant\'s package', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->deleteJson("/api/v1/packages/{$this->packageB->id}")
        ->assertNotFound();

    expect(Package::withoutTenant()->find($this->packageB->id))->not->toBeNull();
});
