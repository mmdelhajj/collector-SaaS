<?php

declare(strict_types=1);

use App\Models\Customer;
use App\Models\ServiceCategory;
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

it('lists customers paginated with meta', function () {
    Customer::factory()->count(7)->create(['tenant_id' => $this->tenant->id]);

    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/customers?per_page=5')
        ->assertOk()
        ->assertJsonCount(5, 'data')
        ->assertJsonStructure(['data', 'meta' => ['current_page', 'total'], 'links']);
});

it('creates a customer with auto-generated code', function () {
    $category = ServiceCategory::factory()->create(['tenant_id' => $this->tenant->id]);

    $response = $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/customers', [
        'service_category_id' => $category->id,
        'first_name' => 'Ahmad',
        'last_name' => 'Khalil',
        'phone_primary' => '+96170123456',
        'status' => 'active',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.first_name', 'Ahmad')
        ->assertJsonPath('data.code', 'C-00001');
});

it('returns 422 on invalid payload', function () {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/customers', ['first_name' => '']) // missing required fields
        ->assertStatus(422)
        ->assertJsonValidationErrors(['first_name', 'last_name', 'phone_primary']);
});

it('updates and shows a customer', function () {
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);

    $this->actingAs($this->user, 'sanctum')
        ->patchJson("/api/v1/customers/{$customer->id}", ['city' => 'Tripoli'])
        ->assertOk()
        ->assertJsonPath('data.city', 'Tripoli');

    $this->actingAs($this->user, 'sanctum')
        ->getJson("/api/v1/customers/{$customer->id}")
        ->assertOk()
        ->assertJsonPath('data.city', 'Tripoli');
});

it('soft-deletes a customer', function () {
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);

    $this->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/customers/{$customer->id}")
        ->assertNoContent();

    expect(Customer::query()->find($customer->id))->toBeNull();
    expect(Customer::withoutTenant()->withTrashed()->find($customer->id))->not->toBeNull();
});

it('searches customers by name, phone, code, email', function () {
    Customer::factory()->create(['tenant_id' => $this->tenant->id, 'first_name' => 'Layla', 'last_name' => 'Nasser']);
    Customer::factory()->create(['tenant_id' => $this->tenant->id, 'first_name' => 'Karim', 'last_name' => 'Haddad']);

    $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/customers?search=layla')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.first_name', 'Layla');
});
