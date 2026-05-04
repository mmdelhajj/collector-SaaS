<?php

declare(strict_types=1);

namespace App\Support\Notifications;

/**
 * Routes a send call to the channel-specific driver.
 *
 * Each channel ships with its own implementation (Twilio for SMS,
 * 360dialog for WhatsApp). When no driver is configured for a channel —
 * e.g. running locally without Twilio credentials — the registered
 * fallback receives the call (typically the LogDriver, which writes to
 * the application log + messages_log instead of contacting a provider).
 */
class MultiChannelGateway implements MessageGateway
{
    /**
     * @param  array<string, MessageGateway>  $drivers  channel => driver
     */
    public function __construct(
        private array $drivers,
        private MessageGateway $fallback,
    ) {}

    public function send(
        string $channel,
        string $toAddress,
        string $body,
        ?string $subject = null,
        array $context = [],
    ): SendResult {
        $driver = $this->drivers[$channel] ?? $this->fallback;

        return $driver->send($channel, $toAddress, $body, $subject, $context);
    }

    /**
     * For the UI / status panel: which driver is handling each channel?
     *
     * @return array<string, string>
     */
    public function activeDrivers(): array
    {
        $map = [];
        foreach (['whatsapp', 'sms', 'email'] as $channel) {
            $driver = $this->drivers[$channel] ?? $this->fallback;
            $class = (new \ReflectionClass($driver))->getShortName();
            // Trim the "Driver" suffix for nicer display ("LogDriver" → "log").
            $name = preg_replace('/Driver$/', '', $class) ?: $class;
            $map[$channel] = $name;
        }

        return $map;
    }
}
