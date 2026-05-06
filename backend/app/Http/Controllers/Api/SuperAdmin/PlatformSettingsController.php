<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class PlatformSettingsController extends Controller
{
    /**
     * Read every platform setting. Secrets are returned as `*****` so the
     * UI can show "on file" state without leaking the value.
     */
    public function index(): JsonResponse
    {
        $smtp = PlatformSetting::get('smtp', []) ?? [];
        $branding = PlatformSetting::get('branding', []) ?? [];
        $defaults = PlatformSetting::get('defaults', []) ?? [];

        return response()->json([
            'data' => [
                'smtp' => [
                    'host' => $smtp['host'] ?? '',
                    'port' => $smtp['port'] ?? 587,
                    'username' => $smtp['username'] ?? '',
                    'password_set' => ! empty($smtp['password']),
                    'encryption' => $smtp['encryption'] ?? 'tls',
                    'from_address' => $smtp['from_address'] ?? '',
                    'from_name' => $smtp['from_name'] ?? '',
                ],
                'branding' => [
                    'platform_name' => $branding['platform_name'] ?? 'RunCollect',
                    'support_email' => $branding['support_email'] ?? '',
                    'logo_url' => $branding['logo_url'] ?? '',
                    'tagline' => $branding['tagline'] ?? '',
                ],
                'defaults' => [
                    'default_trial_days' => (int) ($defaults['default_trial_days'] ?? 14),
                    'default_signup_plan' => $defaults['default_signup_plan'] ?? 'growth',
                    'allow_public_signup' => (bool) ($defaults['allow_public_signup'] ?? true),
                ],
            ],
        ]);
    }

    public function updateSmtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            // Host must be a hostname/IP, NOT an email address. The @ check
            // catches the common mistake of pasting your username (e.g.
            // "user@example.com") into the Host field — Symfony Mailer would
            // try to DNS-resolve it and fail with a confusing getaddrinfo
            // error. Friendlier to reject at form-validation time.
            'host' => [
                'required', 'string', 'max:120',
                'regex:/^[A-Za-z0-9.\-]+$/',
                'not_regex:/@/',
            ],
            'port' => ['required', 'integer', 'between:1,65535'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'encryption' => ['nullable', Rule::in(['tls', 'ssl', 'none'])],
            'from_address' => ['required', 'email', 'max:255'],
            'from_name' => ['required', 'string', 'max:120'],
        ], [
            'host.regex' => 'Host must be a server hostname (e.g. mail.example.com), not an email address. Put the email in Username / From address.',
            'host.not_regex' => 'Host must be a server hostname (e.g. mail.example.com), not an email address. Put the email in Username / From address.',
        ]);

        $existing = PlatformSetting::get('smtp', []) ?? [];
        $merged = [
            'host' => $data['host'],
            'port' => (int) $data['port'],
            'username' => $data['username'] ?? '',
            // Keep existing password when blank — admins type a new value
            // only when rotating, not on every save.
            'password' => ! empty($data['password'])
                ? $data['password']
                : ($existing['password'] ?? ''),
            'encryption' => $data['encryption'] ?? 'tls',
            'from_address' => $data['from_address'],
            'from_name' => $data['from_name'],
        ];

        PlatformSetting::put('smtp', $merged, encrypted: true);

        Audit::record('platform.smtp_updated', null, [
            'host' => $data['host'],
            'from_address' => $data['from_address'],
        ]);

        return $this->index();
    }

    public function updateBranding(Request $request): JsonResponse
    {
        $data = $request->validate([
            'platform_name' => ['required', 'string', 'max:120'],
            'support_email' => ['nullable', 'email', 'max:255'],
            'logo_url' => ['nullable', 'url', 'max:500'],
            'tagline' => ['nullable', 'string', 'max:200'],
        ]);

        PlatformSetting::put('branding', $data);
        Audit::record('platform.branding_updated', null, $data);

        return $this->index();
    }

    public function updateDefaults(Request $request): JsonResponse
    {
        $data = $request->validate([
            'default_trial_days' => ['required', 'integer', 'min:0', 'max:365'],
            'default_signup_plan' => ['required', Rule::in(['starter', 'growth', 'pro'])],
            'allow_public_signup' => ['required', 'boolean'],
        ]);

        PlatformSetting::put('defaults', $data);
        Audit::record('platform.defaults_updated', null, $data);

        return $this->index();
    }

    /**
     * Try to send a test email to whichever address the super-admin types,
     * using the currently-configured SMTP. Returns success or the SMTP error.
     */
    public function testSmtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'to' => ['required', 'email'],
        ]);

        $smtp = PlatformSetting::get('smtp', []) ?? [];
        if (empty($smtp['host'])) {
            return response()->json(['message' => 'SMTP host not set.'], 422);
        }

        // Override Laravel's mail config at runtime so the platform-managed
        // creds are used regardless of what's in .env.
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp' => [
                'transport' => 'smtp',
                'host' => $smtp['host'],
                'port' => (int) $smtp['port'],
                'encryption' => $smtp['encryption'] === 'none' ? null : $smtp['encryption'],
                'username' => $smtp['username'] ?: null,
                'password' => $smtp['password'] ?: null,
                'timeout' => 15,
            ],
            'mail.from.address' => $smtp['from_address'],
            'mail.from.name' => $smtp['from_name'],
        ]);

        try {
            Mail::raw(
                "This is a test email from your RunCollect platform.\n\nIf you received this, SMTP is working.",
                function ($m) use ($data, $smtp) {
                    $m->to($data['to'])
                        ->from($smtp['from_address'], $smtp['from_name'])
                        ->subject('Platform SMTP test');
                },
            );

            return response()->json([
                'ok' => true,
                'message' => "Test email sent to {$data['to']}.",
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
