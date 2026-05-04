<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('packages', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->foreignId('service_category_id')
                ->nullable()
                ->constrained('service_categories')
                ->nullOnDelete();

            $table->string('name');
            $table->string('code', 64);
            $table->text('description')->nullable();

            $table->string('billing_type', 24)->default('recurring');
            // recurring | prepaid | postpaid | usage_based
            $table->string('billing_period', 24)->default('monthly');
            // monthly | quarterly | annual | custom_days
            $table->unsignedInteger('billing_period_days')->nullable();

            $table->decimal('price', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->decimal('setup_fee', 12, 2)->default(0);
            $table->decimal('deposit', 12, 2)->default(0);
            $table->decimal('tax_rate', 6, 3)->default(0);

            // Service-specific (all nullable — only relevant for some categories).
            $table->unsignedInteger('speed_down_mbps')->nullable();
            $table->unsignedInteger('speed_up_mbps')->nullable();
            $table->decimal('data_quota_gb', 10, 2)->nullable();
            $table->unsignedSmallInteger('amperage')->nullable();
            $table->decimal('kwh_included', 10, 2)->nullable();
            $table->string('radius_group_name', 64)->nullable();

            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'service_category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('packages');
    }
};
