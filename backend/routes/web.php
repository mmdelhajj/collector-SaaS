<?php

use App\Http\Controllers\PublicInvoiceController;
use App\Http\Controllers\PublicReceiptController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Public receipt verification — landing page for the QR code / receipt URL
// embedded in WhatsApp/SMS messages. The URL is HMAC-signed with an expiry
// (URL::temporarySignedRoute), so customers don't need to log in but UUID
// enumeration / link-replay after expiry are blocked.
Route::get('/receipts/{paymentId}', [PublicReceiptController::class, 'show'])
    ->where('paymentId', '[0-9a-fA-F\-]{36}')
    ->middleware('signed')
    ->name('receipts.public');

// Public invoice viewer — what the QR code on an invoice PDF resolves to.
// Same security model as receipts: HMAC-signed expiring URL.
Route::get('/i/{invoiceId}', [PublicInvoiceController::class, 'show'])
    ->where('invoiceId', '[0-9a-fA-F\-]{36}')
    ->middleware('signed')
    ->name('invoices.public');
