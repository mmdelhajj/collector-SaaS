<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();          // starter, growth, pro
            $table->string('name', 80);                    // "Starter", "Growth", "Pro"
            $table->string('description')->nullable();
            $table->decimal('price_monthly', 10, 2);       // USD/month
            $table->decimal('price_annual', 10, 2)->nullable(); // USD/year (discounted)
            $table->string('stripe_price_monthly_id', 80)->nullable();
            $table->string('stripe_price_annual_id', 80)->nullable();

            // Limits — null means unlimited.
            $table->integer('limit_customers')->nullable();
            $table->integer('limit_users')->nullable();
            $table->integer('limit_collectors')->nullable();
            $table->boolean('feature_radius')->default(true);
            $table->boolean('feature_whatsapp')->default(false);
            $table->boolean('feature_sms')->default(false);
            $table->boolean('feature_priority_support')->default(false);

            $table->boolean('is_public')->default(true);   // hidden plans for special deals
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Tenants get a plan reference. Existing tenants stay on whatever
        // their settings.plan column says — nullable until linked.
        Schema::table('tenants', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->after('plan')
                ->constrained('plans')->nullOnDelete();
            $table->string('billing_period', 16)->default('monthly')->after('plan_id'); // monthly | annual
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
            $table->dropColumn(['plan_id', 'billing_period']);
        });
        Schema::dropIfExists('plans');
    }
};
