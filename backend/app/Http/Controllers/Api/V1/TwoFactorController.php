<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $u = $request->user();

        return response()->json([
            'data' => [
                'enabled' => (bool) $u->two_factor_enabled,
                'confirmed_at' => $u->two_factor_confirmed_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Step 1 of enrolment: generate a fresh secret and return a QR-code SVG
     * the user can scan with Google Authenticator / Authy / 1Password.
     */
    public function enroll(Request $request, Google2FA $g2fa): JsonResponse
    {
        $u = $request->user();
        $tenant = $u->tenant;
        $issuer = $tenant?->name ?? 'ISP SaaS';

        $secret = $g2fa->generateSecretKey();
        $u->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_enabled' => false,
            'two_factor_confirmed_at' => null,
        ])->save();

        $otpauth = $g2fa->getQRCodeUrl($issuer, $u->email, $secret);

        $renderer = new ImageRenderer(new RendererStyle(220), new SvgImageBackEnd);
        $qrSvg = (new Writer($renderer))->writeString($otpauth);

        return response()->json([
            'data' => [
                'secret' => $secret,
                'otpauth_url' => $otpauth,
                'qr_svg' => $qrSvg,
            ],
        ]);
    }

    /**
     * Step 2: user types a code from their authenticator app — we verify and
     * flip the flag, also generating recovery codes.
     */
    public function confirm(Request $request, Google2FA $g2fa): JsonResponse
    {
        $u = $request->user();
        $request->validate([
            'code' => ['required', 'string', 'size:6', 'regex:/^\d{6}$/'],
        ]);

        if (! $u->two_factor_secret) {
            return response()->json(['message' => 'No enrolment in progress.'], 422);
        }

        $valid = $g2fa->verifyKey($u->two_factor_secret, (string) $request->input('code'));
        if (! $valid) {
            return response()->json(['message' => 'Code is invalid or expired.'], 422);
        }

        $codes = collect(range(1, 8))->map(fn () => Str::upper(Str::random(10)))->all();
        $u->forceFill([
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $codes,
        ])->save();

        Audit::record('user.2fa_enabled', $u, null, $u->name);

        return response()->json([
            'data' => [
                'enabled' => true,
                'recovery_codes' => $codes,
            ],
        ]);
    }

    public function disable(Request $request, Google2FA $g2fa): JsonResponse
    {
        $u = $request->user();

        // Re-auth required: a stolen Sanctum token must not be enough to
        // turn off 2FA. Accept either the user's password OR a current TOTP
        // code. If 2FA is already off (idempotency), allow without re-auth.
        if ($u->two_factor_enabled) {
            $request->validate([
                'password' => ['nullable', 'string'],
                'code' => ['nullable', 'string', 'size:6', 'regex:/^\d{6}$/'],
            ]);

            $password = (string) $request->input('password', '');
            $code = (string) $request->input('code', '');

            $passwordOk = $password !== '' && Hash::check($password, (string) $u->password);
            $codeOk = $code !== '' && $u->two_factor_secret
                && $g2fa->verifyKey((string) $u->two_factor_secret, $code);

            if (! $passwordOk && ! $codeOk) {
                throw ValidationException::withMessages([
                    'password' => 'Re-authentication required to disable 2FA. Provide your current password or a TOTP code.',
                ]);
            }
        }

        $u->forceFill([
            'two_factor_enabled' => false,
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ])->save();

        Audit::record('user.2fa_disabled', $u, null, $u->name);

        return response()->json(['data' => ['enabled' => false]]);
    }
}
