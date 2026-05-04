<?php

declare(strict_types=1);

namespace App\Support\Notifications\Drivers;

use App\Support\Notifications\MessageGateway;
use App\Support\Notifications\SendResult;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * 360dialog WhatsApp Business API driver.
 *
 * Uses the v1 messages endpoint. To send freeform text outside the 24-hour
 * customer-service window you'd use a pre-approved template — that flow
 * lives in a future enhancement; for receipts the customer just paid us
 * so they're inside the window.
 */
class WhatsApp360DialogDriver implements MessageGateway
{
    public function __construct(
        private string $apiKey,
        private string $apiUrl,
    ) {}

    public function send(
        string $channel,
        string $toAddress,
        string $body,
        ?string $subject = null,
        array $context = [],
    ): SendResult {
        $url = rtrim($this->apiUrl, '/').'/v1/messages';
        // 360dialog expects the recipient phone without leading '+'.
        $to = ltrim($toAddress, '+');

        try {
            $response = Http::withHeaders([
                'D360-API-KEY' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])
                ->timeout(15)
                ->post($url, [
                    'recipient_type' => 'individual',
                    'to' => $to,
                    'type' => 'text',
                    'text' => ['body' => $body],
                ]);

            if ($response->failed()) {
                $error = $response->json('errors.0.title')
                    ?? $response->json('message')
                    ?? "HTTP {$response->status()}";

                return SendResult::failed('360dialog', $error);
            }

            $messageId = $response->json('messages.0.id');

            return SendResult::ok(
                provider: '360dialog',
                providerMessageId: is_string($messageId) ? $messageId : null,
                cost: null,
            );
        } catch (\Throwable $e) {
            Log::error('360dialog WhatsApp send failed', [
                'to' => $toAddress,
                'error' => $e->getMessage(),
            ]);

            return SendResult::failed('360dialog', $e->getMessage());
        }
    }
}
