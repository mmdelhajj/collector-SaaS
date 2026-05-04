<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Support\Rbac;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Plain class (not a Seeder subclass) so DatabaseSeeder can pass tenant context
 * directly without going through the seeder-call binding machinery.
 *
 * Seeds the global permission catalogue (idempotent), then for the given
 * tenant creates the 8 roles and attaches their permission sets.
 */
class RolesSeeder
{
    public function seedForTenant(string $tenantId): void
    {
        // Permissions are global (not team-scoped) per Spatie's model.
        foreach (Rbac::permissions() as $name) {
            Permission::query()->firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        // Roles ARE team-scoped — set team context to this tenant.
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenantId);

        foreach (Rbac::rolePermissions() as $roleName => $perms) {
            $role = Role::query()->firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'web',
                'tenant_id' => $tenantId,
            ]);

            // Re-sync permissions so a redeploy picks up spec changes.
            $permModels = Permission::query()->whereIn('name', $perms)->get();
            $role->syncPermissions($permModels);
        }
    }
}
