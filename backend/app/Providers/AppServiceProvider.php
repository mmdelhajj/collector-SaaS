<?php

namespace App\Providers;

use App\Listeners\LogAuthenticationEvents;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Audit-log every authentication event. CLAUDE.md SECURITY
        // REQUIREMENTS mandates audit on login, and we capture failed
        // logins + logout as well for forensics.
        Event::listen(Login::class, [LogAuthenticationEvents::class, 'handleLogin']);
        Event::listen(Logout::class, [LogAuthenticationEvents::class, 'handleLogout']);
        Event::listen(Failed::class, [LogAuthenticationEvents::class, 'handleFailed']);

        // We sit behind Caddy/Cloudflare which terminate TLS. The internal
        // request arrives as plain HTTP from 127.0.0.1, so without forcing
        // both scheme + root URL, signed URLs would be generated for
        // http://127.0.0.1:8000 and customers scanning a printed QR would
        // get a broken link. Anchor every URL to APP_URL in production so
        // the same signed link works whether generation is triggered by an
        // authenticated browser request or a Next.js server-side fetch.
        if ((bool) env('FORCE_HTTPS', false) || app()->environment('production')) {
            URL::forceScheme('https');

            $appUrl = config('app.url');
            if (is_string($appUrl) && $appUrl !== '' && $appUrl !== 'http://localhost') {
                URL::forceRootUrl($appUrl);
            }
        }
    }
}
