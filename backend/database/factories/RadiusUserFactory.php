<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Customer;
use App\Models\RadiusUser;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<RadiusUser>
 */
class RadiusUserFactory extends Factory
{
    protected $model = RadiusUser::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'customer_id' => Customer::factory(),
            'username' => 'pppoe-'.Str::random(8),
            'password' => Str::random(12),
            'radius_group' => 'gold_100',
            'status' => 'active',
            'data_used_mb_current_period' => 0,
        ];
    }

    public function suspended(): static
    {
        return $this->state(fn () => ['status' => 'suspended']);
    }
}
