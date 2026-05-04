<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use App\Support\Audit;
use App\Support\TenantContext;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/**
 * Public password-reset flow.
 *
 *   POST /api/v1/auth/forgot-password   { email }
 *      → emails a signed reset link to the FRONTEND /reset-password page.
 *
 *   POST /api/v1/auth/reset-password    { email, token, password, password_confirmation }
 *      → verifies the token, updates the user's password, revokes all
 *        Sanctum tokens, audits.
 *
 * Always returns a generic "we sent a link if the address matches an
 * account" response so attackers can't enumerate which emails exist.
 */
class ForgotPasswordController extends Controller
{
    private const SEND_RATE = 5;             // sends per window
    private const SEND_DECAY_SECONDS = 900;  // 15 min lockout per email+ip

    public function sendLink(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = strtolower((string) $request->input('email'));
        $key = 'forgot-pw|'.$email.'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, self::SEND_RATE)) {
            // Same generic response — even rate-limited, don't leak that
            // someone has been hammering this email.
            return $this->genericOk();
        }
        RateLimiter::hit($key, self::SEND_DECAY_SECONDS);

        // Look up the user so we can pass the right tenant_id when sending.
        // The notification builds a frontend URL; if no user exists, we
        // simply skip dispatch but still return 200.
        $user = User::query()->where('email', $email)->first();
        if ($user) {
            // Generate a one-time token via the broker (writes to the
            // password_reset_tokens table) and queue the notification.
            $token = Password::broker()->createToken($user);
            $user->notify(new ResetPasswordNotification($token, $email));
        }

        return $this->genericOk();
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'token' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::broker()->reset(
            $data,
            function (User $user, string $newPassword): void {
                $user->forceFill([
                    'password' => Hash::make($newPassword),
                    'remember_token' => Str::random(60),
                    // Wipe 2FA so a stolen device can't keep using it after
                    // a password rotation. User re-enrolls if they want it.
                    'two_factor_enabled' => false,
                    'two_factor_secret' => null,
                    'two_factor_confirmed_at' => null,
                    'two_factor_recovery_codes' => null,
                ])->save();

                // Revoke every active Sanctum token so any device that had
                // an old session is kicked out.
                $user->tokens()->delete();

                // Audit under the user's tenant context (job-style — the
                // request is unauthenticated, so we hop into context).
                $context = app(TenantContext::class);
                $previous = $context->get();
                if ($user->tenant) {
                    $context->set($user->tenant);
                }
                try {
                    Audit::record('user.password_reset_via_email', $user, null, $user->name);
                } finally {
                    if ($previous) {
                        $context->set($previous);
                    } else {
                        $context->clear();
                    }
                }

                Event::dispatch(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            // Token expired, malformed, or doesn't match — return a generic
            // message. Don't tell the attacker which.
            throw ValidationException::withMessages([
                'token' => 'This reset link is invalid or has expired. Request a new one.',
            ]);
        }

        return response()->json(['message' => 'Password updated. You can sign in with your new password.']);
    }

    private function genericOk(): JsonResponse
    {
        return response()->json([
            'message' => 'If that email matches an account, we just sent a reset link.',
        ]);
    }
}
