<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'price_monthly',
        'price_annual',
        'stripe_price_monthly_id',
        'stripe_price_annual_id',
        'limit_customers',
        'limit_users',
        'limit_collectors',
        'feature_radius',
        'feature_whatsapp',
        'feature_sms',
        'feature_priority_support',
        'is_public',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price_monthly' => 'decimal:2',
            'price_annual' => 'decimal:2',
            'feature_radius' => 'boolean',
            'feature_whatsapp' => 'boolean',
            'feature_sms' => 'boolean',
            'feature_priority_support' => 'boolean',
            'is_public' => 'boolean',
        ];
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }
}
