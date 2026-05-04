<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Database\Factories\MessageLogFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class MessageLog extends Model
{
    /** @use HasFactory<MessageLogFactory> */
    use BelongsToTenant, HasFactory;

    protected $table = 'messages_log';

    public const CHANNELS = ['whatsapp', 'sms', 'email'];

    public const STATUSES = ['queued', 'sent', 'delivered', 'read', 'failed'];

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'user_id',
        'channel',
        'template_key',
        'to_address',
        'status',
        'provider',
        'provider_message_id',
        'cost',
        'error',
        'payload',
        'related_type',
        'related_id',
        'sent_at',
        'delivered_at',
        'read_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cost' => 'decimal:4',
            'payload' => 'array',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function related(): MorphTo
    {
        return $this->morphTo();
    }
}
