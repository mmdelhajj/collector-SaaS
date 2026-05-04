<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_handovers', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->foreignId('from_user_id')          // collector handing over
                ->constrained('users')
                ->restrictOnDelete();
            $table->foreignId('to_user_id')            // supervisor accepting
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('USD');

            $table->string('status', 16)->default('pending');
            // pending | confirmed | disputed

            $table->string('photo_path')->nullable();
            $table->string('signature_path')->nullable();
            $table->text('notes')->nullable();

            // Tie back to a specific route, if there was one (start/end day flow).
            $table->foreignId('collector_route_id')
                ->nullable()
                ->constrained('collector_routes')
                ->nullOnDelete();

            $table->timestamp('handed_over_at');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('disputed_at')->nullable();
            $table->text('dispute_reason')->nullable();

            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'from_user_id']);
            $table->index(['tenant_id', 'handed_over_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_handovers');
    }
};
