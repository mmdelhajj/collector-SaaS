<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collector_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->foreignId('collector_user_id')
                ->constrained('users')
                ->restrictOnDelete();
            $table->date('date');

            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->decimal('start_latitude', 10, 7)->nullable();
            $table->decimal('start_longitude', 10, 7)->nullable();
            $table->decimal('end_latitude', 10, 7)->nullable();
            $table->decimal('end_longitude', 10, 7)->nullable();

            $table->decimal('total_collected', 12, 2)->default(0);
            $table->decimal('distance_km', 8, 2)->nullable();

            // GPS pings collected during the route. Up to ~1k points; bigger
            // tracks would warrant a separate normalised table.
            $table->jsonb('gps_track')->nullable();

            $table->timestamps();

            $table->unique(['tenant_id', 'collector_user_id', 'date']);
            $table->index(['tenant_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collector_routes');
    }
};
