<?php

declare(strict_types=1);

namespace App\Services\Radius;

use App\Models\NasDevice;
use App\Models\RadiusUser;
use Illuminate\Support\Facades\Log;

/**
 * Sends Change-of-Authorization requests to a NAS so a session policy
 * change (suspension, speed change, reactivation) takes effect immediately
 * instead of waiting for the next reauth.
 *
 * Real CoA travels over UDP/3799 with the NAS's shared secret. In dev we
 * log the intended packet so the rest of the codebase can be verified
 * without requiring `radclient` on the host. Swap the body of `dispatch`
 * for a process call (Symfony Process to `radclient`) when ready.
 */
class CoaService
{
    /**
     * Force the user's session to disconnect (NAS will tear it down and
     * the client reauths immediately, picking up any policy changes).
     */
    public function disconnect(RadiusUser $user): bool
    {
        return $this->dispatch(
            'Disconnect-Request',
            $user,
            ['User-Name' => $user->username],
        );
    }

    /**
     * Update the user's bandwidth profile in flight (no client-side reconnect).
     */
    public function changeRadiusGroup(RadiusUser $user, string $newGroup): bool
    {
        return $this->dispatch(
            'CoA-Request',
            $user,
            [
                'User-Name' => $user->username,
                'Mikrotik-Group' => $newGroup,
            ],
        );
    }

    /**
     * Move the user to a walled-garden VLAN until they pay.
     */
    public function suspend(RadiusUser $user): bool
    {
        return $this->dispatch(
            'CoA-Request',
            $user,
            [
                'User-Name' => $user->username,
                'Mikrotik-Group' => 'suspended',
            ],
        );
    }

    /**
     * @param  array<string, scalar>  $attributes
     */
    private function dispatch(string $packetType, RadiusUser $user, array $attributes): bool
    {
        $nas = NasDevice::query()
            ->where('tenant_id', $user->tenant_id)
            ->where('is_active', true)
            ->orderByDesc('last_seen_at')
            ->first();

        if (! $nas) {
            Log::warning('coa: no active NAS for tenant — request not sent', [
                'tenant_id' => $user->tenant_id,
                'user' => $user->username,
                'packet' => $packetType,
            ]);

            return false;
        }

        $driver = config('services.radius.coa_driver', 'null');

        if ($driver === 'null') {
            // WARNING (not info) — staging/CI shouldn't silently report
            // "RADIUS state changed" when in reality nothing left the box.
            // The original `Log::info('coa: dispatched (stub)')` made this
            // invisible in dashboards. Returning false makes callers fail
            // loud unless they explicitly tolerate the no-op driver.
            Log::warning('coa: driver=null — packet NOT sent, state change is DB-only', [
                'tenant_id' => $user->tenant_id,
                'nas' => $nas->name,
                'nas_ip' => $nas->ip_address,
                'packet' => $packetType,
                'attributes' => $attributes,
            ]);

            return false;
        }

        if ($driver === 'radclient') {
            // PRODUCTION: shell out to radclient via Symfony\Component\Process\Process.
            //   "echo '$attrs' | radclient -x $nas->ip_address:$nas->coa_port $type $secret"
            // Not implemented yet — fail loud so prod doesn't lie either.
            Log::error('coa: radclient driver not yet implemented', [
                'tenant_id' => $user->tenant_id,
                'packet' => $packetType,
            ]);

            return false;
        }

        Log::error('coa: unknown driver', ['driver' => $driver]);

        return false;
    }
}
