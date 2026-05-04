<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Contracts\View\View;
use Symfony\Component\HttpFoundation\Response;

/**
 * Public-facing receipt verification page.
 *
 * URL: /receipts/{paymentId}
 *
 * Rendered without auth — this is the page customers land on when they tap
 * the receipt link in their WhatsApp/SMS message. We return a self-contained
 * HTML page (so it works on any phone) showing the payment summary.
 *
 * To prevent enumeration, future improvement: short-lived signed URL tokens.
 */
class PublicReceiptController extends Controller
{
    public function show(string $paymentId): Response
    {
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
