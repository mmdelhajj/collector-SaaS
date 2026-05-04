<?php

declare(strict_types=1);

use App\Models\Customer;
use App\Models\NasDevice;
use App\Models\RadiusSession;
use App\Models\RadiusUser;
use App\Models\Tenant;
use App\Support\TenantContext;

beforeEach(function () {
    $this->tenant = Tenant::factory()->create();
    app(TenantContext::class)->set($this->tenant);

    config([
        'services.radius.api_secret' => 'test-secret',
        'services.radius.allowed_ips' => ['127.0.0.1', '::1'],
    ]);

    $this->customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    $this->user = RadiusUser::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'username' => 'pppoe-test',
        'password' => 'super-secret-pwd',
        'radius_group' => 'gold_100',
        'status' => 'active',
    ]);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('rejects requests without the X-Radius-Secret header', function () {
    $this->postJson('/api/radius/authorize', ['username' => 'pppoe-test'])
        ->assertStatus(403);
});

it('rejects requests with the wrong shared secret', function () {
    $this->withHeaders(['X-Radius-Secret' => 'wrong-secret'])
        ->postJson('/api/radius/authorize', ['username' => 'pppoe-test'])
        ->assertStatus(403);
});

it('authorizes an active user with Accept + reply attributes', function () {
    $resp = $this->withHeaders(['X-Radius-Secret' => 'test-secret'])
        ->postJson('/api/radius/authorize', [
            'username' => 'pppoe-test',
            'tenant_id' => $this->tenant->id,
            'password' => 'super-secret-pwd',
        ])
        ->assertOk();

    expect($resp->json('control.Auth-Type'))->toBe('Accept');
    expect($resp->json('reply.Mikrotik-Group'))->toBe('gold_100');
    expect($resp->json('reply.Mikrotik-Rate-Limit'))->toBe('100M/50M');
});

it('rejects suspended users with 401', function () {
    $this->user->update(['status' => 'suspended']);

    $this->withHeaders(['X-Radius-Secret' => 'test-secret'])
        ->postJson('/api/radius/authorize', [
            'username' => 'pppoe-test',
            'tenant_id' => $this->tenant->id,
        ])
        ->assertStatus(401)
        ->assertJsonPath('control.Auth-Type', 'Reject');
});

it('rejects unknown usernames', function () {
    $this->withHeaders(['X-Radius-Secret' => 'test-secret'])
        ->postJson('/api/radius/authorize', [
            'username' => 'never-existed',
            'tenant_id' => $this->tenant->id,
        ])
        ->assertStatus(401);
});

it('rejects on bad password (PAP path)', function () {
    $this->withHeaders(['X-Radius-Secret' => 'test-secret'])
        ->postJson('/api/radius/authorize', [
            'username' => 'pppoe-test',
            'tenant_id' => $this->tenant->id,
            'password' => 'wrong',
        ])
        ->assertStatus(401);
});

it('rejects authorize when no tenant_id and no NAS IP given', function () {
    $this->withHeaders(['X-Radius-Secret' => 'test-secret'])
        ->postJson('/api/radius/authorize', [
            'username' => 'pppoe-test',
            'password' => 'super-secret-pwd',
        ])
        ->assertStatus(401)
        ->assertJsonPath('message', 'tenant resolution failed');
});

it('rejects authorize when NAS IP is unknown', function () {
    $this->withHeaders(['X-Radius-Secret' => 'test-secret'])
        ->postJson('/api/radius/authorize', [
            'username' => 'pppoe-test',
            'password' => 'super-secret-pwd',
            'nas_ip' => '203.0.113.99',
        ])
        ->assertStatus(401);
});

