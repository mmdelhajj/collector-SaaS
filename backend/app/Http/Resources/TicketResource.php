<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Ticket
 */
class TicketResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'type' => $this->type,
            'priority' => $this->priority,
            'status' => $this->status,
            'title' => $this->title,
            'description' => $this->description,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'check_in_at' => $this->check_in_at?->toIso8601String(),
            'check_in_lat' => $this->check_in_lat,
            'check_in_lng' => $this->check_in_lng,
            'photos' => $this->photos ?? [],
            'materials_used' => $this->materials_used ?? [],
            'customer' => $this->whenLoaded('customer', fn () => [
                'id' => $this->customer->id,
                'code' => $this->customer->code,
                'full_name' => $this->customer->full_name,
                'phone_primary' => $this->customer->phone_primary,
                'address_line' => $this->customer->address_line,
                'city' => $this->customer->city,
            ]),
            'assigned_to' => $this->whenLoaded('assignedTo', function () {
                if (! $this->assignedTo) {
                    return null;
                }

                return [
                    'id' => $this->assignedTo->id,
                    'name' => $this->assignedTo->name,
                ];
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
