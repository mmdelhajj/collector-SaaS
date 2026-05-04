<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Models\User;
use App\Support\Audit;
use App\Support\TenantContext;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

/**
 * Writes audit log rows for authentication events. Required by the
 * SECURITY REQUIREMENTS section of CLAUDE.md ("Audit log for: login,
 * payment, invoice cancel, user role change, customer delete, RADIUS
 * suspend/reactivate").
 *
 * Each event needs a tenant context to write under so the audit log
 * appears in the right tenant's history. For login/logout the event's
 * user has a tenant_id (or null for super-admin); we set the context
 * around the record() call. For Failed events the user may be null
 * (unknown email), so we look the user up by email and otherwise audit
 * with tenant=null (super-admin scope) so the row is preserved for
 * forensics.
 */
class LogAuthenticationEvents
{
    public function handleLogin(Login $event): void
    {
        $this->withUserContext($event->user, function () use ($event) {
            // Update last_login_at — the controller used to be the only
            // place this happened, but doing it here keeps it on every
            // login path including future SSO/social-login flows.
            if ($event->user instanceof User) {
                $event->user->forceFill([
                    'last_login_at' => now(),
                    'last_login_ip' => request()->ip(),
                ])->save();
            }

            Audit::record('user.login', $event->user instanceof User ? $event->user : null);
        });
    }

    public function handleLogout(Logout $event): void
    {
        if ($event->user === null) {
            return;
        }
        $this->withUserContext($event->user, function () use ($event) {
            Audit::record('user.logout', $event->user instanceof User ? $event->user : null);
        });
    }

    public function handleFailed(Failed $event): void
    {
        $email = $event->credentials['email'] ?? null;
        $user = $event->user instanceof User
            ? $event->user
            : ($email ? User::query()->where('email', $email)->first() : null);

        $this->withUserContext($user, function () use ($email) {
            Audit::record(
                'user.login_failed',
                null,
                ['email' => $email],
            );
        });
    }

    /**
     * Run a callback with the tenant context populated from $user, then
     * restore. Audit::record() reads the context to set tenant_id on
     * the row.
     */
    private function withUserContext(mixed $user, callable $cb): void
    {
        $context = app(TenantContext::class);
        $previous = $context->get();
        $tenant = null;
        if ($user instanceof User && $user->tenant_id !== null) {
            $tenant = $user->tenant;
        }

        if ($tenant) {
            $context->set($tenant);
        } else {
            $context->clear();
        }
        try {
            $cb();
        } finally {
            if ($previous) {
                $context->set($previous);
            } else {
                $context->clear();
            }
        }
    }
}
