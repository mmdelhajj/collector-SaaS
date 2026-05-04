<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add an idempotency key for offline-recorded payments. The Flutter
     * collector app generates a UUID at the time it captures the payment;
     * the same UUID is sent on every sync attempt. The partial unique
     * index on (tenant_id, client_uuid) lets the server detect duplicate
     * submissions caused by network retries and return the original
     * payment row instead of creating a second one.
     *
     * Nullable + partial index so existing rows (no client_uuid) and
     * web-admin-created payments (no offline retry concern) don't have to
     * supply one.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->uuid('client_uuid')->nullable()->after('reference_number');
        });

        // Partial unique index — `WHERE client_uuid IS NOT NULL`. PG only.
        DB::statement(
            'CREATE UNIQUE INDEX payments_tenant_client_uuid_unique '
            .'ON payments (tenant_id, client_uuid) WHERE client_uuid IS NOT NULL'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS payments_tenant_client_uuid_unique');
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('client_uuid');
        });
    }
};
