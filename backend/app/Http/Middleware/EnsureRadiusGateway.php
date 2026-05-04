<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the public RADIUS endpoints.
 *
 * The endpoints are public-facing because FreeRADIUS speaks to them directly
 * via rlm_rest with no user session. Two layers of authentication keep them
 * safe:
 *   1. Source IP must be in RADIUS_ALLOWED_IPS (CIDR-aware).
 *   2. The X-Radius-Secret header must equal RADIUS_API_SECRET.
 *
 * Both must pass. A failure returns 403 with a generic message — never leak
 * which check failed.
 */
class EnsureRadiusGateway
{
    public function handle(Request $request, Closure $next): Response
    {
        $allowed = config('services.radius.allowed_ips', []);
        $secret = config('services.radius.api_secret');

        if (! $secret) {
            return $this->reject('RADIUS gateway not configured.');
        }

        if (! IpUtils::checkIp($request->ip() ?? '', $allowed)) {
            return $this->reject('Forbidden.');
        }

        if (! hash_equals($secret, (string) $request->header('X-Radius-Secret'))) {
            return $this->reject('Forbidden.');
        }

        return $next($request);
    }

    private function reject(string $message): JsonResponse
    {
        return response()->json(['message' => $message], 403);
    }
}
