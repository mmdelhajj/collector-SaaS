<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CollectorRoute;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CollectorRoute>
 */
class CollectorRouteFactory extends Factory
{
    protected $model = CollectorRoute::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'collector_user_id' => User::factory(),
            'date' => now()->toDateString(),
            'started_at' => now()->copy()->setTime(8, 0),
            'total_collected' => 0,
        ];
    }
}
