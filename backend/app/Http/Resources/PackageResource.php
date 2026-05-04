<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Package;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Package
 */
class PackageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'service_category_id' => $this->service_category_id,
            'billing_type' => $this->billing_type,
            'billing_period' => $this->billing_period,
            'billing_period_days' => $this->billing_period_days,
            'price' => (float) $this->price,
            'currency' => $this->currency,
            'setup_fee' => (float) $this->setup_fee,
            'deposit' => (float) $this->deposit,
            'tax_rate' => (float) $this->tax_rate,
            'speed_down_mbps' => $this->speed_down_mbps,
            'speed_up_mbps' => $this->speed_up_mbps,
            'data_quota_gb' => $this->data_quota_gb !== null ? (float) $this->data_quota_gb : null,
            'amperage' => $this->amperage,
            'kwh_included' => $this->kwh_included !== null ? (float) $this->kwh_included : null,
            'radius_group_name' => $this->radius_group_name,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'subscriptions_count' => $this->whenCounted('subscriptions'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
