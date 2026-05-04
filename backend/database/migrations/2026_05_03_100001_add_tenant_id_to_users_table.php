<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Nullable so super-admins (platform staff) have no tenant.
            $table->foreignUuid('tenant_id')
                ->nullable()
                ->after('id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->string('phone', 32)->nullable()->after('email');
            $table->string('locale', 8)->default('en')->after('phone');
            $table->string('timezone', 64)->default('Asia/Beirut')->after('locale');
            $table->boolean('is_active')->default(true)->after('timezone');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
            $table->ipAddress('last_login_ip')->nullable()->after('last_login_at');

            $table->index(['tenant_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropIndex(['tenant_id', 'is_active']);
            $table->dropColumn([
                'tenant_id', 'phone', 'locale', 'timezone',
                'is_active', 'last_login_at', 'last_login_ip',
            ]);
        });
    }
};