it('resolves tenant from NAS IP and authorizes', function () {
    NasDevice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'ip_address' => '10.0.0.1',
        'is_active' => true,
    ]);

    $resp = $this->withHeaders(['X-Radius-Secret' => 'test-secret'])
        ->postJson('/api/radius/authorize', [
            'username' => 'pppoe-test',
            'password' => 'super-secret-pwd',
            'nas_ip' => '10.0.0.1',
        ])
        ->assertOk();

    expect($resp->json('control.Auth-Type'))->toBe('Accept');
});

it('does not cross tenants when same username exists in two tenants', function () {
    // Build a second tenant with a same-named user but different password
    $otherTenant = Tenant::factory()->create();
    $otherCustomer = Customer::factory()->create(['tenant_id' => $otherTenant->id]);
    RadiusUser::factory()->create([
        'tenant_id' => $otherTenant->id,
        'customer_id' => $otherCustomer->id,
        'username' => 'pppoe-test', // same username
        'password' => 'other-tenant-pwd',
        'status' => 'active',
    ]);

    // Send the OTHER tenant's password but NO tenant_id and NO nas_ip.
    // Pre-fix this would non-deterministically authenticate one of the two.
    // Post-fix it must fail tenant resolution outright.
    $this->withHeaders(['X-Radius-Secret' => 'test-secret'])
        ->postJson('/api/radius/authorize', [
            'username' => 'pppoe-test',
            'password' => 'other-tenant-pwd',
        ])
        ->assertStatus(401);
});

it('records an accounting Start packet as a session row', function () {
    $this->withHeaders(['X-Radius-Secret' => 'test-secret'])
        ->postJson('/api/radius/accounting', [
            'acct_status_type' => 'Start',
            'username' => 'pppoe-test',
            'tenant_id' => $this->tenant->id,
            'session_id' => 'sess-001',
            'nas_ip' => '10.0.0.1',
            'framed_ip' => '10.10.0.42',
        ])
        ->assertOk();

    $session = RadiusSession::query()->where('session_id', 'sess-001')->first();
    expect($session)->not->toBeNull();
    expect($session->started_at)->not->toBeNull();
    expect($this->user->fresh()->last_login_ip)->toBe('10.10.0.42');
});

it('updates byte counters on Interim-Update', function () {
    RadiusSession::factory()->create([
        'tenant_id' => $this->tenant->id,
        'radius_user_id' => $this->user->id,
        'session_id' => 'sess-002',
        'started_at' => now()->subMinutes(10),
        'bytes_in' => 100,
        'bytes_out' => 50,
    ]);

    $this->withHeaders(['X-Radius-Secret' => 'test-secret'])
        ->postJson('/api/radius/accounting', [
            'acct_status_type' => 'Interim-Update',
            'username' => 'pppoe-test',
            'tenant_id' => $this->tenant->id,
            'session_id' => 'sess-002',
            'bytes_in' => 5_000_000,
            'bytes_out' => 1_000_000,
        ])
        ->assertOk();

    $s = RadiusSession::query()->where('session_id', 'sess-002')->first();
    expect((int) $s->bytes_in)->toBe(5_000_000);
});

it('closes the session on Stop with terminate_cause', function () {
    RadiusSession::factory()->create([
        'tenant_id' => $this->tenant->id,
        'radius_user_id' => $this->user->id,
        'session_id' => 'sess-003',
        'started_at' => now()->subMinutes(60),
    ]);

    $this->withHeaders(['X-Radius-Secret' => 'test-secret'])
        ->postJson('/api/radius/accounting', [
            'acct_status_type' => 'Stop',
            'username' => 'pppoe-test',
            'tenant_id' => $this->tenant->id,
            'session_id' => 'sess-003',
            'bytes_in' => 9_000_000,
            'bytes_out' => 2_000_000,
            'terminate_cause' => 'User-Request',
        ])
        ->assertOk();

    $s = RadiusSession::query()->where('session_id', 'sess-003')->first();
    expect($s->ended_at)->not->toBeNull();
    expect($s->terminate_cause)->toBe('User-Request');
    expect($s->duration_seconds)->toBeGreaterThan(0);
});
