<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Package;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Package>
 */
class PackageFactory extends Factory
{
    protected $model = Package::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->randomElement([
            'Bronze 25Mbps', 'Silver 50Mbps', 'Gold 100Mbps',
            'Platinum 200Mbps', 'Family Unlimited',
        ]);

        return [
            'tenant_id' => Tenant::factory(),
            'name' => $name,
            'code' => 'PKG-'.strtoupper(Str::random(6)),
            'description' => fake()->sentence(8),
            'billing_type' => 'recurring',
            'billing_period' => 'monthly',
            'price' => fake()->randomElement([15, 25, 35, 50, 75, 100]),
            'currency' => 'USD',
            'setup_fee' => 0,
            'deposit' => 0,
            'tax_rate' => 0,
            'speed_down_mbps' => fake()->randomElement([25, 50, 100, 200]),
            'speed_up_mbps' => fake()->randomElement([10, 25, 50, 100]),
            'data_quota_gb' => null,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
