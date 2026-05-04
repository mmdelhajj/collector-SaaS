<?php

declare(strict_types=1);

namespace App\Support\Notifications\Drivers;

use App\Support\Notifications\MessageGateway;
use App\Support\Notifications\SendResult;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Writes the outbound message to the application log and pretends it shipped.
 *
 * Used in local/dev environments where we don't have real Twilio / 360dialog
 * credentials. Production swaps in TwilioSmsDriver and WhatsAppDriver behind
 * the same interface.
 */
class LogDriver implements MessageGateway
{
    public function send(
        string $channel,
        string $toAddress,
        string $body,
        ?string $subject = null,
        array $context = [],
    ): SendResult {
        Log::channel(config('logging.default'))->info('outbound message (log driver)', [
            'channel' => $channel,
            'to' => $toAddress,
            'subject' => $subject,
            'body_preview' => Str::limit($body, 120),
            'context' => $context,
        ]);

        return SendResult::ok(
            provider: 'log',
            providerMessageId: 'log:'.Str::random(12),
            cost: 0.0,
        );
    }
}
