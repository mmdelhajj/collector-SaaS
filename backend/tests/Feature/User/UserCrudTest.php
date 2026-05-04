<?php

declare(strict_types=1);

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

    $this->owner = User::factory()->forTenant($this->tenant)->create();
    $this->owner->assignRole(Rbac::ROLE_TENANT_OWNER);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('lists tenant users with their roles', function () {
    $extra = User::factory()->forTenant($this->tenant)->count(2)->create();
    foreach ($extra as $u) {
        $u->assignRole(Rbac::ROLE_MANAGER);
    }

    $this->actingAs($this->owner, 'sanctum')
        ->getJson('/api/v1/users')
        ->assertOk()
        ->assertJsonCount(3, 'data')  // owner + 2 managers
        ->assertJsonStructure(['data' => [['id', 'email', 'roles']]]);
});

it('invites a user with a generated password and assigned role', function () {
    $resp = $this->actingAs($this->owner, 'sanctum')
        ->postJson('/api/v1/users', [
            'name' => 'Jane Manager',
            'email' => 'jane@example.test',
            'role' => 'manager',
        ])
        ->assertCreated();

    expect($resp->json('data.email'))->toBe('jane@example.test');
    expect($resp->json('data.roles'))->toBe(['manager']);
    expect($resp->json('invite.temporary_password'))->toBeString()->not->toBeEmpty();
    expect(User::where('email', 'jane@example.test')->first())->not->toBeNull();
});

it('rejects invalid role on invite', function () {
    $this->actingAs($this->owner, 'sanctum')
        ->postJson('/api/v1/users', [
            'name' => 'X', 'email' => 'x@y.test', 'role' => 'godmode',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['role']);
});

it('updates a user\'s role', function () {
    $u = User::factory()->forTenant($this->tenant)->create();
    $u->assignRole(Rbac::ROLE_SUPPORT);

    $this->actingAs($this->owner, 'sanctum')
        ->patchJson("/api/v1/users/{$u->id}", ['role' => 'manager'])
        ->assertOk()
        ->assertJsonPath('data.roles', ['manager']);
});

it('deactivates a user (sets is_active=false, revokes tokens)', function () {
    $u = User::factory()->forTenant($this->tenant)->create();
    $u->assignRole(Rbac::ROLE_SUPPORT);
    $u->createToken('phone');

    $this->actingAs($this->owner, 'sanctum')
        ->deleteJson("/api/v1/users/{$u->id}")
        ->assertOk()
        ->assertJsonPath('data.is_active', false);

    expect($u->fresh()->tokens()->count())->toBe(0);
});

it('refuses to deactivate yourself', function () {
    $this->actingAs($this->owner, 'sanctum')
        ->deleteJson("/api/v1/users/{$this->owner->id}")
        ->assertStatus(409);
});
