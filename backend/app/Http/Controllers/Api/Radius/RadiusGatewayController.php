<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Radius;

use App\Http\Controllers\Controller;
use App\Models\RadiusSession;
use App\Models\RadiusUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoints called BY FreeRADIUS via rlm_rest. These are public-facing
 * (gated by the radius.gateway middleware: IP allowlist + shared secret)
 * because RADIUS doesn't carry a Sanctum bearer.
 *
 * The expected payload shape is FreeRADIUS rlm_rest's default JSON. The
 * response shape on authorize is the standard control/reply object.
 */
class RadiusGatewayController extends Controller
{
    /**
     * Decide whether to accept this user. Status of `active` → Accept with
     * the radius_group's reply attributes; anything else → reject.
     */
    public function authorize(Request $request): JsonResponse
    {
        $username = (string) $request->input('username');
        $tenantId = (string) $request->input('tenant_id', '');

        $query = RadiusUser::withoutTenant()->where('username', $username);
        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }
        $user = $query->first();

        if (! $user) {
            return response()->json(['message' => 'unknown user'], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'control' => ['Auth-Type' => 'Reject'],
                'reply' => ['Reply-Message' => "Account {$user->status}"],
            ], 401);
        }

        // Optional: PAP password check. With CHAP/MS-CHAP FreeRADIUS does
        // crypto with the cleartext-equivalent we return below.
        $providedPassword = $request->input('password');
        if ($providedPassword !== null && $providedPassword !== $user->password) {
            return response()->json([
                'control' => ['Auth-Type' => 'Reject'],
                'reply' => ['Reply-Message' => 'invalid password'],
            ], 401);
        }

        $reply = ['Mikrotik-Group' => $user->radius_group ?? 'default'];
        // Vendor-specific rate-limit example. In production we'd derive the
        // string from the package definition.
        if ($user->radius_group) {
            $reply['Mikrotik-Rate-Limit'] = match (true) {
                str_contains($user->radius_group, '200') => '200M/100M',
                str_contains($user->radius_group, '100') => '100M/50M',
                str_contains($user->radius_group, '50') => '50M/25M',
                str_contains($user->radius_group, '25') => '25M/10M',
                default => '10M/5M',
            };
        }

        return response()->json([
            'control' => [
                'Auth-Type' => 'Accept',
                'Cleartext-Password' => $user->password,
            ],
            'reply' => $reply,
        ]);
    }

    /**
     * RADIUS Accounting — Start, Interim-Update, Stop. We log the session and
     * keep the user's `last_seen_at` and bytes counters fresh.
     */
    public function accounting(Request $request): JsonResponse
    {
        $type = $request->input('acct_status_type'); // Start | Interim-Update | Stop
        $username = (string) $request->input('username');
        $tenantId = (string) $request->input('tenant_id', '');
        $sessionId = (string) $request->input('session_id', '');

        $query = RadiusUser::withoutTenant()->where('username', $username);
        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }
        $user = $query->first();

        if (! $user) {
            return response()->json(['message' => 'unknown user'], 200);
        }

        $bytesIn = (int) $request->input('bytes_in', 0);
        $bytesOut = (int) $request->input('bytes_out', 0);

        $attributes = [
            'tenant_id' => $user->tenant_id,
            'radius_user_id' => $user->id,
            'session_id' => $sessionId ?: 'unknown-'.now()->timestamp,
            'nas_ip' => $request->input('nas_ip'),
            'nas_port' => $request->input('nas_port'),
            'framed_ip' => $request->input('framed_ip'),
            'bytes_in' => $bytesIn,
            'bytes_out' => $bytesOut,
        ];

        if ($type === 'Start') {
            RadiusSession::query()->updateOrCreate(
                ['tenant_id' => $user->tenant_id, 'session_id' => $attributes['session_id']],
                [...$attributes, 'started_at' => now()],
            );
            $user->update([
                'last_seen_at' => now(),
                'last_login_at' => now(),
                'last_login_ip' => $request->input('framed_ip'),
                'last_login_nas' => $request->input('nas_ip'),
            ]);
        } elseif ($type === 'Interim-Update') {
            RadiusSession::query()
                ->where('tenant_id', $user->tenant_id)
                ->where('session_id', $attributes['session_id'])
                ->update([
                    'bytes_in' => $bytesIn,
                    'bytes_out' => $bytesOut,
                    'updated_at_radius' => now(),
                ]);
            $user->update(['last_seen_at' => now()]);
        } elseif ($type === 'Stop') {
            $session = RadiusSession::query()
                ->where('tenant_id', $user->tenant_id)
                ->where('session_id', $attributes['session_id'])
                ->first();
            if ($session) {
                $session->update([
                    'ended_at' => now(),
                    'duration_seconds' => $session->started_at
                        ? (int) abs($session->started_at->diffInSeconds(now()))
                        : null,
                    'bytes_in' => $bytesIn,
                    'bytes_out' => $bytesOut,
                    'terminate_cause' => $request->input('terminate_cause'),
                ]);
            }
            $user->update(['last_seen_at' => now()]);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Optional post-auth log endpoint. We just ack — heavyweight processing
     * stays in accounting.
     */
    public function postAuth(Request $request): JsonResponse
    {
        return response()->json(['ok' => true]);
    }
}
