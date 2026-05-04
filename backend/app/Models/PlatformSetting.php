<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * Key/value bag for platform-level config. Use the static get/set helpers
 * so callers don't have to know about the encryption flag.
 */
class PlatformSetting extends Model
{
    protected $fillable = ['key', 'value', 'is_encrypted'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['is_encrypted' => 'boolean'];
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $row = static::query()->where('key', $key)->first();
        if (! $row || $row->value === null) {
            return $default;
        }

        $raw = $row->is_encrypted ? Crypt::decryptString($row->value) : $row->value;

        $decoded = json_decode($raw, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $raw;
    }

    public static function put(string $key, mixed $value, bool $encrypted = false): void
    {
        $payload = is_string($value) ? $value : json_encode($value);
        if ($encrypted) {
            $payload = Crypt::encryptString($payload);
        }

        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $payload, 'is_encrypted' => $encrypted],
        );
    }
}
