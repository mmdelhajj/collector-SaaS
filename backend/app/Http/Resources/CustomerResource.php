<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Customer
 */
class CustomerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'service_category_id' => $this->service_category_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'national_id' => $this->national_id,
            'phone_primary' => $this->phone_primary,
            'phone_secondary' => $this->phone_secondary,
            'whatsapp_phone' => $this->whatsapp_phone,
            'email' => $this->email,
            'country' => $this->country,
            'city' => $this->city,
            'region' => $this->region,
            'address_line' => $this->address_line,
            'building' => $this->building,
            'floor' => $this->floor,
            'apartment' => $this->apartment,
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'status' => $this->status,
            'balance_due' => (float) $this->balance_due,
            'credit_limit' => (float) $this->credit_limit,
            'tags' => $this->tags ?? [],
            'custom_fields' => $this->custom_fields ?? [],
            'service_started_at' => $this->service_started_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
