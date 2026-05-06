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
        // request arrives as plain HTTP, so URL::temporarySignedRoute()
        // would emit http:// links — and customers tapping a printed QR
        // would fail signature validation when Cloudflare upgrades them
        // to https://. Force scheme on every generated URL in production.
        if ((bool) env('FORCE_HTTPS', false) || app()->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
