<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InvoiceItem>
 */
class InvoiceItemFactory extends Factory
{
    protected $model = InvoiceItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $price = fake()->randomElement([15, 25, 40, 65, 90]);

        return [
            'tenant_id' => Tenant::factory(),
            'invoice_id' => Invoice::factory(),
            'description' => fake()->randomElement([
                'Monthly subscription',
                'Setup fee',
                'Equipment',
                'Late fee',
            ]),
            'quantity' => 1,
            'unit_price' => $price,
            'tax_rate' => 0,
            'total' => $price,
        ];
    }
}
