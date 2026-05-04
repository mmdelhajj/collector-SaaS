<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+961'.fake()->numerify('#########'),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'locale' => 'en',
            'timezone' => 'Asia/Beirut',
            'is_active' => true,
            'remember_token' => Str::random(10),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn () => ['email_verified_at' => null]);
    }

    public function superAdmin(): static
    {
        return $this->state(fn () => ['tenant_id' => null]);
    }

    public function forTenant(Tenant|string $tenant): static
    {
        $id = $tenant instanceof Tenant ? $tenant->id : $tenant;

        return $this->state(fn () => ['tenant_id' => $id]);
    }

    /**
     * Assign a Spatie role after creation. Convenience for tests so each
     * controller's `can(...)` gate is satisfied without boilerplate. Also
     * lazily seeds the role+permission catalogue for the user's tenant if
     * it hasn't been seeded yet (Spatie roles are team-scoped here).
     */
    public function withRole(string $roleName): static
    {
        return $this->afterCreating(function ($user) use ($roleName): void {
            if ($user->tenant_id) {
                (new RolesSeeder)->seedForTenant((string) $user->tenant_id);
                app(PermissionRegistrar::class)
                    ->setPermissionsTeamId($user->tenant_id);
            }
            $user->assignRole($roleName);
        });
    }
}
