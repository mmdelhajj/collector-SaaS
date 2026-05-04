<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\CollectorRoute
 */
class CollectorRouteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'collector_user_id' => $this->collector_user_id,
            'date' => $this->date?->toDateString(),
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'start_latitude' => $this->start_latitude !== null ? (float) $this->start_latitude : null,
            'start_longitude' => $this->start_longitude !== null ? (float) $this->start_longitude : null,
            'end_latitude' => $this->end_latitude !== null ? (float) $this->end_latitude : null,
            'end_longitude' => $this->end_longitude !== null ? (float) $this->end_longitude : null,
            'total_collected' => (float) $this->total_collected,
            'distance_km' => $this->distance_km !== null ? (float) $this->distance_km : null,
            'collector' => $this->whenLoaded('collector', fn () => $this->collector ? [
                'id' => $this->collector->id,
                'name' => $this->collector->name,
            ] : null),
        ];
    }
}
