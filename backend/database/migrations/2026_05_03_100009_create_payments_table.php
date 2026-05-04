<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->foreignUuid('customer_id')
                ->constrained('customers')
                ->restrictOnDelete();
            $table->foreignUuid('invoice_id')
                ->nullable()
                ->constrained('invoices')
                ->nullOnDelete();

            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('method', 24);
            // cash | card | bank_transfer | whish | omt | areeba | stripe | other
            $table->string('reference_number')->nullable();
            $table->string('status', 16)->default('completed');
            // pending | completed | failed | refunded

            $table->foreignId('collected_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('collected_at');

            // Where the cash was physically received (collector flow).
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            // Proof artefacts (uploaded to S3 by mobile app — paths only here).
            $table->string('photo_path')->nullable();
            $table->string('signature_path')->nullable();
            $table->string('voice_note_path')->nullable();

            $table->text('notes')->nullable();

            // Receipt-send bookkeeping.
            $table->timestamp('receipt_sent_at')->nullable();
            $table->jsonb('receipt_channels')->nullable();

            // Offline-mode bookkeeping (mobile collector app).
            $table->string('device_id', 64)->nullable();
            $table->boolean('is_synced')->default(true);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'collected_at']);
            $table->index(['tenant_id', 'invoice_id']);
            $table->index(['tenant_id', 'customer_id']);
            $table->index(['tenant_id', 'collected_by_user_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
