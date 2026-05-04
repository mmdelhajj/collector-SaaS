<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Password-reset email. Builds a link to the FRONTEND /reset-password page
 * (not a Laravel route) since this is an API+SPA setup. The token is
 * single-use and expires after the broker's `expire` minutes (60 by
 * default — see config/auth.php passwords.users.expire).
 */
class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $token,
        public string $email,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url', 'http://localhost:3000')), '/');
        $resetUrl = $frontendUrl.'/reset-password?token='.urlencode($this->token).'&email='.urlencode($this->email);

        $expiresMinutes = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);

        return (new MailMessage)
            ->subject('Reset your password')
            ->greeting('Hello,')
            ->line('You requested a password reset. Click the button below to set a new password.')
            ->action('Reset password', $resetUrl)
            ->line("This link will expire in {$expiresMinutes} minutes.")
            ->line('If you did not request a password reset, you can safely ignore this email.');
    }
}
