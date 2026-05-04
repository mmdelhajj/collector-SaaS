<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

/**
 * Loads SMTP settings the super-admin saved in /super-admin/settings into
 * Laravel's mail config at boot. This way every Mail::send() across the
 * app uses the platform-managed credentials regardless of what's in .env.
 *
 * Skipped during console early boot (migrations etc.) when the
 * platform_settings table may not exist yet.
 */
class PlatformMailServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        try {
            if (! Schema::hasTable('platform_settings')) {
                return;
            }
        } catch (\Throwable) {
            return;
        }

        $smtp = PlatformSetting::get('smtp');
        if (! is_array($smtp) || empty($smtp['host'])) {
            return;
        }

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.mailers.smtp.host' => $smtp['host'],
            'mail.mailers.smtp.port' => (int) ($smtp['port'] ?? 587),
            'mail.mailers.smtp.encryption' => ($smtp['encryption'] ?? 'tls') === 'none'
                ? null
                : $smtp['encryption'],
            'mail.mailers.smtp.username' => $smtp['username'] ?: null,
            'mail.mailers.smtp.password' => $smtp['password'] ?: null,
            'mail.mailers.smtp.timeout' => 15,
        ]);

        if (! empty($smtp['from_address'])) {
            config([
                'mail.from.address' => $smtp['from_address'],
                'mail.from.name' => $smtp['from_name'] ?? 'ISP SaaS',
            ]);
        }
    }
}
