<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CashHandover;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CashHandover
 */
class CashHandoverResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'status' => $this->status,
            'notes' => $this->notes,
            'collector_route_id' => $this->collector_route_id,
            'handed_over_at' => $this->handed_over_at?->toIso8601String(),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'disputed_at' => $this->disputed_at?->toIso8601String(),
            'dispute_reason' => $this->dispute_reason,
            'photo_path' => $this->photo_path,
            'collector' => $this->whenLoaded('collector', fn () => $this->collector ? [
                'id' => $this->collector->id,
                'name' => $this->collector->name,
            ] : null),
            'supervisor' => $this->whenLoaded('supervisor', fn () => $this->supervisor ? [
                'id' => $this->supervisor->id,
                'name' => $this->supervisor->name,
            ] : null),
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn ($p) => [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'method' => $p->method,
                'collected_at' => $p->collected_at?->toIso8601String(),
                'notes' => $p->notes,
                'reference_number' => $p->reference_number,
                'customer' => $p->relationLoaded('customer') && $p->customer
                    ? ['code' => $p->customer->code, 'full_name' => $p->customer->full_name]
                    : null,
                'invoice' => $p->relationLoaded('invoice') && $p->invoice
                    ? ['number' => $p->invoice->number]
                    : null,
            ])),
            'system_amount' => $this->whenLoaded('payments', fn () => round((float) $this->payments->sum('amount'), 2)),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
