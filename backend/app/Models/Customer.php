<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Database\Factories\CustomerFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    /** @use HasFactory<CustomerFactory> */
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    public const STATUSES = [
        'prospect',
        'active',
        'suspended',
        'terminated',
        'dormant',
    ];

    protected $fillable = [
        'tenant_id',
        'code',
        'service_category_id',
        'first_name',
        'last_name',
        'national_id',
        'passport',
        'phone_primary',
        'phone_secondary',
        'whatsapp_phone',
        'email',
        'country',
        'city',
        'region',
        'district',
        'neighborhood',
        'address_line',
        'building',
        'floor',
        'apartment',
        'latitude',
        'longitude',
        'location_pin_set_at',
        'location_pin_set_by',
        'status',
        'balance_due',
        'credit_limit',
        'service_started_at',
        'service_ended_at',
        'custom_fields',
        'tags',
        'notes',
        'created_by',
        'assigned_to',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'balance_due' => 'decimal:2',
            'credit_limit' => 'decimal:2',
            'location_pin_set_at' => 'datetime',
            'service_started_at' => 'datetime',
            'service_ended_at' => 'datetime',
            'custom_fields' => 'array',
            'tags' => 'array',
        ];
    }

    /**
     * Auto-fill the per-tenant sequential code (e.g. C-00001) when missing.
     *
     * Implementation note: we read MAX(numeric suffix) from existing rows
     * (including soft-deleted) so codes never repeat. The unique
     * (tenant_id, code) index is the ultimate safety net.
     */
    protected static function booted(): void
    {
        static::creating(function (Customer $customer): void {
            if (! empty($customer->code)) {
                return;
            }
            $tenantId = $customer->tenant_id;
            $maxCode = static::withoutTenant()
                ->withTrashed()
                ->where('tenant_id', $tenantId)
                ->whereNotNull('code')
                ->max('code');
            $next = 1;
            if ($maxCode && preg_match('/(\d+)$/', (string) $maxCode, $m)) {
                $next = ((int) $m[1]) + 1;
            }
            $customer->code = sprintf('C-%05d', $next);
        });
    }

    protected function fullName(): Attribute
    {
        return Attribute::get(fn () => trim("{$this->first_name} {$this->last_name}"));
    }

    public function serviceCategory(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(CustomerSubscription::class);
    }
}
