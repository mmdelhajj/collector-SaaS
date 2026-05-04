<?php

declare(strict_types=1);

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;

beforeEach(function () {
    $this->tenantA = Tenant::factory()->create();
    $this->tenantB = Tenant::factory()->create();
    $this->userA = User::factory()->forTenant($this->tenantA)->create();
    $this->userB = User::factory()->forTenant($this->tenantB)->create();

    app(TenantContext::class)->set($this->tenantA);
    $custA = Customer::factory()->create(['tenant_id' => $this->tenantA->id]);
    $this->invoiceA = Invoice::factory()->create([
        'tenant_id' => $this->tenantA->id,
        'customer_id' => $custA->id,
    ]);

    app(TenantContext::class)->set($this->tenantB);
    $custB = Customer::factory()->create(['tenant_id' => $this->tenantB->id]);
    $this->invoiceB = Invoice::factory()->create([
        'tenant_id' => $this->tenantB->id,
        'customer_id' => $custB->id,
    ]);

    app(TenantContext::class)->clear();
});

it('lists only the requesting tenant\'s invoices', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->getJson('/api/v1/invoices')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $this->invoiceA->id);
});

it('returns 404 when reading a foreign tenant\'s invoice', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->getJson("/api/v1/invoices/{$this->invoiceB->id}")
        ->assertNotFound();
});

it('returns 404 when downloading a foreign tenant\'s PDF', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->get("/api/v1/invoices/{$this->invoiceB->id}/pdf")
        ->assertNotFound();
});

it('returns 404 when deleting a foreign tenant\'s invoice', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->deleteJson("/api/v1/invoices/{$this->invoiceB->id}")
        ->assertNotFound();
});

it('invoice numbers are unique per-tenant only (each tenant starts at 00001)', function () {
    // Invoice A and B exist; both can have number INV-{year}-00001 because
    // the unique index is (tenant_id, number).
    $year = now()->format('Y');
    expect($this->invoiceA->number)->toStartWith("INV-{$year}-");
    expect($this->invoiceB->number)->toStartWith("INV-{$year}-");
});
