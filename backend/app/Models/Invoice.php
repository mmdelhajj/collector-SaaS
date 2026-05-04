<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    /** @use HasFactory<\Database\Factories\InvoiceFactory> */
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    public const STATUSES = [
        'draft', 'open', 'paid', 'partial', 'overdue', 'cancelled', 'void',
    ];

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'subscription_id',
        'number',
        'issued_at',
        'due_at',
        'period_start',
        'period_end',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total',
        'currency',
        'status',
        'paid_amount',
        'balance_due',
        'paid_at',
        'notes',
        'pdf_path',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'due_at' => 'datetime',
            'period_start' => 'datetime',
            'period_end' => 'datetime',
            'paid_at' => 'datetime',
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'balance_due' => 'decimal:2',
        ];
    }

    /**
     * Generate a per-tenant invoice number scoped to the current year:
     * INV-2026-00001, INV-2026-00002, ...
     */
    protected static function booted(): void
    {
        static::creating(function (Invoice $invoice): void {
            if (! empty($invoice->number)) {
                return;
            }
            $year = ($invoice->issued_at ?? now())->format('Y');
            $tenantId = $invoice->tenant_id;
            $prefix = "INV-{$year}-";

            $maxNumber = static::withoutTenant()
                ->withTrashed()
                ->where('tenant_id', $tenantId)
                ->where('number', 'like', $prefix.'%')
                ->max('number');

            $next = 1;
            if ($maxNumber && preg_match('/(\d+)$/', (string) $maxNumber, $m)) {
                $next = ((int) $m[1]) + 1;
            }
            $invoice->number = $prefix.sprintf('%05d', $next);
        });

        static::saving(function (Invoice $invoice): void {
            // Keep balance_due in sync with total/paid_amount before write.
            $invoice->balance_due = max(
                0,
                round((float) $invoice->total - (float) $invoice->paid_amount, 2),
            );
        });
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(CustomerSubscription::class, 'subscription_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(CollectorAssignment::class);
    }

    /**
     * The currently-active assignment for this invoice (pending or
     * in_progress). Returns null when nothing is on a collector's route.
     */
    public function activeAssignment(): HasOne
    {
        return $this->hasOne(CollectorAssignment::class)
            ->whereIn('status', ['pending', 'in_progress'])
            ->latest('assigned_at');
    }
}
