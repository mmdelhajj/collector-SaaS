<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Tenant;

/**
 * Per-request singleton holding the active Tenant.
 *
 * Resolved by EnsureTenantContext middleware (from the authenticated user
 * or the X-Tenant-ID header for super-admin / RADIUS endpoints) and consumed
 * by the BelongsToTenant global scope to enforce data isolation.
 */
class TenantContext
{
    private ?Tenant $tenant = null;

    public function set(Tenant $tenant): void
    {
        $this->tenant = $tenant;
    }

    public function clear(): void
    {
        $this->tenant = null;
    }

    public function get(): ?Tenant
    {
        return $this->tenant;
    }

    public function id(): ?string
    {
        return $this->tenant?->id;
    }

    public function isSet(): bool
    {
        return $this->tenant !== null;
    }
}
