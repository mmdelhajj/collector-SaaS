<?php

declare(strict_types=1);

namespace App\Support\Notifications\Drivers;

use App\Support\Notifications\MessageGateway;
use App\Support\Notifications\SendResult;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Twilio SMS driver.
 *
 * Wires `POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json`
 * — the same call regardless of region or phone number type.
 *
 * Failure modes (network, 4xx) are caught and surfaced as SendResult::failed
 * so the calling job can fall through to the next channel.
 */
class TwilioSmsDriver implements MessageGateway
{
    public function __construct(
        private string $sid,
        private string $token,
        private string $from,
    ) {}

    public function send(
        string $channel,
        string $toAddress,
        string $body,
        ?string $subject = null,
        array $context = [],
    ): SendResult {
        $url = "https://api.twilio.com/2010-04-01/Accounts/{$this->sid}/Messages.json";

        try {
            $response = Http::asForm()
                ->withBasicAuth($this->sid, $this->token)
                ->timeout(15)
                ->post($url, [
                    'From' => $this->from,
                    'To' => $toAddress,
                    'Body' => $body,
                ]);

            if ($response->failed()) {
                $error = $response->json('message') ?? "HTTP {$response->status()}";

                return SendResult::failed('twilio', $error);
            }

            $sid = $response->json('sid');
            // Twilio bills per-segment; price comes back on the message resource
            // a moment later, not on this synchronous response.
            return SendResult::ok(
                provider: 'twilio',
                providerMessageId: is_string($sid) ? $sid : null,
                cost: null,
            );
        } catch (\Throwable $e) {
            Log::error('Twilio SMS send failed', [
                'to' => $toAddress,
                'error' => $e->getMessage(),
            ]);

            return SendResult::failed('twilio', $e->getMessage());
        }
    }
}
