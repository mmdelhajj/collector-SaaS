<?php

use App\Http\Controllers\PublicReceiptController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Public receipt verification — landing page for the QR code / receipt URL
// embedded in WhatsApp/SMS messages. No auth.
Route::get('/receipts/{paymentId}', [PublicReceiptController::class, 'show'])
    ->where('paymentId', '[0-9a-fA-F\-]{36}')
    ->name('receipts.public');
