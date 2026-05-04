<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Database\Factories\CashHandoverFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashHandover extends Model
{
    /** @use HasFactory<CashHandoverFactory> */
    use BelongsToTenant, HasFactory;

    public const STATUSES = ['pending', 'confirmed', 'disputed'];

    protected $fillable = [
        'tenant_id',
        'from_user_id',
        'to_user_id',
        'amount',
        'currency',
        'status',
        'photo_path',
        'signature_path',
        'notes',
        'collector_route_id',
        'handed_over_at',
        'confirmed_at',
        'disputed_at',
        'dispute_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'handed_over_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'disputed_at' => 'datetime',
        ];
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(CollectorRoute::class, 'collector_route_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
