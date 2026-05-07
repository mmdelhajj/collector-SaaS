<?php

declare(strict_types=1);

namespace App\Http\Requests\Payment;

use App\Models\Payment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('payments.record') ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'uuid', 'exists:customers,id'],
            'invoice_id' => ['nullable', 'uuid', 'exists:invoices,id'],
            // EITHER {amount, currency} (web admin path) OR {amount_received,
            // currency_received} (mobile path) is acceptable. PaymentRecorder
            // normalizes — see normalizeCurrency(). At least one must be set.
            'amount' => ['required_without:amount_received', 'numeric', 'gt:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'amount_received' => ['nullable', 'numeric', 'gt:0'],
            'currency_received' => ['nullable', 'string', 'size:3'],
            'method' => ['required', Rule::in(Payment::METHODS)],
            'reference_number' => ['nullable', 'string', 'max:120'],
            // Idempotency key for offline-first mobile app. Same UUID on
            // every retry returns the original payment, so a network glitch
            // can't double-charge a customer.
            'client_uuid' => ['nullable', 'uuid'],
            'collected_at' => ['nullable', 'date'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'device_id' => ['nullable', 'string', 'max:64'],
            // Optional proof artifacts captured by the mobile collector app.
            // Photo: a snapshot of cash, the customer holding ID, etc.
            // Signature: a PNG of the customer's on-screen signature.
            'photo' => ['nullable', 'file', 'image', 'max:8192'],
            'signature' => ['nullable', 'file', 'mimes:png,jpg,jpeg', 'max:1024'],
        ];
    }
}
