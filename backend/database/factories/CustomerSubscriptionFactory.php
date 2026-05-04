<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Customer;
use App\Models\CustomerSubscription;
use App\Models\Package;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomerSubscription>
 */
class CustomerSubscriptionFactory extends Factory
{
    protected $model = CustomerSubscription::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = now()->subDays(fake()->numberBetween(1, 365));

        return [
            'tenant_id' => Tenant::factory(),
            'customer_id' => Customer::factory(),
            'package_id' => Package::factory(),
            'status' => fake()->randomElement(['active', 'active', 'active', 'suspended']),
            'started_at' => $start,
            'current_period_start' => $start->copy()->startOfMonth(),
            'current_period_end' => $start->copy()->startOfMonth()->addMonth(),
            'auto_renew' => true,
            'price_override' => null,
        ];
    }
}
