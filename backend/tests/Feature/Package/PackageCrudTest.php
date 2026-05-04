<?php

declare(strict_types=1);

use App\Models\Customer;
use App\Models\CustomerSubscription;
use App\Models\Package;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;

beforeEach(function () {
    $this->tenant = Tenant::factory()->create();
    $this->user = User::factory()->forTenant($this->tenant)->create();
    app(TenantContext::class)->set($this->tenant);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('lists packages with subscription counts and pagination', function () {
    Package::factory()->count(7)->create(['tenant_id' => $this->tenant->id]);

    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/packages?per_page=5')
        ->assertOk()
        ->assertJsonCount(5, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'name', 'code', 'price', 'subscriptions_count']],
            'meta' => ['total'],
        ]);
});

it('creates a package with required fields', function () {
    $payload = [
        'name' => 'Gold 100Mbps',
        'code' => 'GOLD-100',
        'billing_type' => 'recurring',
        'billing_period' => 'monthly',
        'price' => 40,
        'speed_down_mbps' => 100,
        'speed_up_mbps' => 50,
    ];

    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/packages', $payload)
        ->assertCreated()
        ->assertJsonPath('data.name', 'Gold 100Mbps')
        ->assertJsonPath('data.price', 40);
});

it('rejects invalid billing_type / billing_period', function () {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/packages', [
            'name' => 'X', 'code' => 'X1', 'price' => 10,
            'billing_type' => 'magic', 'billing_period' => 'fortnight',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['billing_type', 'billing_period']);
});

it('updates a package', function () {
    $package = Package::factory()->create(['tenant_id' => $this->tenant->id]);

    $this->actingAs($this->user, 'sanctum')
        ->patchJson("/api/v1/packages/{$package->id}", ['price' => 99.5])
        ->assertOk()
        ->assertJsonPath('data.price', 99.5);
});

it('deletes a package with no subscriptions', function () {
    $package = Package::factory()->create(['tenant_id' => $this->tenant->id]);

    $this->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/packages/{$package->id}")
        ->assertNoContent();
});

it('refuses to delete a package with active subscriptions (409)', function () {
    $package = Package::factory()->create(['tenant_id' => $this->tenant->id]);
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    CustomerSubscription::query()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'package_id' => $package->id,
        'status' => 'active',
    ]);

    $this->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/packages/{$package->id}")
        ->assertStatus(409)
        ->assertJsonStructure(['message', 'subscriptions_count']);
});
