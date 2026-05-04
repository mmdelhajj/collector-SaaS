<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Database\Factories\CollectorAssignmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CollectorAssignment extends Model
{
    /** @use HasFactory<CollectorAssignmentFactory> */
    use BelongsToTenant, HasFactory, SoftDeletes;

    public const STATUSES = [
        'pending', 'in_progress', 'completed', 'failed', 'reassigned',
    ];

    public const FAILURE_REASONS = [
        'customer_not_home', 'refused', 'partial_payment', 'dispute', 'other',
    ];

    protected $fillable = [
        'tenant_id',
        'collector_user_id',
        'invoice_id',
        'assigned_by',
        'assigned_at',
        'status',
        'completed_at',
        'failure_reason',
        'failure_notes',
        'voice_note_path',
        'priority',
        'zone',
        'route_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'completed_at' => 'datetime',
            'priority' => 'integer',
            'route_order' => 'integer',
        ];
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collector_user_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
