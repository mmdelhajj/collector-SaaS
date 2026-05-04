<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CollectorAssignment;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CollectorAssignment>
 */
class CollectorAssignmentFactory extends Factory
{
    protected $model = CollectorAssignment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'collector_user_id' => User::factory(),
            'invoice_id' => Invoice::factory(),
            'assigned_at' => now()->startOfDay(),
            'status' => 'pending',
            'priority' => 3,
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn () => ['status' => 'in_progress']);
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }
}
