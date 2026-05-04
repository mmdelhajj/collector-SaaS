<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Cross-tenant model: super-admin queries it across every tenant for the
 * approval queue. Intentionally NOT BelongsToTenant — global scope would
 * hide rows from the super-admin who has no tenant context. Reads from
 * inside a tenant context filter manually with where('tenant_id', ...).
 */
class PlanChangeRequest extends Model
{
    use HasFactory;

    public const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

    protected $fillable = [
        'tenant_id',
        'requested_plan_id',
        'requested_period',
        'current_plan_code',
        'current_period',
        'status',
        'requester_note',
        'decision_note',
        'requested_by_user_id',
        'decided_by_user_id',
        'decided_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'decided_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function requestedPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'requested_plan_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by_user_id');
    }
}
