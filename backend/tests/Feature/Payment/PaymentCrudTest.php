<?php

declare(strict_types=1);

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac;
use App\Support\TenantContext;
use Database\Seeders\RolesSeeder;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->tenant = Tenant::factory()->create();
    (new RolesSeeder)->seedForTenant($this->tenant->id);

    app(TenantContext::class)->set($this->tenant);
    app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);

    $this->collector = User::factory()->forTenant($this->tenant)->create();
    $this->collector->assignRole(Rbac::ROLE_COLLECTOR);

    $this->customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('records a payment and applies it to the invoice', function () {
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'total' => 50,
        'paid_amount' => 0,
        'status' => 'open',
    ]);

    $resp = $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'amount' => 50,
            'method' => 'cash',
        ])
        ->assertCreated();

    expect((float) $resp->json('data.amount'))->toBe(50.0);
    expect($resp->json('data.method'))->toBe('cash');
    expect($resp->json('data.status'))->toBe('completed');

    $invoice->refresh();
    expect((float) $invoice->paid_amount)->toBe(50.0);
    expect((float) $invoice->balance_due)->toBe(0.0);
    expect($invoice->status)->toBe('paid');
    expect($invoice->paid_at)->not->toBeNull();
});

it('marks invoice partial when payment is less than total', function () {
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'total' => 100,
        'paid_amount' => 0,
        'status' => 'open',
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'amount' => 30,
            'method' => 'cash',
        ])
        ->assertCreated();

    $invoice->refresh();
    expect($invoice->status)->toBe('partial');
    expect((float) $invoice->paid_amount)->toBe(30.0);
    expect((float) $invoice->balance_due)->toBe(70.0);
});

it('refuses to apply a payment to another customer\'s invoice', function () {
    $otherCustomer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $otherCustomer->id,
        'total' => 50,
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'amount' => 50,
            'method' => 'cash',
        ])
        ->assertStatus(422);
});

it('lists payments with eager-loaded customer and invoice', function () {
    Payment::factory()->count(3)->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->getJson('/api/v1/payments')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'amount', 'method', 'status', 'customer' => ['code', 'full_name']]],
        ]);
});

it('rejects payments with amount <= 0', function () {
    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'amount' => 0,
            'method' => 'cash',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['amount']);
});

it('converts LBP cash to USD invoice currency at the locked rate', function () {
    // Tenant has a USD primary, LBP secondary, rate 89500 LBP per USD.
    $this->tenant->update([
        'currency_primary' => 'USD',
        'currency_secondary' => 'LBP',
        'exchange_rate' => 89500,
    ]);

    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'currency' => 'USD',
        'total' => 50,
        'paid_amount' => 0,
        'balance_due' => 50,
        'status' => 'open',
    ]);

    // Customer pays 4,475,000 LBP (= $50 at 89500 LBP/USD).
    $resp = $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'amount_received' => 4_475_000,
            'currency_received' => 'LBP',
            'method' => 'cash',
        ])
        ->assertCreated();

    $payment = Payment::query()->find($resp->json('data.id'));
    expect((float) $payment->amount)->toBe(50.0);
    expect($payment->currency)->toBe('USD');
    expect((float) $payment->amount_received)->toBe(4475000.0);
    expect($payment->currency_received)->toBe('LBP');
    expect((float) $payment->exchange_rate_used)->toBe(89500.0);

    // Invoice gets credited in invoice currency, not received currency.
    expect((float) $invoice->fresh()->paid_amount)->toBe(50.0);
    expect($invoice->fresh()->status)->toBe('paid');
});

it('rejects cross-currency payment when tenant has no exchange rate', function () {
    $this->tenant->update([
        'currency_primary' => 'USD',
        'currency_secondary' => null,
        'exchange_rate' => null,
    ]);

    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'currency' => 'USD',
        'total' => 50,
        'paid_amount' => 0,
        'balance_due' => 50,
        'status' => 'open',
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'amount_received' => 4_475_000,
            'currency_received' => 'LBP',
            'method' => 'cash',
        ])
        ->assertStatus(500); // InvalidArgumentException — caller must configure FX first
});

it('returns the same payment on duplicate client_uuid (idempotency)', function () {
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'total' => 50,
        'paid_amount' => 0,
        'balance_due' => 50,
        'status' => 'open',
    ]);

    $clientUuid = (string) Str::uuid();
    $payload = [
        'customer_id' => $this->customer->id,
        'invoice_id' => $invoice->id,
        'amount' => 50,
        'currency' => 'USD',
        'method' => 'cash',
        'client_uuid' => $clientUuid,
    ];

    $first = $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', $payload)
        ->assertCreated();
    $firstId = $first->json('data.id');

    $second = $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', $payload)
        ->assertOk();
    expect($second->json('data.id'))->toBe($firstId);

    expect(Payment::query()->where('client_uuid', $clientUuid)->count())->toBe(1);
    expect((float) $invoice->fresh()->paid_amount)->toBe(50.0);
});

it('rejects unknown payment methods', function () {
    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'amount' => 25,
            'method' => 'magic_beans',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['method']);
});

it('roles without payments.record cannot record payments', function () {
    $support = User::factory()->forTenant($this->tenant)->create();
    $support->assignRole(Rbac::ROLE_SUPPORT);

    $this->actingAs($support, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'amount' => 25,
            'method' => 'cash',
        ])
        ->assertForbidden();
});

it('refunds reverse the invoice and customer balance', function () {
    $accountant = User::factory()->forTenant($this->tenant)->create();
    $accountant->assignRole(Rbac::ROLE_ACCOUNTANT);

    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $this->customer->id,
        'total' => 50,
    ]);

    // First record a payment.
    $resp = $this->actingAs($accountant, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $this->customer->id,
            'invoice_id' => $invoice->id,
            'amount' => 50,
            'method' => 'cash',
        ])
        ->assertCreated();

    $paymentId = $resp->json('data.id');
    $invoice->refresh();
    expect($invoice->status)->toBe('paid');

    // Refund it.
    $this->actingAs($accountant, 'sanctum')
        ->postJson("/api/v1/payments/{$paymentId}/refund")
        ->assertOk()
        ->assertJsonPath('data.status', 'refunded');

    $invoice->refresh();
    expect($invoice->status)->toBe('open');
    expect((float) $invoice->paid_amount)->toBe(0.0);
    expect((float) $invoice->balance_due)->toBe(50.0);
});
