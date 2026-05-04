<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    /** @use HasFactory<\Database\Factories\PaymentFactory> */
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    public const METHODS = [
        'cash', 'card', 'bank_transfer', 'whish', 'omt', 'areeba', 'stripe', 'other',
    ];

    public const STATUSES = ['pending', 'completed', 'failed', 'refunded'];

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'invoice_id',
        'amount',
        'currency',
        'amount_received',
        'currency_received',
        'exchange_rate_used',
        'method',
        'reference_number',
        'client_uuid',
        'status',
        'collected_by_user_id',
        'cash_handover_id',
        'collected_at',
        'latitude',
        'longitude',
        'photo_path',
        'signature_path',
        'voice_note_path',
        'notes',
        'receipt_sent_at',
        'receipt_channels',
        'device_id',
        'is_synced',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'amount_received' => 'decimal:2',
            'exchange_rate_used' => 'decimal:6',
            'collected_at' => 'datetime',
            'receipt_sent_at' => 'datetime',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'receipt_channels' => 'array',
            'is_synced' => 'boolean',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by_user_id');
    }

    public function cashHandover(): BelongsTo
    {
        return $this->belongsTo(CashHandover::class);
    }
}
