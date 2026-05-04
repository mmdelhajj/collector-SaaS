<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'customer_id' => Customer::factory(),
            'invoice_id' => null,
            'amount' => fake()->randomElement([15, 25, 40, 65, 90]),
            'currency' => 'USD',
            'method' => fake()->randomElement(['cash', 'card', 'bank_transfer', 'whish']),
            'status' => 'completed',
            'collected_at' => now()->subDays(fake()->numberBetween(0, 30)),
            'latitude' => fake()->latitude(33.0, 34.7),
            'longitude' => fake()->longitude(35.1, 36.6),
            'is_synced' => true,
        ];
    }

    public function cash(): static
    {
        return $this->state(fn () => ['method' => 'cash']);
    }
}
