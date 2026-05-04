<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\MessageLog
 */
class MessageLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'channel' => $this->channel,
            'template_key' => $this->template_key,
            'to_address' => $this->to_address,
            'status' => $this->status,
            'provider' => $this->provider,
            'provider_message_id' => $this->provider_message_id,
            'cost' => $this->cost !== null ? (float) $this->cost : null,
            'error' => $this->error,
            'related_type' => $this->related_type,
            'related_id' => $this->related_id,
            'sent_at' => $this->sent_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'read_at' => $this->read_at?->toIso8601String(),
            'customer' => $this->whenLoaded('customer', fn () => $this->customer ? [
                'id' => $this->customer->id,
                'code' => $this->customer->code,
                'full_name' => $this->customer->full_name,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
