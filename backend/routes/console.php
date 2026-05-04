<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Wired to isp-saas-scheduler.timer (runs every minute on prod).
Schedule::command('invoices:mark-overdue')
    ->everyThirtyMinutes()
    ->withoutOverlapping()
    ->onOneServer();

Schedule::command('invoices:send-due-reminders')
    ->dailyAt('09:00')
    ->withoutOverlapping()
    ->onOneServer();

// Pull fresh USD-anchored rates from open.er-api.com and update every
// tenant on `exchange_rate_source = 'auto'`. Single API call per day,
// cheap, free.
Schedule::job(new \App\Jobs\RefreshExchangeRatesJob())
    ->dailyAt('06:00')
    ->withoutOverlapping()
    ->onOneServer();
