<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collector_routes', function (Blueprint $table) {
            $table->decimal('last_latitude', 10, 7)->nullable()->after('end_longitude');
            $table->decimal('last_longitude', 10, 7)->nullable()->after('last_latitude');
            $table->timestamp('last_ping_at')->nullable()->after('last_longitude');
        });
    }

    public function down(): void
    {
        Schema::table('collector_routes', function (Blueprint $table) {
            $table->dropColumn(['last_latitude', 'last_longitude', 'last_ping_at']);
        });
    }
};
