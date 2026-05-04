<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CashHandover;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CashHandover>
 */
class CashHandoverFactory extends Factory
{
    protected $model = CashHandover::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'from_user_id' => User::factory(),
            'amount' => fake()->randomFloat(2, 50, 2000),
            'currency' => 'USD',
            'status' => 'pending',
            'handed_over_at' => now(),
        ];
    }

    public function confirmed(): static
    {
        return $this->state(fn () => [
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);
    }
}
