<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ticket extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    public const TYPES = ['install', 'repair', 'disconnect', 'support'];

    public const STATUSES = ['open', 'scheduled', 'in_progress', 'done', 'cancelled'];

    public const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'number',
        'type',
        'priority',
        'status',
        'assigned_to_user_id',
        'title',
        'description',
        'scheduled_at',
        'completed_at',
        'check_in_lat',
        'check_in_lng',
        'check_in_at',
        'photos',
        'signature_path',
        'materials_used',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'completed_at' => 'datetime',
            'check_in_at' => 'datetime',
            'check_in_lat' => 'decimal:7',
            'check_in_lng' => 'decimal:7',
            'photos' => 'array',
            'materials_used' => 'array',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }
}
