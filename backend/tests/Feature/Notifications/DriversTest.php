<?php

declare(strict_types=1);

use App\Support\Notifications\Drivers\TwilioSmsDriver;
use App\Support\Notifications\Drivers\WhatsApp360DialogDriver;
use Illuminate\Support\Facades\Http;

it('Twilio driver sends SMS via the messages endpoint', function () {
    Http::fake([
        'api.twilio.com/*' => Http::response([
            'sid' => 'SM_test_abc123',
            'status' => 'queued',
            'to' => '+96170111222',
        ], 201),
    ]);

    $driver = new TwilioSmsDriver('AC_test_sid', 'token', '+15555550100');
    $result = $driver->send('sms', '+96170111222', 'Receipt for invoice INV-2026-00001');

    expect($result->sent)->toBeTrue();
    expect($result->provider)->toBe('twilio');
    expect($result->providerMessageId)->toBe('SM_test_abc123');

    Http::assertSent(function ($req) {
        return str_contains($req->url(), '/Accounts/AC_test_sid/Messages.json')
            && $req->method() === 'POST'
            && $req['To'] === '+96170111222'
            && $req['From'] === '+15555550100'
            && str_starts_with($req['Body'], 'Receipt for invoice');
    });
});

it('Twilio driver returns failed result on 4xx', function () {
    Http::fake([
        'api.twilio.com/*' => Http::response([
            'message' => 'The To phone number is not valid.',
            'code' => 21211,
        ], 400),
    ]);

    $driver = new TwilioSmsDriver('AC_test_sid', 'token', '+15555550100');
    $result = $driver->send('sms', 'not-a-number', 'hello');

    expect($result->sent)->toBeFalse();
    expect($result->provider)->toBe('twilio');
    expect($result->error)->toContain('phone number is not valid');
});

it('360dialog driver sends WhatsApp text and strips the leading +', function () {
    Http::fake([
        'waba.360dialog.io/*' => Http::response([
            'messages' => [['id' => 'wamid.HBgM_TEST']],
        ], 201),
    ]);

    $driver = new WhatsApp360DialogDriver('test-key', 'https://waba.360dialog.io');
    $result = $driver->send('whatsapp', '+96170111222', 'Hi from the receipt job');

    expect($result->sent)->toBeTrue();
    expect($result->provider)->toBe('360dialog');
    expect($result->providerMessageId)->toBe('wamid.HBgM_TEST');

    Http::assertSent(function ($req) {
        return $req->method() === 'POST'
            && $req->hasHeader('D360-API-KEY', 'test-key')
            && $req['to'] === '96170111222'  // no '+'
            && $req['type'] === 'text'
            && $req['text']['body'] === 'Hi from the receipt job';
    });
});

it('360dialog driver surfaces error title on failure', function () {
    Http::fake([
        'waba.360dialog.io/*' => Http::response([
            'errors' => [['title' => 'Phone number not registered on WhatsApp']],
        ], 422),
    ]);

    $driver = new WhatsApp360DialogDriver('test-key', 'https://waba.360dialog.io');
    $result = $driver->send('whatsapp', '+96170000000', 'hello');

    expect($result->sent)->toBeFalse();
    expect($result->error)->toContain('not registered on WhatsApp');
});
