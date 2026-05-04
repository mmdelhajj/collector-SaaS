<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Payment
 */
class PaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'invoice_id' => $this->invoice_id,
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'method' => $this->method,
            'reference_number' => $this->reference_number,
            'status' => $this->status,
            'collected_by_user_id' => $this->collected_by_user_id,
            'collected_at' => $this->collected_at?->toIso8601String(),
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'notes' => $this->notes,
            'receipt_sent_at' => $this->receipt_sent_at?->toIso8601String(),
            'receipt_channels' => $this->receipt_channels,
            'customer' => $this->whenLoaded('customer', fn () => [
                'id' => $this->customer->id,
                'code' => $this->customer->code,
                'full_name' => $this->customer->full_name,
                'phone_primary' => $this->customer->phone_primary,
            ]),
            'invoice' => $this->whenLoaded('invoice', fn () => [
                'id' => $this->invoice->id,
                'number' => $this->invoice->number,
                'total' => (float) $this->invoice->total,
                'balance_due' => (float) $this->invoice->balance_due,
                'status' => $this->invoice->status,
            ]),
            'collector' => $this->whenLoaded('collector', fn () => $this->collector ? [
                'id' => $this->collector->id,
                'name' => $this->collector->name,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
