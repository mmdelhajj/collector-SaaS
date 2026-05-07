<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Spatie permission tables (`roles`, `model_has_roles`, `model_has_permissions`)
 * carry a `tenant_id` column for team-scoped roles, but Spatie ships no FK on
 * it — so deleting a tenant left orphan role rows behind. This migration
 * cleans up existing orphans, then adds ON DELETE CASCADE so future tenant
 * deletes self-clean.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Purge orphans before the FK refuses to install.
        DB::statement("delete from roles where tenant_id is not null and tenant_id not in (select id from tenants)");
        DB::statement("delete from model_has_roles where tenant_id is not null and tenant_id not in (select id from tenants)");
        DB::statement("delete from model_has_permissions where tenant_id is not null and tenant_id not in (select id from tenants)");

        Schema::table('roles', function ($table) {
            $table->foreign('tenant_id')
                ->references('id')->on('tenants')
                ->cascadeOnDelete();
        });
        Schema::table('model_has_roles', function ($table) {
            $table->foreign('tenant_id', 'mhr_tenant_id_foreign')
                ->references('id')->on('tenants')
                ->cascadeOnDelete();
        });
        Schema::table('model_has_permissions', function ($table) {
            $table->foreign('tenant_id', 'mhp_tenant_id_foreign')
                ->references('id')->on('tenants')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('model_has_permissions', function ($table) {
            $table->dropForeign('mhp_tenant_id_foreign');
        });
        Schema::table('model_has_roles', function ($table) {
            $table->dropForeign('mhr_tenant_id_foreign');
        });
        Schema::table('roles', function ($table) {
            $table->dropForeign(['tenant_id']);
        });
    }
};
