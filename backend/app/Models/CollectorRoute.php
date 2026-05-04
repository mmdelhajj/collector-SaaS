<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CollectorRoute extends Model
{
    /** @use HasFactory<\Database\Factories\CollectorRouteFactory> */
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'collector_user_id',
        'date',
        'started_at',
        'ended_at',
        'start_latitude',
        'start_longitude',
        'end_latitude',
        'end_longitude',
        'total_collected',
        'distance_km',
        'gps_track',
        'last_latitude',
        'last_longitude',
        'last_ping_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'start_latitude' => 'decimal:7',
            'start_longitude' => 'decimal:7',
            'end_latitude' => 'decimal:7',
            'end_longitude' => 'decimal:7',
            'total_collected' => 'decimal:2',
            'distance_km' => 'decimal:2',
            'gps_track' => 'array',
            'last_latitude' => 'decimal:7',
            'last_longitude' => 'decimal:7',
            'last_ping_at' => 'datetime',
        ];
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collector_user_id');
    }

    public function handovers(): HasMany
    {
        return $this->hasMany(CashHandover::class);
    }
}
