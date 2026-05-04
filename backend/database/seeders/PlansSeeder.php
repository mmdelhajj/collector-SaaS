<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlansSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'code' => 'free',
                'name' => 'Free',
                'description' => 'Try the platform with 25 customers — no credit card required.',
                'price_monthly' => 0,
                'price_annual' => 0,
                'limit_customers' => 25,
                'limit_users' => 1,
                'limit_collectors' => 1,
                'feature_radius' => true,
                'feature_whatsapp' => false,
                'feature_sms' => false,
                'feature_priority_support' => false,
                'is_public' => true,
                'sort_order' => 0,
            ],
            [
                'code' => 'starter',
                'name' => 'Starter',
                'description' => 'Single-user shops getting off spreadsheets.',
                'price_monthly' => 29,
                'price_annual' => 290, // ~17% off
                'limit_customers' => 200,
                'limit_users' => 3,
                'limit_collectors' => 1,
                'feature_radius' => true,
                'feature_whatsapp' => false,
                'feature_sms' => false,
                'feature_priority_support' => false,
                'is_public' => true,
                'sort_order' => 1,
            ],
            [
                'code' => 'growth',
                'name' => 'Growth',
                'description' => 'Most popular — small ISPs with ~5 collectors.',
                'price_monthly' => 89,
                'price_annual' => 890,
                'limit_customers' => 2000,
                'limit_users' => 15,
                'limit_collectors' => 8,
                'feature_radius' => true,
                'feature_whatsapp' => true,
                'feature_sms' => true,
                'feature_priority_support' => false,
                'is_public' => true,
                'sort_order' => 2,
            ],
            [
                'code' => 'pro',
                'name' => 'Pro',
                'description' => 'Established providers with multiple zones + 24/7 support.',
                'price_monthly' => 249,
                'price_annual' => 2490,
                'limit_customers' => 10000,
                'limit_users' => 50,
                'limit_collectors' => 30,
                'feature_radius' => true,
                'feature_whatsapp' => true,
                'feature_sms' => true,
                'feature_priority_support' => true,
                'is_public' => true,
                'sort_order' => 3,
            ],
            [
                'code' => 'enterprise',
                'name' => 'Enterprise',
                'description' => 'Unlimited everything, dedicated account manager, SLA.',
                'price_monthly' => 999,
                'price_annual' => 9990,
                'limit_customers' => null, // unlimited
                'limit_users' => null,
                'limit_collectors' => null,
                'feature_radius' => true,
                'feature_whatsapp' => true,
                'feature_sms' => true,
                'feature_priority_support' => true,
                'is_public' => true,
                'sort_order' => 4,
            ],
        ];

        foreach ($plans as $p) {
            Plan::query()->updateOrCreate(['code' => $p['code']], $p);
        }
    }
}
