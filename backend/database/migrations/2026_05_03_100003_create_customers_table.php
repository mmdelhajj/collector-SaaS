<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->string('code', 32);
            $table->foreignId('service_category_id')
                ->nullable()
                ->constrained('service_categories')
                ->nullOnDelete();

            $table->string('first_name');
            $table->string('last_name');
            $table->string('national_id', 64)->nullable();
            $table->string('passport', 64)->nullable();

            $table->string('phone_primary', 32);
            $table->string('phone_secondary', 32)->nullable();
            $table->string('whatsapp_phone', 32)->nullable();
            $table->string('email')->nullable();

            $table->string('country', 2)->default('LB');
            $table->string('city')->nullable();
            $table->string('region')->nullable();
            $table->string('district')->nullable();
            $table->string('neighborhood')->nullable();
            $table->string('address_line')->nullable();
            $table->string('building')->nullable();
            $table->string('floor', 16)->nullable();
            $table->string('apartment', 16)->nullable();

            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamp('location_pin_set_at')->nullable();
            $table->foreignId('location_pin_set_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('status', 16)->default('prospect');
            $table->decimal('balance_due', 12, 2)->default(0);
            $table->decimal('credit_limit', 12, 2)->default(0);
            $table->timestamp('service_started_at')->nullable();
            $table->timestamp('service_ended_at')->nullable();

            $table->jsonb('custom_fields')->nullable();
            $table->jsonb('tags')->nullable();
            $table->text('notes')->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('assigned_to')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'service_category_id']);
            $table->index(['tenant_id', 'phone_primary']);
            $table->index(['tenant_id', 'last_name', 'first_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
