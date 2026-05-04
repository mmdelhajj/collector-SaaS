<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->foreignUuid('customer_id')
                ->constrained('customers')
                ->cascadeOnDelete();

            $table->string('number', 24)->index();
            $table->string('type', 24);            // install | repair | disconnect | support
            $table->string('priority', 16)->default('normal'); // low | normal | high | urgent
            $table->string('status', 16)->default('open');     // open | scheduled | in_progress | done | cancelled

            $table->foreignId('assigned_to_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('title');
            $table->text('description')->nullable();

            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->decimal('check_in_lat', 10, 7)->nullable();
            $table->decimal('check_in_lng', 10, 7)->nullable();
            $table->timestamp('check_in_at')->nullable();

            $table->json('photos')->nullable();
            $table->string('signature_path')->nullable();
            $table->json('materials_used')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'assigned_to_user_id']);
            $table->index(['tenant_id', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
