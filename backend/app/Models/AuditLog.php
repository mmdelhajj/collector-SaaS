<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    public $timestamps = false;

    /**
     * Audit logs intentionally skip the strict BelongsToTenant trait. They
     * legitimately span tenant-scoped events AND platform-level events
     * (super-admin actions on platform settings, where tenant_id is NULL).
     * Reads stay tenant-scoped via TenantScope; writes accept whatever
     * tenant_id the caller passes — Audit::record uses TenantContext->id()
     * which returns null when no tenant context is set.
     */
    protected static function booted(): void
    {
        static::addGlobalScope(new TenantScope);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    protected $fillable = [
        'tenant_id',
        'user_id',
        'action',
        'subject_type',
        'subject_id',
        'subject_label',
        'changes',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
