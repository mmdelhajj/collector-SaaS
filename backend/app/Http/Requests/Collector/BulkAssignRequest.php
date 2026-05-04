<?php

declare(strict_types=1);

namespace App\Http\Requests\Collector;

use Illuminate\Foundation\Http\FormRequest;

class BulkAssignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('collectors.assign') ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'collector_user_id' => ['required', 'integer', 'exists:users,id'],
            'invoice_ids' => ['required', 'array', 'min:1', 'max:200'],
            'invoice_ids.*' => ['uuid', 'exists:invoices,id'],
            'priority' => ['nullable', 'integer', 'between:1,5'],
            'zone' => ['nullable', 'string', 'max:120'],
            // When true, the order of `invoice_ids` becomes the route_order
            // (1, 2, 3, …) and priority is derived from rank. When false,
            // all invoices share the supplied `priority` and route_order is
            // left null.
            'use_order' => ['nullable', 'boolean'],
        ];
    }
}
