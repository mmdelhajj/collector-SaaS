<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'notifications' => [
        // 'log' (default) | 'twilio' | '360dialog'
        'driver' => env('NOTIFICATIONS_DRIVER', 'log'),
    ],

    'twilio' => [
        'sid' => env('TWILIO_SID'),
        'token' => env('TWILIO_TOKEN'),
        'from' => env('TWILIO_FROM'),
    ],

    '360dialog' => [
        'api_key' => env('WHATSAPP_API_KEY'),
        'api_url' => env('WHATSAPP_API_URL', 'https://waba.360dialog.io'),
    ],

    'radius' => [
        // Shared secret expected in the X-Radius-Secret header.
        'api_secret' => env('RADIUS_API_SECRET'),
        // Comma-separated IPs / CIDRs allowed to hit /api/radius/*.
        'allowed_ips' => array_filter(array_map(
            'trim',
            explode(',', env('RADIUS_ALLOWED_IPS', '127.0.0.1'))
        )),
        // CoA delivery driver. 'null' = log-only (dev/staging where the box
        // can't actually send UDP/3799 packets to a real NAS); 'radclient' =
        // shell out to the radclient binary. The null driver logs at WARNING
        // when called so monitoring catches "we said we suspended someone
        // but no packet went anywhere" — silent success used to hide this.
        'coa_driver' => env('RADIUS_COA_DRIVER', 'null'),
    ],

];
