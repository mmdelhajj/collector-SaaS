<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\MessageTemplate;

class MessageTemplatesSeeder
{
    public function seedForTenant(string $tenantId): void
    {
        $templates = [
            [
                'key' => 'payment_received',
                'channel' => 'whatsapp',
                'locale' => 'en',
                'body' => "*Receipt — {{tenant_name}}*\n\nHi {{customer_name}}, we received your payment of *{{amount}} {{currency}}* for invoice {{invoice_number}}.\n\nFull receipt: {{receipt_url}}\n\nThank you!",
            ],
            [
                'key' => 'payment_received',
                'channel' => 'whatsapp',
                'locale' => 'ar',
                'body' => "*إيصال — {{tenant_name}}*\n\nمرحباً {{customer_name}}، تم استلام دفعتك بمبلغ *{{amount}} {{currency}}* للفاتورة {{invoice_number}}.\n\nالإيصال الكامل: {{receipt_url}}\n\nشكراً لك!",
            ],
            [
                'key' => 'payment_received',
                'channel' => 'sms',
                'locale' => 'en',
                'body' => "{{tenant_name}}: payment of {{amount}} {{currency}} received for invoice {{invoice_number}}. Receipt: {{receipt_url}}",
            ],
            [
                'key' => 'payment_received',
                'channel' => 'sms',
                'locale' => 'ar',
                'body' => "{{tenant_name}}: تم استلام {{amount}} {{currency}} للفاتورة {{invoice_number}}. الإيصال: {{receipt_url}}",
            ],
            [
                'key' => 'payment_received',
                'channel' => 'email',
                'locale' => 'en',
                'subject' => 'Payment received — {{tenant_name}} ({{invoice_number}})',
                'body' => "Hi {{customer_name}},\n\nWe received your payment of {{amount}} {{currency}} for invoice {{invoice_number}}.\nDownload the receipt: {{receipt_url}}\n\nThank you,\n{{tenant_name}}",
            ],
        ];

        foreach ($templates as $row) {
            MessageTemplate::query()->updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'key' => $row['key'],
                    'channel' => $row['channel'],
                    'locale' => $row['locale'],
                ],
                [
                    'subject' => $row['subject'] ?? null,
                    'body' => $row['body'],
                    'is_active' => true,
                ],
            );
        }
    }
}
