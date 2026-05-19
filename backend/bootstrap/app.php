<?php

use App\Http\Middleware\EnsureRadiusGateway;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\EnsureTenantContext;
use App\Support\TenantContext;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'tenant' => EnsureTenantContext::class,
            'radius.gateway' => EnsureRadiusGateway::class,
            'super-admin' => EnsureSuperAdmin::class,
        ]);

        // Trust Caddy / Cloudflare so Request::url() reflects the public
        // https://runcollect.com host instead of the internal http://127.0.0.1.
        // Without this, signed URL validation fails because the URL
        // reconstructed at validation time differs from the one signed at
        // generation time.
        $middleware->trustProxies(at: '*', headers: Request::HEADER_X_FORWARDED_FOR
            | Request::HEADER_X_FORWARDED_HOST
            | Request::HEADER_X_FORWARDED_PORT
            | Request::HEADER_X_FORWARDED_PROTO);

        // API-only app — return 401 JSON for unauthenticated requests instead
        // of redirecting to a `route('login')` that doesn't exist. Without
        // this, every protected /api/v1/* endpoint hit without a Bearer token
        // crashes with "Route [login] not defined" and returns 500.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->withSingletons([
        TenantContext::class => TenantContext::class,
    ])
    ->create();
