<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NasDevice extends Model
{
    /** @use HasFactory<\Database\Factories\NasDeviceFactory> */
    use BelongsToTenant, HasFactory;

    public const TYPES = ['mikrotik', 'cisco', 'huawei', 'other'];

    protected $fillable = [
        'tenant_id',
        'name',
        'ip_address',
        'secret',
        'type',
        'coa_port',
        'location',
        'notes',
        'is_active',
        'last_seen_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'secret' => 'encrypted',
            'is_active' => 'boolean',
            'last_seen_at' => 'datetime',
        ];
    }
}
