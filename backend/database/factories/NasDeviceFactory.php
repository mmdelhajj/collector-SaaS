<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\NasDevice;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NasDevice>
 */
class NasDeviceFactory extends Factory
{
    protected $model = NasDevice::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->randomElement(['Core-1', 'Edge-A', 'POP-Tripoli', 'POP-Beirut']),
            'ip_address' => fake()->ipv4(),
            'secret' => 'shared-secret-'.fake()->word(),
            'type' => 'mikrotik',
            'coa_port' => 3799,
            'is_active' => true,
        ];
    }
}
