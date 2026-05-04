<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Database\Factories\RadiusSessionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RadiusSession extends Model
{
    /** @use HasFactory<RadiusSessionFactory> */
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'radius_user_id',
        'session_id',
        'nas_ip',
        'nas_port',
        'framed_ip',
        'started_at',
        'updated_at_radius',
        'ended_at',
        'duration_seconds',
        'bytes_in',
        'bytes_out',
        'terminate_cause',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'updated_at_radius' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function radiusUser(): BelongsTo
    {
        return $this->belongsTo(RadiusUser::class);
    }
}
