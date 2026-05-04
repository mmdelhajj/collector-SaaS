<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\User\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use PragmaRX\Google2FA\Google2FA;
use Spatie\Permission\PermissionRegistrar;

class AuthController extends Controller
{
    private const MAX_ATTEMPTS = 5;
    private const DECAY_SECONDS = 900; // 15 min lockout

    public function login(LoginRequest $request): JsonResponse
    {
        $key = $request->throttleKey();

        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => __('auth.throttle', ['seconds' => $seconds]),
            ])->status(429);
        }

        $user = User::query()->where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            RateLimiter::hit($key, self::DECAY_SECONDS);
            Event::dispatch(new Failed('web', $user, [
                'email' => $request->string('email'),
            ]));
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        // 2FA challenge: if the user has TOTP enabled, require a valid code
        // before issuing a Sanctum token.
        if ($user->two_factor_enabled) {
            $code = (string) $request->input('two_factor_code', '');
            $recovery = (string) $request->input('recovery_code', '');

            $g2fa = app(Google2FA::class);
            $codeOk = strlen($code) === 6 && $g2fa->verifyKey((string) $user->two_factor_secret, $code);

            $recoveryOk = false;
            if (! $codeOk && $recovery !== '') {
                $codes = $user->two_factor_recovery_codes ?? [];
                $idx = array_search(strtoupper($recovery), $codes, true);
                if ($idx !== false) {
                    unset($codes[$idx]);
                    $user->forceFill([
                        'two_factor_recovery_codes' => array_values($codes),
                    ])->save();
                    $recoveryOk = true;
                }
            }

            if (! $codeOk && ! $recoveryOk) {
                RateLimiter::hit($key, self::DECAY_SECONDS);
                throw ValidationException::withMessages([
                    'two_factor_code' => 'two_factor_required',
                ])->status(422);
            }
        }

        RateLimiter::clear($key);
        Event::dispatch(new Login('sanctum', $user, false));

        $token = $user->createToken(
            $request->deviceName(),
            ['*'],
            now()->addDays(30),
        );

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at?->toIso8601String(),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        // /auth/me lives outside the `tenant` middleware (super-admins
        // can hit it too), so set Spatie's team context manually before
        // loading the user's tenant-scoped roles.
        if ($user->tenant_id) {
            app(PermissionRegistrar::class)->setPermissionsTeamId($user->tenant_id);
        }
        $user->load('roles');
        $tenant = $user->tenant_id ? \App\Models\Tenant::query()->find($user->tenant_id) : null;

        return response()->json([
            'user' => new UserResource($user),
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'plan' => $tenant->plan,
                'status' => $tenant->status,
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                'subscription_ends_at' => $tenant->subscription_ends_at?->toIso8601String(),
            ] : null,
        ]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if (isset($data['password'])) {
            if (! Hash::check($data['current_password'] ?? '', $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => __('auth.password'),
                ]);
            }
            $user->password = $data['password'];
        }
        unset($data['password'], $data['current_password']);

        $user->fill($data);
        $user->save();

        return response()->json([
            'user' => new UserResource($user->fresh('roles')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();
        if ($token) {
            Event::dispatch(new Logout('sanctum', $request->user()));
            $token->delete();
        }

        return response()->json(['message' => 'logged_out']);
    }

    private const AVATAR_DISK = 'avatars';
    private const AVATAR_MAX_KB = 2048;

    /**
     * Upload (or replace) the authenticated user's avatar. Stores under
     * `avatars/{user_id}.{ext}` on the configured `avatars` disk and saves
     * the relative path in users.avatar_path.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:'.self::AVATAR_MAX_KB,
                'dimensions:max_width=2000,max_height=2000',
            ],
        ]);

        $user = $request->user();
        $file = $request->file('avatar');
        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = $user->id.'_'.Str::random(8).'.'.$ext;

        // Remove the previous file if any so we don't accumulate orphans.
        $disk = Storage::disk(self::AVATAR_DISK);
        if ($user->avatar_path && $disk->exists($user->avatar_path)) {
            $disk->delete($user->avatar_path);
        }

        $disk->putFileAs('', $file, $filename);
        $user->avatar_path = $filename;
        $user->save();

        return response()->json([
            'user' => new UserResource($user->fresh('roles')),
        ]);
    }

    public function deleteAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->avatar_path) {
            $disk = Storage::disk(self::AVATAR_DISK);
            if ($disk->exists($user->avatar_path)) {
                $disk->delete($user->avatar_path);
            }
            $user->avatar_path = null;
            $user->save();
        }

        return response()->json([
            'user' => new UserResource($user->fresh('roles')),
        ]);
    }

    /**
     * Stream the authenticated user's avatar bytes back to the client.
     * Frontend proxies this through its own /api/avatar/me route so the
     * browser sees a same-origin image URL.
     */
    public function showAvatar(Request $request): StreamedResponse
    {
        $user = $request->user();
        if (! $user->avatar_path) {
            abort(404);
        }
        $disk = Storage::disk(self::AVATAR_DISK);
        if (! $disk->exists($user->avatar_path)) {
            abort(404);
        }
        $mime = $disk->mimeType($user->avatar_path) ?: 'image/jpeg';

        return $disk->response($user->avatar_path, null, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=300',
        ]);
    }
}
