<?php

declare(strict_types=1);

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\MessageLog;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac;
use App\Support\TenantContext;
use Database\Seeders\MessageTemplatesSeeder;
use Database\Seeders\RolesSeeder;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->tenant = Tenant::factory()->create(['name' => 'Test ISP']);
    (new RolesSeeder)->seedForTenant($this->tenant->id);
    (new MessageTemplatesSeeder)->seedForTenant($this->tenant->id);

    app(TenantContext::class)->set($this->tenant);
    app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);

    $this->collector = User::factory()->forTenant($this->tenant)->create();
    $this->collector->assignRole(Rbac::ROLE_COLLECTOR);
});

afterEach(function () {
    app(TenantContext::class)->clear();
});

it('logs a WhatsApp send when the customer has a whatsapp_phone', function () {
    $customer = Customer::factory()->create([
        'tenant_id' => $this->tenant->id,
        'whatsapp_phone' => '+96170111222',
        'phone_primary' => '+96170111222',
    ]);
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'total' => 50,
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $customer->id,
            'invoice_id' => $invoice->id,
            'amount' => 50,
            'method' => 'cash',
        ])
        ->assertCreated();

    // Sync queue (phpunit.xml) means the job ran inline.
    $log = MessageLog::query()
        ->where('customer_id', $customer->id)
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull();
    expect($log->channel)->toBe('whatsapp');
    expect($log->status)->toBe('sent');
    expect($log->provider)->toBe('log');
    expect($log->to_address)->toBe('+96170111222');
});

it('falls back to SMS when there is no whatsapp_phone', function () {
    $customer = Customer::factory()->create([
        'tenant_id' => $this->tenant->id,
        'whatsapp_phone' => null,
        'phone_primary' => '+96170222333',
        'email' => null,
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $customer->id,
            'amount' => 25,
            'method' => 'cash',
        ])
        ->assertCreated();

    $log = MessageLog::query()
        ->where('customer_id', $customer->id)
        ->latest('id')
        ->first();

    expect($log->channel)->toBe('sms');
    expect($log->status)->toBe('sent');
});

it('marks payment.receipt_sent_at when send succeeds', function () {
    $customer = Customer::factory()->create([
        'tenant_id' => $this->tenant->id,
        'whatsapp_phone' => '+96170444555',
    ]);
    $invoice = Invoice::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'total' => 30,
    ]);

    $resp = $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $customer->id,
            'invoice_id' => $invoice->id,
            'amount' => 30,
            'method' => 'cash',
        ])->assertCreated();

    $payment = Payment::query()->find($resp->json('data.id'));
    expect($payment->receipt_sent_at)->not->toBeNull();
    expect($payment->receipt_channels)->toBe(['whatsapp']);
});

it('does NOT send a receipt when customer has no contact info at all', function () {
    $customer = Customer::factory()->create([
        'tenant_id' => $this->tenant->id,
        'whatsapp_phone' => null,
        'phone_primary' => '',
        'email' => null,
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $customer->id,
            'amount' => 10,
            'method' => 'cash',
        ])->assertCreated();

    expect(MessageLog::query()->where('customer_id', $customer->id)->count())->toBe(0);
});

it('queues the receipt job rather than running it inline (production behaviour)', function () {
    Queue::fake();
    $customer = Customer::factory()->create([
        'tenant_id' => $this->tenant->id,
        'whatsapp_phone' => '+96170555666',
    ]);

    $this->actingAs($this->collector, 'sanctum')
        ->postJson('/api/v1/payments', [
            'customer_id' => $customer->id,
            'amount' => 40,
            'method' => 'cash',
        ])->assertCreated();

    Queue::assertPushed(\App\Jobs\SendPaymentReceiptJob::class);
});

it('public receipt page renders without auth', function () {
    $customer = Customer::factory()->create([
        'tenant_id' => $this->tenant->id,
        'first_name' => 'Layla', 'last_name' => 'Nasser',
    ]);
    $payment = Payment::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
        'amount' => 75,
        'currency' => 'USD',
    ]);

    // No auth — public route. URL must be HMAC-signed with a valid expiry,
    // mirroring how SendPaymentReceiptJob generates it. An unsigned hit
    // returns 403; that's the whole point of the signed-URL change.
    $this->get("/receipts/{$payment->id}")
        ->assertStatus(403);

    $signed = \Illuminate\Support\Facades\URL::temporarySignedRoute(
        'receipts.public',
        now()->addDays(30),
        ['paymentId' => $payment->id],
    );

    $this->get($signed)
        ->assertOk()
        ->assertSee('Payment received')
        ->assertSee('Layla Nasser')
        ->assertSee('USD 75.00');
});

it('rejects expired receipt links', function () {
    $customer = Customer::factory()->create([
        'tenant_id' => $this->tenant->id,
    ]);
    $payment = Payment::factory()->create([
        'tenant_id' => $this->tenant->id,
        'customer_id' => $customer->id,
    ]);

    $expired = \Illuminate\Support\Facades\URL::temporarySignedRoute(
        'receipts.public',
        now()->subMinute(), // already expired
        ['paymentId' => $payment->id],
    );

    $this->get($expired)->assertStatus(403);
});
