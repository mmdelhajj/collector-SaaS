<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\RadiusUser
 */
class RadiusUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'subscription_id' => $this->subscription_id,
            'username' => $this->username,
            'mac_address' => $this->mac_address,
            'ip_assigned' => $this->ip_assigned,
            'radius_group' => $this->radius_group,
            'status' => $this->status,
            'data_used_mb_current_period' => (float) $this->data_used_mb_current_period,
            'last_seen_at' => $this->last_seen_at?->toIso8601String(),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'last_login_ip' => $this->last_login_ip,
            'last_login_nas' => $this->last_login_nas,
            'customer' => $this->whenLoaded('customer', fn () => $this->customer ? [
                'id' => $this->customer->id,
                'code' => $this->customer->code,
                'full_name' => $this->customer->full_name,
                'phone_primary' => $this->customer->phone_primary,
                'status' => $this->customer->status,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
