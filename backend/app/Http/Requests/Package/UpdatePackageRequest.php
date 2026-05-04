<?php

declare(strict_types=1);

namespace App\Http\Requests\Package;

use App\Models\Package;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePackageRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:120'],
            'code' => ['sometimes', 'string', 'max:64'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'service_category_id' => ['sometimes', 'nullable', 'integer', 'exists:service_categories,id'],
            'billing_type' => ['sometimes', Rule::in(Package::BILLING_TYPES)],
            'billing_period' => ['sometimes', Rule::in(Package::BILLING_PERIODS)],
            'billing_period_days' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:3650'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'setup_fee' => ['sometimes', 'numeric', 'min:0'],
            'deposit' => ['sometimes', 'numeric', 'min:0'],
            'tax_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'speed_down_mbps' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'speed_up_mbps' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'data_quota_gb' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'amperage' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:200'],
            'kwh_included' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'radius_group_name' => ['sometimes', 'nullable', 'string', 'max:64'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
