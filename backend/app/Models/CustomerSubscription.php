<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerSubscription extends Model
{
    /** @use HasFactory<\Database\Factories\CustomerSubscriptionFactory> */
    use BelongsToTenant, HasFactory;

    public const STATUSES = ['pending', 'active', 'suspended', 'cancelled'];

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'package_id',
        'status',
        'started_at',
        'current_period_start',
        'current_period_end',
        'auto_renew',
        'price_override',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'auto_renew' => 'boolean',
            'price_override' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }
}
