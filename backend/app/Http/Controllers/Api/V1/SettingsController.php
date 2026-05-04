<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\RefreshExchangeRatesJob;
use App\Models\AuditLog;
use App\Models\Tenant;
use App\Support\Audit;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    public function workspace(): JsonResponse
    {
        $tenant = $this->tenant();

        return response()->json([
            'data' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'domain' => $tenant->domain,
                'logo_url' => $tenant->logo_url,
                'primary_color' => $tenant->primary_color,
                'currency_primary' => $tenant->currency_primary,
                'currency_secondary' => $tenant->currency_secondary,
                'exchange_rate' => $tenant->exchange_rate,
                'timezone' => $tenant->timezone,
                'locale' => $tenant->locale,
                'plan' => $tenant->plan,
                'status' => $tenant->status,
            ],
        ]);
    }

    public function updateWorkspace(Request $request): JsonResponse
    {
        $this->authorize('settings.manage');
        $tenant = $this->tenant();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'logo_url' => ['sometimes', 'nullable', 'url', 'max:500'],
            'primary_color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'currency_primary' => ['sometimes', 'string', 'size:3'],
            'currency_secondary' => ['sometimes', 'nullable', 'string', 'size:3'],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'timezone' => ['sometimes', 'string', 'max:64'],
            'locale' => ['sometimes', Rule::in(['ar', 'en', 'fr'])],
        ]);

        $tenant->update($data);

        return $this->workspace();
    }

    public function integrations(): JsonResponse
    {
        $this->authorize('settings.manage');
        $tenant = $this->tenant();
        $settings = $tenant->settings ?? [];

        return response()->json([
            'data' => [
                'whatsapp' => [
                    'provider' => $settings['whatsapp']['provider'] ?? '360dialog',
                    'api_url' => $settings['whatsapp']['api_url'] ?? '',
                    'api_key_set' => ! empty($settings['whatsapp']['api_key']),
                    'from_number' => $settings['whatsapp']['from_number'] ?? '',
                ],
                'sms' => [
                    'provider' => $settings['sms']['provider'] ?? 'twilio',
                    'sid' => $settings['sms']['sid'] ?? '',
                    'token_set' => ! empty($settings['sms']['token']),
                    'from' => $settings['sms']['from'] ?? '',
                ],
                'radius' => [
                    'shared_secret_set' => ! empty($settings['radius']['shared_secret']),
                    'allowed_ips' => $settings['radius']['allowed_ips'] ?? [],
                ],
            ],
        ]);
    }

    public function updateIntegrations(Request $request): JsonResponse
    {
        $this->authorize('settings.manage');
        $tenant = $this->tenant();

        $data = $request->validate([
            'whatsapp.provider' => ['sometimes', 'string', 'max:32'],
            'whatsapp.api_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'whatsapp.api_key' => ['sometimes', 'nullable', 'string', 'max:512'],
            'whatsapp.from_number' => ['sometimes', 'nullable', 'string', 'max:32'],
            'sms.provider' => ['sometimes', 'string', 'max:32'],
            'sms.sid' => ['sometimes', 'nullable', 'string', 'max:128'],
            'sms.token' => ['sometimes', 'nullable', 'string', 'max:128'],
            'sms.from' => ['sometimes', 'nullable', 'string', 'max:32'],
            'radius.shared_secret' => ['sometimes', 'nullable', 'string', 'max:128'],
            'radius.allowed_ips' => ['sometimes', 'array'],
            'radius.allowed_ips.*' => ['string', 'max:64'],
        ]);

        $settings = $tenant->settings ?? [];
        foreach ($data as $section => $values) {
            $settings[$section] = array_replace($settings[$section] ?? [], $values);
        }
        $tenant->update(['settings' => $settings]);

        return $this->integrations();
    }

    public function notifications(): JsonResponse
    {
        $this->authorize('settings.manage');
        $tenant = $this->tenant();
        $settings = $tenant->settings ?? [];
        $n = $settings['notifications'] ?? [];

        return response()->json([
            'data' => [
                'whatsapp_enabled' => (bool) ($n['whatsapp_enabled'] ?? true),
                'sms_enabled' => (bool) ($n['sms_enabled'] ?? true),
                'email_enabled' => (bool) ($n['email_enabled'] ?? false),
                'send_invoice_on_create' => (bool) ($n['send_invoice_on_create'] ?? true),
                'send_receipt_on_payment' => (bool) ($n['send_receipt_on_payment'] ?? true),
                'reminder_days_before' => $n['reminder_days_before'] ?? [5, 2],
                'overdue_days_after' => $n['overdue_days_after'] ?? [1, 3, 7],
                'quiet_hours_start' => $n['quiet_hours_start'] ?? '21:00',
                'quiet_hours_end' => $n['quiet_hours_end'] ?? '08:00',
            ],
        ]);
    }

    public function updateNotifications(Request $request): JsonResponse
    {
        $this->authorize('settings.manage');
        $tenant = $this->tenant();

        $data = $request->validate([
            'whatsapp_enabled' => ['sometimes', 'boolean'],
            'sms_enabled' => ['sometimes', 'boolean'],
            'email_enabled' => ['sometimes', 'boolean'],
            'send_invoice_on_create' => ['sometimes', 'boolean'],
            'send_receipt_on_payment' => ['sometimes', 'boolean'],
            'reminder_days_before' => ['sometimes', 'array'],
            'reminder_days_before.*' => ['integer', 'min:0', 'max:60'],
            'overdue_days_after' => ['sometimes', 'array'],
            'overdue_days_after.*' => ['integer', 'min:0', 'max:120'],
            'quiet_hours_start' => ['sometimes', 'nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'quiet_hours_end' => ['sometimes', 'nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
        ]);

        $settings = $tenant->settings ?? [];
        $settings['notifications'] = array_replace($settings['notifications'] ?? [], $data);
        $tenant->update(['settings' => $settings]);

        return $this->notifications();
    }

    public function payments(): JsonResponse
    {
        $this->authorize('settings.manage');
        $tenant = $this->tenant();
        $settings = $tenant->settings ?? [];
        $p = $settings['payments'] ?? [];

        return response()->json([
            'data' => [
                'handover_methods' => $p['handover_methods'] ?? ['cash'],
                'available_methods' => [
                    'cash', 'whish', 'omt', 'areeba',
                    'card', 'bank_transfer', 'stripe', 'other',
                ],
            ],
        ]);
    }

    public function updatePayments(Request $request): JsonResponse
    {
        $this->authorize('settings.manage');
        $tenant = $this->tenant();

        $data = $request->validate([
            'handover_methods' => ['required', 'array'],
            'handover_methods.*' => [
                'string',
                'in:cash,whish,omt,areeba,card,bank_transfer,stripe,other',
            ],
        ]);

        $settings = $tenant->settings ?? [];
        $settings['payments'] = array_replace(
            $settings['payments'] ?? [],
            ['handover_methods' => array_values(array_unique($data['handover_methods']))],
        );
        $tenant->update(['settings' => $settings]);

        return $this->payments();
    }

    /**
     * Dedicated currency view — same data as the workspace endpoint, but
     * also surfaces rate-change history so admins can see when the rate
     * last moved and by whom. The `/settings/currency` page focuses on
     * just this slice; broader workspace branding edits stay in /workspace.
     */
    public function currency(): JsonResponse
    {
        $this->authorize('settings.manage');
        $tenant = $this->tenant();

        $history = AuditLog::query()
            ->where('action', 'tenant.exchange_rate_updated')
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('created_at')
            ->take(10)
            ->with('user:id,name,email')
            ->get()
            ->map(fn (AuditLog $a) => [
                'created_at' => $a->created_at?->toIso8601String(),
                'old_rate' => $a->changes['old'] ?? null,
                'new_rate' => $a->changes['new'] ?? null,
                'user' => $a->user ? [
                    'id' => $a->user->id,
                    'name' => $a->user->name,
                    'email' => $a->user->email,
                ] : null,
            ]);

        return response()->json([
            'data' => [
                'currency_primary' => $tenant->currency_primary,
                'currency_secondary' => $tenant->currency_secondary,
                'exchange_rate' => $tenant->exchange_rate !== null
                    ? (float) $tenant->exchange_rate
                    : null,
                'exchange_rate_updated_at' => $tenant->exchange_rate_updated_at?->toIso8601String(),
                'exchange_rate_source' => $tenant->exchange_rate_source ?? 'manual',
                'history' => $history,
            ],
        ]);
    }

    public function updateCurrency(Request $request): JsonResponse
    {
        $this->authorize('settings.manage');
        $tenant = $this->tenant();

        $data = $request->validate([
            'currency_primary' => ['sometimes', 'string', 'size:3'],
            'currency_secondary' => ['sometimes', 'nullable', 'string', 'size:3'],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999999'],
            'exchange_rate_source' => ['sometimes', Rule::in(['manual', 'auto'])],
        ]);

        $oldPrimary = $tenant->currency_primary;
        $oldSecondary = $tenant->currency_secondary;
        $oldRate = $tenant->exchange_rate !== null ? (float) $tenant->exchange_rate : null;
        $oldSource = $tenant->exchange_rate_source ?? 'manual';
        $newSource = $data['exchange_rate_source'] ?? $oldSource;

        $newPrimary = $data['currency_primary'] ?? $oldPrimary;
        $newSecondary = array_key_exists('currency_secondary', $data)
            ? $data['currency_secondary']
            : $oldSecondary;
        $currencyChanged = $newPrimary !== $oldPrimary || $newSecondary !== $oldSecondary;

        // If source is flipping (or staying) auto, ignore any manual rate
        // sent in this request — the API will write the canonical value.
        if ($newSource === 'auto' && array_key_exists('exchange_rate', $data)) {
            unset($data['exchange_rate']);
        }

        // The currency pair is changing, so the existing rate is for the old
        // pair and not comparable to whatever comes next. Clear it (auto path
        // will fetch a fresh value below; manual users must re-enter). Without
        // this, the rate audit shows e.g. "old: 89500 LBP, new: 0.85 EUR" —
        // numerically nonsensical and looks like a phantom flip.
        if ($currencyChanged) {
            $data['exchange_rate'] = null;
            $data['exchange_rate_updated_at'] = null;
            $oldRate = null;
        }

        $newRate = array_key_exists('exchange_rate', $data)
            ? ($data['exchange_rate'] !== null ? (float) $data['exchange_rate'] : null)
            : $oldRate;

        $rateChanged = $newSource === 'manual' && $oldRate !== $newRate;
        if ($rateChanged && ! $currencyChanged) {
            $data['exchange_rate_updated_at'] = now();
        }

        $tenant->update($data);

        if ($currencyChanged) {
            Audit::record(
                'tenant.currency_changed',
                $tenant,
                [
                    'old' => ['primary' => $oldPrimary, 'secondary' => $oldSecondary],
                    'new' => ['primary' => $newPrimary, 'secondary' => $newSecondary],
                ],
            );
        }

        if ($rateChanged && ! $currencyChanged) {
            Audit::record(
                'tenant.exchange_rate_updated',
                $tenant,
                ['old' => $oldRate, 'new' => $newRate, 'source' => 'manual'],
            );
        }

        // Switching to auto, or already on auto and the user hits Save —
        // pull fresh rate now so the UI reflects the live value immediately
        // instead of waiting for the daily schedule. The job loads its own
        // fresh model and saves directly; refresh() reconciles the cached
        // TenantContext copy so the response reflects the new rate.
        if ($newSource === 'auto' && $tenant->currency_secondary) {
            (new RefreshExchangeRatesJob(singleTenantId: $tenant->id))->handle();
            $tenant->refresh();
        }

        return $this->currency();
    }

    /**
     * On-demand "Refresh now" — pulls today's rate for this tenant only.
     * Safe to call whether the tenant is on manual or auto; the job records
     * an audit with source=auto either way (since the data came from API).
     */
    public function refreshExchangeRate(): JsonResponse
    {
        $this->authorize('settings.manage');
        $tenant = $this->tenant();

        if (! $tenant->currency_secondary) {
            return response()->json([
                'message' => 'No secondary currency configured — nothing to fetch.',
            ], 422);
        }

        $result = (new RefreshExchangeRatesJob(singleTenantId: $tenant->id))->handle();

        if (! empty($result['errors'])) {
            return response()->json([
                'message' => $result['errors'][0],
            ], 422);
        }

        $tenant->refresh();

        return $this->currency();
    }

    private function tenant(): Tenant
    {
        $tenant = app(TenantContext::class)->get();
        abort_if(! $tenant, 404, 'Tenant not found.');

        return $tenant;
    }

    private function authorize(string $permission): void
    {
        abort_unless(
            request()->user()?->can($permission),
            403,
            'You do not have permission to manage settings.',
        );
    }
}
