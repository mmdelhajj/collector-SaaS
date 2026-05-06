<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pending plan-change approval queue.
 *
 * Pre: tenant clicks "Change plan" → tenants.plan_id is mutated immediately,
 *      super-admin has no awareness or veto.
 * Post: tenant click creates a row here in `pending` state. Super-admin sees
 *       a queue, approves or rejects with an optional note. Only on approve
 *       does the tenant's plan_id actually change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_change_requests', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();

            $table->foreignId('requested_plan_id')
                ->constrained('plans')->restrictOnDelete();
            $table->string('requested_period', 16); // monthly | annual

            // Snapshot for audit if the tenant is later moved by an admin.
            $table->string('current_plan_code', 32)->nullable();
            $table->string('current_period', 16)->nullable();

            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])
                ->default('pending');
            $table->text('requester_note')->nullable();
            $table->text('decision_note')->nullable();

            $table->foreignId('requested_by_user_id')
                ->constrained('users')->restrictOnDelete();
            $table->foreignId('decided_by_user_id')
                ->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();

            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['status', 'created_at']);
        });

        // Only one pending request per tenant at a time — UX simplicity, no
        // weird "which request wins" fights.
        DB::statement(
            'CREATE UNIQUE INDEX plan_change_requests_one_pending_per_tenant '
            ."ON plan_change_requests (tenant_id) WHERE status = 'pending'"
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS plan_change_requests_one_pending_per_tenant');
        Schema::dropIfExists('plan_change_requests');
    }
};
