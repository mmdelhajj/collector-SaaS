<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('radius_users', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();
            $table->foreignUuid('customer_id')
                ->constrained('customers')
                ->cascadeOnDelete();
            $table->foreignId('subscription_id')
                ->nullable()
                ->constrained('customer_subscriptions')
                ->nullOnDelete();

            $table->string('username', 64);
            // Cleartext-equivalent password used by FreeRADIUS for PAP/CHAP.
            // Encrypted at the cast layer; kept separate from users.password so
            // we can return it to RADIUS for auth.
            $table->text('password');

            $table->macAddress('mac_address')->nullable();
            $table->ipAddress('ip_assigned')->nullable();
            $table->string('radius_group', 64)->nullable();

            $table->string('status', 16)->default('active');
            // active | suspended | throttled | terminated

            $table->decimal('data_used_mb_current_period', 12, 2)->default(0);

            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->ipAddress('last_login_ip')->nullable();
            $table->ipAddress('last_login_nas')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'username']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'customer_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('radius_users');
    }
};
