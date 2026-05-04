<?php

declare(strict_types=1);

use App\Models\CashHandover;
use App\Models\CollectorRoute;
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

    $this->manager = User::factory()->forTenant($this->tenant)->create();
    $this->manager->assignRole(Rbac::ROLE_MANAGER);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('check-in creates today\'s route and is idempotent', function () {
    $first = $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/collector/check-in', [
            'latitude' => 33.8938,
            'longitude' => 35.5018,
        ])
        ->assertSuccessful()  // 201 on first create, 200 on subsequent firstOrCreate
        ->json('data.id');

    $second = $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/collector/check-in')
        ->assertSuccessful()
        ->json('data.id');

    expect($first)->toBe($second);
    expect(CollectorRoute::query()
        ->where('collector_user_id', $this->collector->id)
        ->where('date', now()->toDateString())
        ->count())->toBe(1);
});

it('check-out closes the route and stamps ended_at', function () {
    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/collector/check-in')
        ->assertSuccessful();

    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/collector/check-out', [
            'latitude' => 33.9, 'longitude' => 35.6,
        ])
        ->assertOk()
        ->assertJsonPath('data.ended_at', fn ($v) => $v !== null);
});

it('collector hands over cash; supervisor confirms', function () {
    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/collector/check-in')->assertSuccessful();

    $resp = $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/collector/handover-cash', [
            'amount' => 250,
            'currency' => 'USD',
            'notes' => '15 envelopes counted twice.',
        ])
        ->assertCreated();

    $handoverId = $resp->json('data.id');
    expect($resp->json('data.status'))->toBe('pending');

    $this->actingAs($this->manager, 'sanctum')
        ->postJson("/api/v1/cash-handovers/{$handoverId}/confirm")
        ->assertOk()
        ->assertJsonPath('data.status', 'confirmed');

    $h = CashHandover::query()->find($handoverId);
    expect($h->confirmed_at)->not->toBeNull();
    expect($h->to_user_id)->toBe($this->manager->id);
});

it('confirming a non-pending handover returns 409', function () {
    $h = CashHandover::factory()->confirmed()->create([
        'tenant_id' => $this->tenant->id,
        'from_user_id' => $this->collector->id,
    ]);

    $this->actingAs($this->manager, 'sanctum')
        ->postJson("/api/v1/cash-handovers/{$h->id}/confirm")
        ->assertStatus(409);
});

it('supervisor disputes a handover with a reason', function () {
    $h = CashHandover::factory()->create([
        'tenant_id' => $this->tenant->id,
        'from_user_id' => $this->collector->id,
        'amount' => 200,
    ]);

    $this->actingAs($this->manager, 'sanctum')
        ->postJson("/api/v1/cash-handovers/{$h->id}/dispute", [
            'reason' => 'Counted only $190 in the envelope.',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'disputed')
        ->assertJsonPath('data.dispute_reason', 'Counted only $190 in the envelope.');
});

it('non-manager cannot confirm a handover (403)', function () {
    $h = CashHandover::factory()->create([
        'tenant_id' => $this->tenant->id,
        'from_user_id' => $this->collector->id,
    ]);

    $other = User::factory()->forTenant($this->tenant)->create();
    $other->assignRole(Rbac::ROLE_COLLECTOR);

    $this->actingAs($other, 'sanctum')
        ->postJson("/api/v1/cash-handovers/{$h->id}/confirm")
        ->assertForbidden();
});

it('handover requires a positive amount', function () {
    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/collector/handover-cash', ['amount' => 0])
        ->assertStatus(422);
});

it('cross-tenant: cannot confirm a handover from another tenant', function () {
    $tenantB = Tenant::factory()->create();
    (new RolesSeeder)->seedForTenant($tenantB->id);
    app(TenantContext::class)->set($tenantB);
    $userB = User::factory()->forTenant($tenantB)->create();
    $hB = CashHandover::factory()->create([
        'tenant_id' => $tenantB->id,
        'from_user_id' => $userB->id,
    ]);

    app(TenantContext::class)->set($this->tenant);

    $this->actingAs($this->manager, 'sanctum')
        ->postJson("/api/v1/cash-handovers/{$hB->id}/confirm")
        ->assertNotFound();
});
