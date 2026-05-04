<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ServiceCategory;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceCategory>
 */
class ServiceCategoryFactory extends Factory
{
    protected $model = ServiceCategory::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->randomElement([
                'Internet', 'Electricity', 'Satellite', 'Generator', 'Water', 'IPTV',
            ]),
            'icon' => 'wifi',
            'color' => fake()->hexColor(),
            'custom_fields' => [],
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
