<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // 'manual' = admin types the rate themselves.
            // 'auto'   = daily scheduled job pulls from open.er-api.com.
            $table->string('exchange_rate_source', 16)
                ->default('manual')
                ->after('exchange_rate_updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('exchange_rate_source');
        });
    }
};
