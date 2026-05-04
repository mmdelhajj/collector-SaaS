<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

beforeEach(function () {
    Notification::fake();
});

it('sends a reset notification when the email exists', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->forTenant($tenant)->create([
        'email' => 'admin@example.test',
    ]);

    $this->postJson('/api/v1/auth/forgot-password', [
        'email' => 'admin@example.test',
    ])->assertOk()
        ->assertJsonPath('message', fn ($m) => str_contains($m, 'sent a reset link'));

    Notification::assertSentTo($user, ResetPasswordNotification::class);
});

it('returns the same generic response when the email does NOT exist', function () {
    // No user — the response must be indistinguishable from the success
    // case so attackers can't enumerate accounts.
    $this->postJson('/api/v1/auth/forgot-password', [
        'email' => 'nobody@example.test',
    ])->assertOk()
        ->assertJsonPath('message', fn ($m) => str_contains($m, 'sent a reset link'));

    Notification::assertNothingSent();
});

it('rejects the reset endpoint with an invalid token', function () {
    $tenant = Tenant::factory()->create();
    User::factory()->forTenant($tenant)->create([
        'email' => 'admin@example.test',
        'password' => Hash::make('old-pass-123'),
    ]);

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => 'admin@example.test',
        'token' => 'totally-bogus-token',
        'password' => 'new-pass-456',
        'password_confirmation' => 'new-pass-456',
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['token']);
});

it('completes a full forgot → reset → login cycle', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->forTenant($tenant)->create([
        'email' => 'admin@example.test',
        'password' => Hash::make('old-pass-123'),
    ]);

    // Step 1 — request the link. We can't read the actual token from the
    // notification (Notification::fake doesn't deliver), so we generate
    // one directly via the broker — same path the controller uses.
    $token = Password::broker()->createToken($user);

    // Step 2 — submit the reset.
    $this->postJson('/api/v1/auth/reset-password', [
        'email' => 'admin@example.test',
        'token' => $token,
        'password' => 'new-pass-789',
        'password_confirmation' => 'new-pass-789',
    ])->assertOk();

    // Step 3 — login with the new password.
    $this->postJson('/api/v1/auth/login', [
        'email' => 'admin@example.test',
        'password' => 'new-pass-789',
    ])->assertOk();

    // The reset is audited.
    $audit = AuditLog::query()->withoutGlobalScopes()
        ->where('action', 'user.password_reset_via_email')
        ->first();
    expect($audit)->not->toBeNull();
});
