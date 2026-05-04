<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'has_avatar' => ! empty($this->avatar_path),
            // Cache buster for the avatar — clients append `?v=...` so the
            // image refreshes after upload/remove without a hard reload.
            'avatar_version' => $this->avatar_path ? (string) $this->updated_at?->getTimestamp() : null,
            'locale' => $this->locale,
            'timezone' => $this->timezone,
            'is_active' => (bool) $this->is_active,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'roles' => $this->roles?->pluck('name')->all() ?? [],
            'permissions' => $this->whenLoaded(
                'permissions',
                fn () => $this->getAllPermissions()->pluck('name')->all(),
            ),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
