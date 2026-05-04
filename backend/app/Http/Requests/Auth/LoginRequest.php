<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ];
    }

    public function deviceName(): string
    {
        $provided = trim((string) $this->input('device_name', ''));

        return $provided !== ''
            ? $provided
            : Str::limit($this->userAgent() ?? 'unknown-device', 80, '');
    }

    public function throttleKey(): string
    {
        return Str::transliterate(
            Str::lower($this->string('email')->toString()).'|'.$this->ip()
        );
    }
}
