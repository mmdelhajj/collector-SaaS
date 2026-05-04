<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $first = fake()->firstName();
        $last = fake()->lastName();

        return [
            'tenant_id' => Tenant::factory(),
            'first_name' => $first,
            'last_name' => $last,
            'phone_primary' => '+961'.fake()->numerify('#########'),
            'whatsapp_phone' => '+961'.fake()->numerify('#########'),
            'email' => strtolower("{$first}.{$last}@example.com"),
            'country' => 'LB',
            'city' => fake()->randomElement([
                'Beirut', 'Tripoli', 'Saida', 'Tyre', 'Jounieh', 'Zahle',
            ]),
            'address_line' => fake()->streetAddress(),
            'latitude' => fake()->latitude(33.0, 34.7),
            'longitude' => fake()->longitude(35.1, 36.6),
            'status' => fake()->randomElement(Customer::STATUSES),
            'balance_due' => fake()->randomFloat(2, 0, 250),
            'credit_limit' => 100,
            'service_started_at' => now()->subDays(fake()->numberBetween(1, 365)),
            'tags' => [],
            'custom_fields' => [],
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => ['status' => 'active']);
    }
}
