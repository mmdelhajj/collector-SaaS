<?php

declare(strict_types=1);

namespace App\Http\Requests\Collector;

use App\Models\CollectorAssignment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['sometimes', Rule::in(CollectorAssignment::STATUSES)],
            'failure_reason' => ['sometimes', 'nullable', Rule::in(CollectorAssignment::FAILURE_REASONS)],
            'failure_notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'priority' => ['sometimes', 'integer', 'between:1,5'],
            'route_order' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ];
    }
}
