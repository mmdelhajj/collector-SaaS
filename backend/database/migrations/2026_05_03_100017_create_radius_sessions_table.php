<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('radius_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->foreignId('radius_user_id')
                ->constrained('radius_users')
                ->cascadeOnDelete();

            $table->string('session_id', 128); // Acct-Unique-Session-ID
            $table->ipAddress('nas_ip')->nullable();
            $table->string('nas_port', 32)->nullable();
            $table->ipAddress('framed_ip')->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('updated_at_radius')->nullable(); // last interim-update
            $table->timestamp('ended_at')->nullable();
            $table->unsignedBigInteger('duration_seconds')->nullable();
            $table->unsignedBigInteger('bytes_in')->default(0);
            $table->unsignedBigInteger('bytes_out')->default(0);
            $table->string('terminate_cause', 64)->nullable();

            $table->timestamps();

            $table->unique(['tenant_id', 'session_id']);
            $table->index(['tenant_id', 'radius_user_id']);
            $table->index(['tenant_id', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('radius_sessions');
    }
};
