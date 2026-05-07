<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\Billing\PaymentRecorder;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PaymentController extends Controller
{
    private const ALLOWED_SORTS = [
        'collected_at', 'created_at', 'amount',
    ];

    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('payments.view'), 403);

        $perPage = (int) min(max((int) $request->integer('per_page', 25), 1), 100);

        $query = Payment::query()->with(['customer', 'invoice', 'collector']);

        if (is_array($filters = $request->input('filter'))) {
            foreach (['method', 'status', 'customer_id', 'invoice_id', 'collected_by_user_id'] as $f) {
                if (! empty($filters[$f])) {
                    $query->where($f, $filters[$f]);
                }
            }
            if (! empty($filters['from'])) {
                $query->where('collected_at', '>=', $filters['from']);
            }
            if (! empty($filters['to'])) {
                $query->where('collected_at', '<=', $filters['to']);
            }
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
            $query->where(function ($q) use ($like) {
                $q->where('reference_number', 'ilike', $like)
                    ->orWhereHas('customer', function ($c) use ($like) {
                        $c->where('first_name', 'ilike', $like)
                            ->orWhere('last_name', 'ilike', $like)
                            ->orWhere('code', 'ilike', $like);
                    });
            });
        }

        $sort = $request->string('sort')->trim()->toString() ?: '-collected_at';
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $field = ltrim($sort, '-+');
        if (! in_array($field, self::ALLOWED_SORTS, true)) {
            $field = 'collected_at';
            $direction = 'desc';
        }
        $query->orderBy($field, $direction);

        return PaymentResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function store(StorePaymentRequest $request, PaymentRecorder $recorder): JsonResponse
    {
        abort_unless($request->user()?->can('payments.record'), 403);

        $data = $request->validated();

        // Idempotency: if the client supplies a client_uuid that has been
        // seen before for this tenant, return the original payment instead
        // of creating a new one. The DB also has a partial unique index so
        // a race that bypasses this check still gets caught at INSERT time.
        if (! empty($data['client_uuid'])) {
            $existing = Payment::query()
                ->where('client_uuid', $data['client_uuid'])
                ->with(['customer', 'invoice', 'collector'])
                ->first();
            if ($existing) {
                return (new PaymentResource($existing))
                    ->response()
                    ->setStatusCode(200);
            }
        }

        // Defence: if an invoice is provided, ensure it belongs to the same customer.
        if (! empty($data['invoice_id'])) {
            $invoice = Invoice::query()->find($data['invoice_id']);
            if (! $invoice || $invoice->customer_id !== $data['customer_id']) {
                return response()->json([
                    'message' => 'Invoice does not belong to the selected customer.',
                ], 422);
            }
        }

        // Strip uploaded files from the data array — they're handled below
        // and the Payment model has no `photo` / `signature` mass-assignable
        // attributes (only the *_path string columns).
        unset($data['photo'], $data['signature']);

        $tenantId = $request->user()?->tenant_id;
        $photoPath = null;
        $signaturePath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store(
                "tenants/{$tenantId}/payments/photos",
                'public',
            );
        }
        if ($request->hasFile('signature')) {
            $signaturePath = $request->file('signature')->store(
                "tenants/{$tenantId}/payments/signatures",
                'public',
            );
        }

        $attributes = [
            ...$data,
            'currency' => $data['currency'] ?? 'USD',
            'status' => 'completed',
            'collected_at' => $data['collected_at'] ?? now(),
            'collected_by_user_id' => $request->user()?->id,
        ];
        if ($photoPath !== null) {
            $attributes['photo_path'] = $photoPath;
        }
        if ($signaturePath !== null) {
            $attributes['signature_path'] = $signaturePath;
        }

        $payment = $recorder->record($attributes);
        $payment->load(['customer', 'invoice', 'collector']);

        Audit::record(
            'payment.created',
            $payment,
            ['amount' => (string) $payment->amount, 'currency' => $payment->currency, 'method' => $payment->method],
            $payment->reference_number ?? "Payment #{$payment->id}",
        );

        return (new PaymentResource($payment))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $id): PaymentResource
    {
        abort_unless($request->user()?->can('payments.view'), 403);

        $payment = Payment::query()
            ->with(['customer', 'invoice', 'collector'])
            ->findOrFail($id);

        return new PaymentResource($payment);
    }

    public function refund(Request $request, string $id, PaymentRecorder $recorder): PaymentResource
    {
        abort_unless($request->user()?->can('payments.refund'), 403);

        $payment = Payment::query()->findOrFail($id);
        if ($payment->status !== 'completed') {
            abort(409, 'Only completed payments can be refunded.');
        }

        $original = [
            'amount' => (string) $payment->amount,
            'currency' => $payment->currency,
            'method' => $payment->method,
        ];
        $payment = $recorder->refund($payment);
        $payment->load(['customer', 'invoice', 'collector']);

        Audit::record(
            'payment.refunded',
            $payment,
            $original,
            $payment->reference_number ?? "Payment #{$payment->id}",
        );

        return new PaymentResource($payment);
    }
}
