<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Public-facing receipt verification page.
 *
 * URL: /receipts/{paymentId}?expires=...&signature=...
 *
 * Rendered without auth — this is the page customers land on when they tap
 * the receipt link in their WhatsApp/SMS message. The `signed` middleware
 * verifies an HMAC over the URL + expires timestamp; without a valid
 * signature the request 403s. This prevents enumeration of receipts via
 * UUID guessing and bounds the lifetime so old links eventually stop
 * working.
 *
 * Expiry is configurable per tenant via settings.receipt_link_ttl_days
 * (default 30); SendPaymentReceiptJob calls URL::temporarySignedRoute.
 */
class PublicReceiptController extends Controller
{
    public function show(Request $request, string $paymentId): Response
    {
        // The `signed` middleware on the route already validated the
        // signature — by the time we get here, the URL is authentic and
        // unexpired. Belt-and-braces: also reject requests where the route
        // is mounted without `signed` (defence in depth against future
        // route-config drift).
        if (! $request->hasValidSignature()) {
            abort(403, 'invalid or expired receipt link');
        }

        $payment = Payment::withoutTenant()
            ->with(['customer', 'invoice', 'tenant'])
            ->find($paymentId);

        if (! $payment || ! $payment->tenant) {
            abort(404);
        }

        return response()->view('receipts.public', [
            'payment' => $payment,
            'customer' => $payment->customer,
            'invoice' => $payment->invoice,
            'tenant' => $payment->tenant,
        ]);
    }
}
