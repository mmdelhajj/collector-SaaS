<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the /super-admin/* API routes. A user is super-admin iff their
 * tenant_id is null. Anyone else gets 404 (not 403) so the existence of
 * the routes isn't even confirmed.
 */
class EnsureSuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || $user->tenant_id !== null) {
            abort(404);
        }

        return $next($request);
    }
}
