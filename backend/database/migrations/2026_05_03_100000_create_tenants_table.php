<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('domain')->nullable()->unique();
            $table->string('logo_url')->nullable();
            $table->string('primary_color', 7)->default('#cc785c');
            $table->string('currency_primary', 3)->default('USD');
            $table->string('currency_secondary', 3)->nullable();
            $table->decimal('exchange_rate', 12, 4)->nullable();
            $table->string('timezone', 64)->default('Asia/Beirut');
            $table->string('locale', 8)->default('en');
            $table->string('plan', 32)->default('trial');
            $table->string('status', 16)->default('trial');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('subscription_ends_at')->nullable();
            $table->jsonb('settings')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('plan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
