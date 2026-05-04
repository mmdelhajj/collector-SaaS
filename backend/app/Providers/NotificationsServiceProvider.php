<?php

declare(strict_types=1);

namespace App\Providers;

use App\Support\Notifications\Drivers\LogDriver;
use App\Support\Notifications\Drivers\TwilioSmsDriver;
use App\Support\Notifications\Drivers\WhatsApp360DialogDriver;
use App\Support\Notifications\MessageGateway;
use App\Support\Notifications\MultiChannelGateway;
use Illuminate\Support\ServiceProvider;

/**
 * Wires the notifications stack:
 *   - Each channel (whatsapp, sms, email) gets its own driver.
 *   - Drivers without configured credentials silently fall through to
 *     the log driver, so dev environments work without any setup.
 *   - The composite MultiChannelGateway routes by channel.
 */
class NotificationsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(LogDriver::class);

        $this->app->bind(MessageGateway::class, function ($app) {
            $log = $app->make(LogDriver::class);
            $drivers = [];

            // Twilio for SMS (when SID + token + from are present).
            $sid = config('services.twilio.sid');
            $token = config('services.twilio.token');
            $from = config('services.twilio.from');
            if ($sid && $token && $from) {
                $drivers['sms'] = new TwilioSmsDriver($sid, $token, $from);
            }

            // 360dialog for WhatsApp (when API key is present).
            $apiKey = config('services.360dialog.api_key');
            $apiUrl = config('services.360dialog.api_url')
                ?: 'https://waba.360dialog.io';
            if ($apiKey) {
                $drivers['whatsapp'] = new WhatsApp360DialogDriver($apiKey, $apiUrl);
            }

            return new MultiChannelGateway($drivers, $log);
        });
    }
}
