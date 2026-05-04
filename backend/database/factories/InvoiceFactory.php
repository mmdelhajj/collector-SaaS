<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $issued = now()->subDays(fake()->numberBetween(1, 60));
        $due = (clone $issued)->addDays(15);
        $total = fake()->randomElement([15, 25, 40, 65, 90]);

        return [
            'tenant_id' => Tenant::factory(),
            'customer_id' => Customer::factory(),
            'issued_at' => $issued,
            'due_at' => $due,
            'period_start' => $issued->copy()->startOfMonth(),
            'period_end' => $issued->copy()->endOfMonth(),
            'subtotal' => $total,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'total' => $total,
            'currency' => 'USD',
            'status' => 'open',
            'paid_amount' => 0,
        ];
    }

    public function paid(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'paid',
            'paid_amount' => $attrs['total'] ?? 25,
            'paid_at' => now()->subDays(fake()->numberBetween(0, 5)),
        ]);
    }

    public function overdue(): static
    {
        return $this->state(fn () => [
            'status' => 'overdue',
            'issued_at' => now()->subDays(60),
            'due_at' => now()->subDays(30),
        ]);
    }
}
