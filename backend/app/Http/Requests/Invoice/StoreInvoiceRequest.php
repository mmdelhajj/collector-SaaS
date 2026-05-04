<?php

declare(strict_types=1);

namespace App\Http\Requests\Invoice;

use App\Models\Invoice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'uuid', 'exists:customers,id'],
            'subscription_id' => ['nullable', 'integer', 'exists:customer_subscriptions,id'],
            'issued_at' => ['nullable', 'date'],
            'due_at' => ['required', 'date', 'after_or_equal:issued_at'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'currency' => ['nullable', 'string', 'size:3'],
            'status' => ['nullable', Rule::in(Invoice::STATUSES)],
            'notes' => ['nullable', 'string', 'max:5000'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['nullable', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.package_id' => ['nullable', 'integer', 'exists:packages,id'],
        ];
    }
}
