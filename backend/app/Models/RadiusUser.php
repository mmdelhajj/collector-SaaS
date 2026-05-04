<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Database\Factories\RadiusUserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RadiusUser extends Model
{
    /** @use HasFactory<RadiusUserFactory> */
    use BelongsToTenant, HasFactory, SoftDeletes;

    public const STATUSES = ['active', 'suspended', 'throttled', 'terminated'];

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'subscription_id',
        'username',
        'password',
        'mac_address',
        'ip_assigned',
        'radius_group',
        'status',
        'data_used_mb_current_period',
        'last_seen_at',
        'last_login_at',
        'last_login_ip',
        'last_login_nas',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'encrypted',
            'data_used_mb_current_period' => 'decimal:2',
            'last_seen_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    protected $hidden = [
        'password',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(CustomerSubscription::class, 'subscription_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(RadiusSession::class);
    }
}
