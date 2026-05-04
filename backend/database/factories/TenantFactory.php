<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(4),
            'primary_color' => '#cc785c',
            'currency_primary' => 'USD',
            'currency_secondary' => 'LBP',
            'exchange_rate' => 89500,
            'timezone' => 'Asia/Beirut',
            'locale' => 'en',
            'plan' => fake()->randomElement(['trial', 'starter', 'growth']),
            'status' => 'active',
            'trial_ends_at' => now()->addDays(14),
            'settings' => [],
        ];
    }

    public function suspended(): static
    {
        return $this->state(fn () => ['status' => 'suspended']);
    }
}
