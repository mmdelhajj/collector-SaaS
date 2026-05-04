<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\RadiusSession;
use App\Models\RadiusUser;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<RadiusSession>
 */
class RadiusSessionFactory extends Factory
{
    protected $model = RadiusSession::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'radius_user_id' => RadiusUser::factory(),
            'session_id' => Str::random(20),
            'started_at' => now()->subMinutes(fake()->numberBetween(5, 600)),
            'bytes_in' => fake()->numberBetween(0, 1_000_000_000),
            'bytes_out' => fake()->numberBetween(0, 200_000_000),
        ];
    }
}
