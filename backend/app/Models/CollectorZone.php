<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectorZone extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'color',
        'polygon',
        'default_collector_id',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'polygon' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function defaultCollector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'default_collector_id');
    }
}
