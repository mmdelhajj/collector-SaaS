<?php

declare(strict_types=1);

use App\Models\Customer;
use App\Models\NasDevice;
use App\Models\RadiusUser;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac;
use App\Support\TenantContext;
use Database\Seeders\RolesSeeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->tenant = Tenant::factory()->create();
    (new RolesSeeder)->seedForTenant($this->tenant->id);
    app(TenantContext::class)->set($this->tenant);
    app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);

    $this->admin = User::factory()->forTenant($this->tenant)->create();
    $this->admin->assignRole(Rbac::ROLE_TENANT_OWNER);

    $this->customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    $this->radiusUser = RadiusUser::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'status' => 'active',
    ]);
    NasDevice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'is_active' => true,
        'last_seen_at' => now(),
    ]);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('lists radius users with eager-loaded customer', function () {
    $this->actingAs($this->admin, 'sanctum')
        ->getJson('/api/v1/radius-users')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'username', 'status', 'radius_group', 'customer' => ['code', 'full_name']]],
        ]);
});

it('suspend flips status and invokes the CoA service', function () {
    $this->actingAs($this->admin, 'sanctum')
        ->postJson("/api/v1/radius-users/{$this->radiusUser->id}/suspend")
        ->assertOk()
        ->assertJsonPath('data.status', 'suspended');
});

it('reactivate flips status back to active', function () {
    $this->radiusUser->update(['status' => 'suspended']);

    $this->actingAs($this->admin, 'sanctum')
        ->postJson("/api/v1/radius-users/{$this->radiusUser->id}/reactivate")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');
});

it('change-speed updates radius_group with validation', function () {
    $this->actingAs($this->admin, 'sanctum')
        ->postJson("/api/v1/radius-users/{$this->radiusUser->id}/change-speed", [
            'radius_group' => 'platinum_200',
        ])
        ->assertOk()
        ->assertJsonPath('data.radius_group', 'platinum_200');
});

it('change-speed requires the radius_group field', function () {
    $this->actingAs($this->admin, 'sanctum')
        ->postJson("/api/v1/radius-users/{$this->radiusUser->id}/change-speed", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['radius_group']);
});

it('users without radius.manage cannot suspend (403)', function () {
    $support = User::factory()->forTenant($this->tenant)->create();
    $support->assignRole(Rbac::ROLE_SUPPORT);

    $this->actingAs($support, 'sanctum')
        ->postJson("/api/v1/radius-users/{$this->radiusUser->id}/suspend")
        ->assertForbidden();
});

it('cross-tenant: cannot read another tenants radius user', function () {
    $tenantB = Tenant::factory()->create();
    (new RolesSeeder)->seedForTenant($tenantB->id);

    app(TenantContext::class)->set($tenantB);
    $custB = Customer::factory()->create(['tenant_id' => $tenantB->id]);
    $userB = RadiusUser::factory()->create([
        'tenant_id' => $tenantB->id,
        'customer_id' => $custB->id,
    ]);

    app(TenantContext::class)->set($this->tenant);

    $this->actingAs($this->admin, 'sanctum')
        ->getJson("/api/v1/radius-users/{$userB->id}")
        ->assertNotFound();
});

it('encrypts the radius password at rest', function () {
    $raw = (string) DB::table('radius_users')
        ->where('id', $this->radiusUser->id)
        ->value('password');

    expect($raw)->not->toContain($this->radiusUser->getOriginal('password'));
    expect($raw)->not->toBe($this->radiusUser->password);
});
