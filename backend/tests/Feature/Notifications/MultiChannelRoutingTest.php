<?php

declare(strict_types=1);

use App\Support\Notifications\Drivers\TwilioSmsDriver;
use App\Support\Notifications\Drivers\WhatsApp360DialogDriver;
use App\Support\Notifications\MessageGateway;
use Illuminate\Support\Facades\Http;

it('routes whatsapp via 360dialog when its key is configured', function () {
    config([
        'services.360dialog.api_key' => 'test-key',
        'services.360dialog.api_url' => 'https://waba.360dialog.io',
        'services.twilio.sid' => null,
    ]);
    // Re-bind so the provider re-reads config.
    app()->forgetInstance(MessageGateway::class);
    Http::fake([
        'waba.360dialog.io/*' => Http::response([
            'messages' => [['id' => 'wamid.X']],
        ], 201),
    ]);

    $gateway = app(MessageGateway::class);
    $r = $gateway->send('whatsapp', '+96170111111', 'hi');

    expect($r->sent)->toBeTrue();
    expect($r->provider)->toBe('360dialog');
});

it('routes sms via Twilio when its credentials are configured', function () {
    config([
        'services.twilio.sid' => 'AC_test',
        'services.twilio.token' => 'tok',
        'services.twilio.from' => '+15555550100',
        'services.360dialog.api_key' => null,
    ]);
    app()->forgetInstance(MessageGateway::class);
    Http::fake([
        'api.twilio.com/*' => Http::response(['sid' => 'SM_X', 'status' => 'queued'], 201),
    ]);

    $gateway = app(MessageGateway::class);
    $r = $gateway->send('sms', '+96170111111', 'hi');

    expect($r->sent)->toBeTrue();
    expect($r->provider)->toBe('twilio');
});

it('falls through to the log driver when no provider is configured', function () {
    config([
        'services.twilio.sid' => null,
        'services.360dialog.api_key' => null,
    ]);
    app()->forgetInstance(MessageGateway::class);

    $gateway = app(MessageGateway::class);
    $r = $gateway->send('sms', '+96170111111', 'hi');

    expect($r->sent)->toBeTrue();
    expect($r->provider)->toBe('log');
});
