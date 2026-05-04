<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use App\Support\Rbac;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends Controller
{
    /**
     * Roles whose permissions are LOCKED — owners always have everything,
     * customers always have only the self-service set. Editing them would
     * either be redundant or break the contract baked into the codebase.
     */
    private const LOCKED_ROLES = [Rbac::ROLE_TENANT_OWNER, Rbac::ROLE_CUSTOMER];

    public function index(Request $request): JsonResponse
    {
        $this->ensure();
        $tenantId = $this->tenantId();

        // Make sure Spatie's team context is set so role queries scope right.
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenantId);

        $roles = Role::query()
            ->where('tenant_id', $tenantId)
            ->with('permissions')
            ->get();

        // Map by role name so the UI can render even if a role row is missing.
        $byName = $roles->keyBy('name');

        $payload = collect(Rbac::roles())->map(function (string $name) use ($byName) {
            $role = $byName->get($name);

            return [
                'name' => $name,
                'permissions' => $role ? $role->permissions->pluck('name')->all() : [],
                'editable' => ! in_array($name, self::LOCKED_ROLES, true),
                'description' => Rbac::ROLE_DESCRIPTIONS[$name] ?? null,
            ];
        })->values();

        return response()->json([
            'data' => [
                'roles' => $payload,
                'permissions' => Rbac::permissions(),
            ],
        ]);
    }

    public function update(Request $request, string $name): JsonResponse
    {
        $this->ensure();
        $tenantId = $this->tenantId();

        if (in_array($name, self::LOCKED_ROLES, true)) {
            return response()->json([
                'message' => "The '{$name}' role is built-in and can't be edited.",
            ], 422);
        }
        if (! in_array($name, Rbac::roles(), true)) {
            return response()->json(['message' => 'Unknown role.'], 404);
        }

        $data = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', 'in:'.implode(',', Rbac::permissions())],
        ]);

        app(PermissionRegistrar::class)->setPermissionsTeamId($tenantId);

        $role = Role::query()
            ->where('tenant_id', $tenantId)
            ->where('name', $name)
            ->firstOrFail();

        $perms = Permission::query()->whereIn('name', $data['permissions'])->get();
        $before = $role->permissions->pluck('name')->all();

        $role->syncPermissions($perms);

        // Forget cached permissions so the next request sees the new set.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        Audit::record(
            'role.permissions_updated',
            $role,
            [
                'role' => $name,
                'before' => $before,
                'after' => $perms->pluck('name')->all(),
            ],
            $name,
        );

        return response()->json([
            'data' => [
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->all(),
                'editable' => true,
            ],
        ]);
    }

    private function ensure(): void
    {
        abort_unless(
            request()->user()?->can('roles.manage'),
            403,
            'You do not have permission to manage roles.',
        );
    }

    private function tenantId(): string
    {
        $id = app(TenantContext::class)->id();
        abort_if(! $id, 404, 'Tenant context missing.');

        return $id;
    }
}
