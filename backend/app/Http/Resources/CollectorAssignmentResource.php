<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CollectorAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CollectorAssignment
 */
class CollectorAssignmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'collector_user_id' => $this->collector_user_id,
            'invoice_id' => $this->invoice_id,
            'assigned_by' => $this->assigned_by,
            'assigned_at' => $this->assigned_at?->toIso8601String(),
            'status' => $this->status,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'failure_reason' => $this->failure_reason,
            'failure_notes' => $this->failure_notes,
            'priority' => $this->priority,
            'zone' => $this->zone,
            'route_order' => $this->route_order,

            'collector' => $this->whenLoaded('collector', fn () => $this->collector ? [
                'id' => $this->collector->id,
                'name' => $this->collector->name,
            ] : null),

            'invoice' => $this->whenLoaded('invoice', fn () => $this->invoice ? [
                'id' => $this->invoice->id,
                'number' => $this->invoice->number,
                'total' => (float) $this->invoice->total,
                'balance_due' => (float) $this->invoice->balance_due,
                'due_at' => $this->invoice->due_at?->toIso8601String(),
                'service_category' => $this->resolveCategory(),
                'customer' => $this->invoice->relationLoaded('customer') && $this->invoice->customer
                    ? [
                        'id' => $this->invoice->customer->id,
                        'code' => $this->invoice->customer->code,
                        'full_name' => $this->invoice->customer->full_name,
                        'phone_primary' => $this->invoice->customer->phone_primary,
                        'whatsapp_phone' => $this->invoice->customer->whatsapp_phone,
                        'city' => $this->invoice->customer->city,
                        'address_line' => $this->invoice->customer->address_line,
                        'latitude' => $this->invoice->customer->latitude !== null
                            ? (float) $this->invoice->customer->latitude : null,
                        'longitude' => $this->invoice->customer->longitude !== null
                            ? (float) $this->invoice->customer->longitude : null,
                    ]
                    : null,
            ] : null),

            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * Pulls the linked invoice's service category from the first item's
     * package. Returns null when nothing's eager-loaded.
     *
     * @return array{id: int|string, name: string}|null
     */
    private function resolveCategory(): ?array
    {
        if (! $this->invoice || ! $this->invoice->relationLoaded('items')) {
            return null;
        }
        foreach ($this->invoice->items as $item) {
            if (! $item->relationLoaded('package') || ! $item->package) {
                continue;
            }
            if (! $item->package->relationLoaded('serviceCategory')) {
                continue;
            }
            $cat = $item->package->serviceCategory;
            if ($cat) {
                return ['id' => $cat->id, 'name' => $cat->name];
            }
        }

        return null;
    }
}
