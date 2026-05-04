<?php

declare(strict_types=1);

use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac;
use App\Support\TenantContext;
use Database\Seeders\RolesSeeder;
use Spatie\Permission\PermissionRegistrar;

/*
 * RBAC enforcement: roles control what a user can do.
 * - users.manage gates POST /users (only tenant_owner / tenant_admin can invite)
 * - reading /users is allowed for any authenticated tenant user (read != manage)
 */

beforeEach(function () {
    $this->tenant = Tenant::factory()->create();
    (new RolesSeeder)->seedForTenant($this->tenant->id);

    app(TenantContext::class)->set($this->tenant);
    app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('tenant_owner can invite users', function () {
    $owner = User::factory()->forTenant($this->tenant)->create();
    $owner->assignRole(Rbac::ROLE_TENANT_OWNER);

    $this->actingAs($owner, 'sanctum')
        ->postJson('/api/v1/users', [
            'name' => 'A', 'email' => 'a@x.test', 'role' => 'manager',
        ])
        ->assertCreated();
});

it('tenant_admin can invite users', function () {
    $admin = User::factory()->forTenant($this->tenant)->create();
    $admin->assignRole(Rbac::ROLE_TENANT_ADMIN);

    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/users', [
            'name' => 'B', 'email' => 'b@x.test', 'role' => 'manager',
        ])
        ->assertCreated();
});

it('manager CANNOT invite users (lacks users.manage)', function () {
    $mgr = User::factory()->forTenant($this->tenant)->create();
    $mgr->assignRole(Rbac::ROLE_MANAGER);

    $this->actingAs($mgr, 'sanctum')
        ->postJson('/api/v1/users', [
            'name' => 'C', 'email' => 'c@x.test', 'role' => 'support',
        ])
        ->assertForbidden();
});

it('collector CANNOT invite users', function () {
    $col = User::factory()->forTenant($this->tenant)->create();
    $col->assignRole(Rbac::ROLE_COLLECTOR);

    $this->actingAs($col, 'sanctum')
        ->postJson('/api/v1/users', [
            'name' => 'D', 'email' => 'd@x.test', 'role' => 'support',
        ])
        ->assertForbidden();
});

it('any authenticated tenant user can read /users (no permission gate on read)', function () {
    $support = User::factory()->forTenant($this->tenant)->create();
    $support->assignRole(Rbac::ROLE_SUPPORT);

    $this->actingAs($support, 'sanctum')
        ->getJson('/api/v1/users')
        ->assertOk();
});

it('seeded role grids match the spec', function () {
    $owner = User::factory()->forTenant($this->tenant)->create();
    $owner->assignRole(Rbac::ROLE_TENANT_OWNER);
    expect($owner->can('users.manage'))->toBeTrue();
    expect($owner->can('billing.manage'))->toBeTrue();
    expect($owner->can('customers.delete'))->toBeTrue();

    $accountant = User::factory()->forTenant($this->tenant)->create();
    $accountant->assignRole(Rbac::ROLE_ACCOUNTANT);
    expect($accountant->can('payments.refund'))->toBeTrue();
    expect($accountant->can('users.manage'))->toBeFalse();
    expect($accountant->can('customers.delete'))->toBeFalse();

    $collector = User::factory()->forTenant($this->tenant)->create();
    $collector->assignRole(Rbac::ROLE_COLLECTOR);
    expect($collector->can('payments.record'))->toBeTrue();
    expect($collector->can('payments.refund'))->toBeFalse();
    expect($collector->can('customers.create'))->toBeFalse();
});
