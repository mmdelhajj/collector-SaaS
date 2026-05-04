<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages_log', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->foreignUuid('customer_id')
                ->nullable()
                ->constrained('customers')
                ->nullOnDelete();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('channel', 16);
            // whatsapp | sms | email
            $table->string('template_key', 64)->nullable();
            $table->string('to_address', 255);

            $table->string('status', 16)->default('queued');
            // queued | sent | delivered | read | failed

            $table->string('provider', 32)->nullable();
            // log | twilio | 360dialog | meta_whatsapp | mailgun | …
            $table->string('provider_message_id', 128)->nullable();
            $table->decimal('cost', 10, 4)->nullable();
            $table->text('error')->nullable();
            $table->jsonb('payload')->nullable();

            // Polymorphic relation back to whatever caused this send (a payment,
            // an invoice, a suspension, etc.). UUID variant because our primary
            // entities (payments, invoices, customers) all use UUIDs.
            $table->nullableUuidMorphs('related');

            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'channel']);
            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages_log');
    }
};
