<?php

declare(strict_types=1);

namespace App\Support\Notifications;

/**
 * Outbound message gateway contract.
 *
 * Implementations:
 *   - LogDriver         — writes to the log file + messages_log; default in dev/local
 *   - TwilioSmsDriver   — real SMS via Twilio
 *   - WhatsAppDriver    — real WhatsApp via 360dialog or Meta WhatsApp Business API
 *
 * Each driver returns a normalised result so callers don't need to care about
 * which provider actually fulfilled the send.
 */
interface MessageGateway
{
    /**
     * @param  array<string, mixed>  $context  Optional metadata (related_type, related_id, etc.)
     */
    public function send(
        string $channel,
        string $toAddress,
        string $body,
        ?string $subject = null,
        array $context = [],
    ): SendResult;
}

final class SendResult
{
    public function __construct(
        public readonly bool $sent,
        public readonly string $provider,
        public readonly ?string $providerMessageId,
        public readonly ?float $cost,
        public readonly ?string $error,
    ) {}

    public static function ok(
        string $provider,
        ?string $providerMessageId = null,
        ?float $cost = null,
    ): self {
        return new self(true, $provider, $providerMessageId, $cost, null);
    }

    public static function failed(string $provider, string $error): self
    {
        return new self(false, $provider, null, null, $error);
    }
}
