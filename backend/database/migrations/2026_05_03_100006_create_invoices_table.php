<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->foreignUuid('customer_id')
                ->constrained('customers')
                ->restrictOnDelete();
            $table->foreignId('subscription_id')
                ->nullable()
                ->constrained('customer_subscriptions')
                ->nullOnDelete();

            $table->string('number', 32);

            $table->timestamp('issued_at');
            $table->timestamp('due_at');
            $table->timestamp('period_start')->nullable();
            $table->timestamp('period_end')->nullable();

            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->string('currency', 3)->default('USD');

            $table->string('status', 16)->default('draft');
            // draft | open | paid | partial | overdue | cancelled | void
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('balance_due', 12, 2)->default(0);
            $table->timestamp('paid_at')->nullable();

            $table->text('notes')->nullable();
            $table->string('pdf_path')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'number']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'customer_id']);
            $table->index(['tenant_id', 'due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
