<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\MessageTemplate;

/**
 * Resolves a template (per tenant + key + channel + locale) and substitutes
 * `{{variable}}` placeholders with the supplied context.
 *
 * Falls back through:
 *   1. tenant + key + channel + locale (active)
 *   2. tenant + key + channel + 'en'
 *   3. a built-in default for the key (so first-deploy still works)
 *
 * Variable interpolation is intentionally simple — we don't allow Blade or
 * arbitrary PHP. Anything more elaborate goes in the body of a Mailable.
 */
class MessageRenderer
{
    /**
     * @param  array<string, scalar|null>  $vars
     * @return array{body: string, subject: ?string, source: string}
     */
    public function render(
        string $tenantId,
        string $key,
        string $channel,
        string $locale,
        array $vars,
    ): array {
        $template = MessageTemplate::query()
            ->where('tenant_id', $tenantId)
            ->where('key', $key)
            ->where('channel', $channel)
            ->where('locale', $locale)
            ->where('is_active', true)
            ->first();

        $source = "tenant/{$key}/{$channel}/{$locale}";

        if (! $template && $locale !== 'en') {
            $template = MessageTemplate::query()
                ->where('tenant_id', $tenantId)
                ->where('key', $key)
                ->where('channel', $channel)
                ->where('locale', 'en')
                ->where('is_active', true)
                ->first();
            $source = "tenant/{$key}/{$channel}/en";
        }

        $body = $template?->body ?? self::default($key, $channel);
        $subject = $template?->subject;
        if (! $template) {
            $source = "default/{$key}/{$channel}";
        }

        return [
            'body' => $this->interpolate($body, $vars),
            'subject' => $subject ? $this->interpolate($subject, $vars) : null,
            'source' => $source,
        ];
    }

    /**
     * @param  array<string, scalar|null>  $vars
     */
    private function interpolate(string $body, array $vars): string
    {
        foreach ($vars as $name => $value) {
            $body = str_replace('{{'.$name.'}}', (string) ($value ?? ''), $body);
        }

        return $body;
    }

    /**
     * Built-in fallback so the system works on day one before any tenant
     * has customised their templates.
     */
    private static function default(string $key, string $channel): string
    {
        return match ([$key, $channel]) {
            ['payment_received', 'whatsapp'] => "Hello {{customer_name}}, we received your payment of {{amount}} {{currency}} for invoice {{invoice_number}}. Receipt: {{receipt_url}}\n\nThank you!\n— {{tenant_name}}",
            ['payment_received', 'sms'] => '{{tenant_name}}: payment of {{amount}} {{currency}} received for invoice {{invoice_number}}. Receipt: {{receipt_url}}',
            ['payment_received', 'email'] => "Hi {{customer_name}},\n\nWe received your payment of {{amount}} {{currency}} for invoice {{invoice_number}}.\nDownload your receipt here: {{receipt_url}}\n\nThank you,\n{{tenant_name}}",
            default => 'Notification from {{tenant_name}}',
        };
    }
}
