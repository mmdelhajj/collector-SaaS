<?php

declare(strict_types=1);

namespace App\Http\Requests\Collector;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HandoverRequest extends FormRequest
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
        // The User table has no global tenant scope (super-admins have null
        // tenant_id) so a bare exists:users,id check would let an attacker
        // hand cash off to a user in a DIFFERENT tenant. Constrain.
        $tenantId = $this->user()?->tenant_id;

        return [
            'amount' => ['required', 'numeric', 'gt:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'to_user_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
