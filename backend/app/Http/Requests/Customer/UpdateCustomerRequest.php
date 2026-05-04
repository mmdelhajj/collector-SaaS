<?php

declare(strict_types=1);

namespace App\Http\Requests\Customer;

use App\Models\Customer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
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
            'service_category_id' => ['sometimes', 'nullable', 'integer', 'exists:service_categories,id'],
            'first_name' => ['sometimes', 'string', 'max:120'],
            'last_name' => ['sometimes', 'string', 'max:120'],
            'national_id' => ['sometimes', 'nullable', 'string', 'max:64'],
            'passport' => ['sometimes', 'nullable', 'string', 'max:64'],
            'phone_primary' => ['sometimes', 'string', 'max:32'],
            'phone_secondary' => ['sometimes', 'nullable', 'string', 'max:32'],
            'whatsapp_phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'country' => ['sometimes', 'nullable', 'string', 'size:2'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'region' => ['sometimes', 'nullable', 'string', 'max:120'],
            'district' => ['sometimes', 'nullable', 'string', 'max:120'],
            'neighborhood' => ['sometimes', 'nullable', 'string', 'max:120'],
            'address_line' => ['sometimes', 'nullable', 'string', 'max:255'],
            'building' => ['sometimes', 'nullable', 'string', 'max:120'],
            'floor' => ['sometimes', 'nullable', 'string', 'max:16'],
            'apartment' => ['sometimes', 'nullable', 'string', 'max:16'],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'status' => ['sometimes', Rule::in(Customer::STATUSES)],
            'credit_limit' => ['sometimes', 'numeric', 'min:0'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', 'max:64'],
            'custom_fields' => ['sometimes', 'nullable', 'array'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}
