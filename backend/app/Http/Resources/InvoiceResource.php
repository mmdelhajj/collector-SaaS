<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Invoice
 */
class InvoiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'customer_id' => $this->customer_id,
            'subscription_id' => $this->subscription_id,
            'issued_at' => $this->issued_at?->toIso8601String(),
            'due_at' => $this->due_at?->toIso8601String(),
            'period_start' => $this->period_start?->toIso8601String(),
            'period_end' => $this->period_end?->toIso8601String(),
            'subtotal' => (float) $this->subtotal,
            'tax_amount' => (float) $this->tax_amount,
            'discount_amount' => (float) $this->discount_amount,
            'total' => (float) $this->total,
            'currency' => $this->currency,
            'status' => $this->status,
            'paid_amount' => (float) $this->paid_amount,
            'balance_due' => (float) $this->balance_due,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'notes' => $this->notes,
            'customer' => $this->whenLoaded('customer', fn () => [
                'id' => $this->customer->id,
                'code' => $this->customer->code,
                'full_name' => $this->customer->full_name,
                'phone_primary' => $this->customer->phone_primary,
                'whatsapp_phone' => $this->customer->whatsapp_phone,
                'email' => $this->customer->email,
                'city' => $this->customer->city,
                'district' => $this->customer->district,
                'neighborhood' => $this->customer->neighborhood,
                'address_line' => $this->customer->address_line,
            ]),
            'items' => InvoiceItemResource::collection($this->whenLoaded('items')),
            'tenant' => $this->whenLoaded('tenant', fn () => [
                'id' => $this->tenant->id,
                'name' => $this->tenant->name,
                'currency_primary' => $this->tenant->currency_primary,
                'timezone' => $this->tenant->timezone,
            ]),
            'service_category' => $this->resolveServiceCategory(),
            'assignment' => $this->whenLoaded('activeAssignment', function () {
                if (! $this->activeAssignment) {
                    return null;
                }

                return [
                    'id' => $this->activeAssignment->id,
                    'status' => $this->activeAssignment->status,
                    'priority' => $this->activeAssignment->priority,
                    'route_order' => $this->activeAssignment->route_order,
                    'assigned_at' => $this->activeAssignment->assigned_at?->toIso8601String(),
                    'collector' => $this->activeAssignment->collector
                        ? [
                            'id' => $this->activeAssignment->collector->id,
                            'name' => $this->activeAssignment->collector->name,
                        ]
                        : null,
                ];
            }),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * Pull the first item's package's service category if items are loaded.
     * Returns null when nothing's eager-loaded so we don't trigger N+1.
     *
     * @return array{id: int|string, name: string}|null
     */
    private function resolveServiceCategory(): ?array
    {
        if (! $this->relationLoaded('items')) {
            return null;
        }
        foreach ($this->items as $item) {
            if (! $item->relationLoaded('package') || ! $item->package) {
                continue;
            }
            if (! $item->package->relationLoaded('serviceCategory')) {
                continue;
            }
            $cat = $item->package->serviceCategory;
            if (! $cat) {
                continue;
            }

            return ['id' => $cat->id, 'name' => $cat->name];
        }

        return null;
    }
}
