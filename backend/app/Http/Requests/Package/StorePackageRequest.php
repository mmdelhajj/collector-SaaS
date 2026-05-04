<?php

declare(strict_types=1);

namespace App\Http\Requests\Package;

use App\Models\Package;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePackageRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:120'],
            'code' => ['required', 'string', 'max:64'],
            'description' => ['nullable', 'string', 'max:2000'],
            'service_category_id' => ['nullable', 'integer', 'exists:service_categories,id'],
            'billing_type' => ['required', Rule::in(Package::BILLING_TYPES)],
            'billing_period' => ['required', Rule::in(Package::BILLING_PERIODS)],
            'billing_period_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'setup_fee' => ['nullable', 'numeric', 'min:0'],
            'deposit' => ['nullable', 'numeric', 'min:0'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'speed_down_mbps' => ['nullable', 'integer', 'min:0'],
            'speed_up_mbps' => ['nullable', 'integer', 'min:0'],
            'data_quota_gb' => ['nullable', 'numeric', 'min:0'],
            'amperage' => ['nullable', 'integer', 'min:0', 'max:200'],
            'kwh_included' => ['nullable', 'numeric', 'min:0'],
            'radius_group_name' => ['nullable', 'string', 'max:64'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
