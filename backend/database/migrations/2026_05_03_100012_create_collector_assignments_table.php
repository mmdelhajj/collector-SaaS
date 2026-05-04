<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collector_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->foreignId('collector_user_id')
                ->constrained('users')
                ->restrictOnDelete();
            $table->foreignUuid('invoice_id')
                ->constrained('invoices')
                ->cascadeOnDelete();

            $table->foreignId('assigned_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('assigned_at');

            $table->string('status', 24)->default('pending');
            // pending | in_progress | completed | failed | reassigned

            $table->timestamp('completed_at')->nullable();

            $table->string('failure_reason', 32)->nullable();
            // customer_not_home | refused | partial_payment | dispute | other

            $table->string('voice_note_path')->nullable();

            $table->unsignedTinyInteger('priority')->default(3); // 1=highest, 5=lowest

            $table->string('zone')->nullable();
            $table->unsignedInteger('route_order')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // One open assignment per (collector, invoice) — but old reassigned/
            // completed rows can stay in history. The unique gate is enforced
            // via a partial index in the next statement.
            $table->index(['tenant_id', 'collector_user_id', 'status']);
            $table->index(['tenant_id', 'invoice_id']);
            $table->index(['tenant_id', 'status', 'priority']);
        });

        // Postgres partial unique index: only one PENDING/IN_PROGRESS assignment
        // per invoice at a time. Reassignment first marks the old row as
        // 'reassigned' before inserting the new one.
        \Illuminate\Support\Facades\DB::statement(
            "CREATE UNIQUE INDEX collector_assignments_active_invoice_unique
             ON collector_assignments (tenant_id, invoice_id)
             WHERE status IN ('pending', 'in_progress') AND deleted_at IS NULL"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('collector_assignments');
    }
};
