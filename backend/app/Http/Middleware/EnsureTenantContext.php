<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the active Tenant for the current request and binds it to:
 *   - the per-request TenantContext singleton (used by BelongsToTenant scope)
 *   - Spatie's PermissionRegistrar (so role/permission checks are tenant-scoped)
 *
 * Resolution order:
 *   1. Authenticated user's `tenant_id` (the common case for tenant staff).
 *   2. `X-Tenant-ID` header (super-admin / system-to-system calls).
 *
 * Refuses the request if no tenant can be resolved — this guarantees
 * downstream code never accidentally runs without scope.
 */
class EnsureTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $context = app(TenantContext::class);
        $user = $request->user();

        // 1) Authenticated tenant user — always wins.
        if ($user && $user->tenant_id) {
            $tenant = Tenant::query()->find($user->tenant_id);
            if (! $tenant || $tenant->status === 'suspended') {
                return $this->reject('Tenant is unavailable.', 403);
            }
            $this->bind($context, $tenant);

            return $next($request);
        }

        // 2) X-Tenant-ID header (super-admin or RADIUS/system flows).
        if ($header = $request->header('X-Tenant-ID')) {
            $tenant = Tenant::query()->find($header);
            if (! $tenant) {
                return $this->reject('Unknown tenant.', 404);
            }
            $this->bind($context, $tenant);

            return $next($request);
        }

        return $this->reject('Tenant context is required.', 400);
    }

    private function bind(TenantContext $context, Tenant $tenant): void
    {
        $context->set($tenant);
        // Tell Spatie which "team" (= tenant) to scope role/permission lookups to.
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
    }

    private function reject(string $message, int $status): JsonResponse
    {
        return response()->json(['message' => $message], $status);
    }
}
