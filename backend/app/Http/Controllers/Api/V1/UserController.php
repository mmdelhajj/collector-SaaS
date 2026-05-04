<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\InviteUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('users.manage'), 403);

        $perPage = (int) min(max((int) $request->integer('per_page', 25), 1), 100);

        $query = User::query()
            ->whereNotNull('tenant_id')
            ->where('tenant_id', $request->user()->tenant_id)
            ->with('roles');

        if ($search = $request->string('search')->trim()->toString()) {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'ilike', $like)
                    ->orWhere('email', 'ilike', $like);
            });
        }

        if ($role = $request->string('filter.role')->toString()) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $role));
        }

        if ($request->has('filter.is_active')) {
            $query->where('is_active', filter_var(
                $request->input('filter.is_active'),
                FILTER_VALIDATE_BOOLEAN,
            ));
        }

        $query->orderBy('created_at', 'desc');

        return UserResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function store(InviteUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $generatedPassword = Str::password(16);

        $user = User::query()->create([
            'tenant_id' => $request->user()->tenant_id,
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'locale' => $data['locale'] ?? 'en',
            'timezone' => $request->user()->timezone ?? 'Asia/Beirut',
            'password' => Hash::make($generatedPassword),
            'is_active' => true,
        ]);

        $user->syncRoles([$data['role']]);
        $user->load('roles');

        // In production we'd dispatch an invite email/SMS with a one-time setup
        // link. For now we return the temporary password so the inviter can
        // share it manually via a side channel.
        return response()->json([
            'data' => new UserResource($user),
            'invite' => [
                'temporary_password' => $generatedPassword,
                'message' => 'Share this temporary password with the user via a secure channel.',
            ],
        ], 201);
    }

    public function show(int $id, Request $request): UserResource
    {
        abort_unless($request->user()?->can('users.manage'), 403);

        $user = User::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->with('roles')
            ->findOrFail($id);

        return new UserResource($user);
    }

    public function update(UpdateUserRequest $request, int $id): UserResource
    {
        $user = User::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        $data = $request->validated();
        $role = $data['role'] ?? null;
        unset($data['role']);

        $oldActive = $user->is_active;
        $oldRole = $user->roles->first()?->name;

        $user->update($data);

        if ($role !== null && $role !== $oldRole) {
            $user->syncRoles([$role]);
            Audit::record(
                'user.role_changed',
                $user,
                ['old' => $oldRole, 'new' => $role],
                $user->name,
            );
        }

        if (array_key_exists('is_active', $data) && (bool) $data['is_active'] !== (bool) $oldActive) {
            Audit::record(
                $data['is_active'] ? 'user.reactivated' : 'user.deactivated',
                $user,
                null,
                $user->name,
            );
        }

        return new UserResource($user->fresh('roles'));
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        if (! $request->user()->can('users.manage')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $user = User::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'You cannot deactivate your own account.',
            ], 409);
        }

        $user->update(['is_active' => false]);
        $user->tokens()->delete();

        return response()->json(['data' => new UserResource($user->fresh())]);
    }

    /**
     * Admin-initiated password reset. Generates a fresh temporary password,
     * invalidates all existing API tokens, and clears any 2FA enrolment so
     * the user is forced through the full setup again.
     *
     * Modes:
     *   - body.password absent / empty → generate a random 16-char password
     *   - body.password provided → use it (admin sets a custom value)
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('users.manage')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'password' => ['nullable', 'string', 'min:8', 'max:120'],
        ]);

        $user = User::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        $newPassword = ! empty($data['password'])
            ? $data['password']
            : Str::password(16);

        $user->forceFill([
            'password' => Hash::make($newPassword),
            // Belt-and-suspenders: also wipe 2FA so a compromised account
            // can't lock the legitimate user out.
            'two_factor_enabled' => false,
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ])->save();

        // Revoke every issued token so any active sessions are kicked.
        $user->tokens()->delete();

        Audit::record('user.password_reset', $user, null, $user->name);

        return response()->json([
            'data' => new UserResource($user->fresh('roles')),
            'reset' => [
                'temporary_password' => $newPassword,
                'was_generated' => empty($data['password']),
                'message' => 'Share this with the user via a secure channel — they should change it on first sign-in.',
            ],
        ]);
    }
}
