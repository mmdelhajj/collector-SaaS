<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Package extends Model
{
    /** @use HasFactory<\Database\Factories\PackageFactory> */
    use BelongsToTenant, HasFactory, SoftDeletes;

    public const BILLING_TYPES = ['recurring', 'prepaid', 'postpaid', 'usage_based'];

    public const BILLING_PERIODS = ['monthly', 'quarterly', 'annual', 'custom_days'];

    protected $fillable = [
        'tenant_id',
        'service_category_id',
        'name',
        'code',
        'description',
        'billing_type',
        'billing_period',
        'billing_period_days',
        'price',
        'currency',
        'setup_fee',
        'deposit',
        'tax_rate',
        'speed_down_mbps',
        'speed_up_mbps',
        'data_quota_gb',
        'amperage',
        'kwh_included',
        'radius_group_name',
        'is_active',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'setup_fee' => 'decimal:2',
            'deposit' => 'decimal:2',
            'tax_rate' => 'decimal:3',
            'data_quota_gb' => 'decimal:2',
            'kwh_included' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function serviceCategory(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(CustomerSubscription::class);
    }
}
