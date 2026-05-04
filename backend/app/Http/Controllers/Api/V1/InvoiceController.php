<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Invoice\StoreInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Services\Billing\InvoiceGenerator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class InvoiceController extends Controller
{
    private const ALLOWED_SORTS = [
        'issued_at', 'due_at', 'total', 'balance_due', 'created_at', 'number',
    ];

    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('invoices.view'), 403);

        $perPage = (int) min(max((int) $request->integer('per_page', 25), 1), 100);

        $query = Invoice::query()->with([
            'customer',
            'items.package.serviceCategory',
            'activeAssignment.collector',
        ]);

        if (is_array($filters = $request->input('filter'))) {
            foreach (['status', 'customer_id'] as $field) {
                if (! empty($filters[$field])) {
                    $query->where($field, $filters[$field]);
                }
            }
            if (! empty($filters['service_category_id'])) {
                $query->whereHas('items.package', fn ($q) => $q->where(
                    'service_category_id',
                    $filters['service_category_id'],
                ));
            }
            if (! empty($filters['overdue'])) {
                $query->where('status', '!=', 'paid')
                    ->where('balance_due', '>', 0)
                    ->where('due_at', '<', now());
            }
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
            $query->where(function ($q) use ($like) {
                $q->where('number', 'ilike', $like)
                    ->orWhereHas('customer', function ($c) use ($like) {
                        $c->where('first_name', 'ilike', $like)
                            ->orWhere('last_name', 'ilike', $like)
                            ->orWhere('code', 'ilike', $like);
                    });
            });
        }

        $sort = $request->string('sort')->trim()->toString() ?: '-issued_at';
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $field = ltrim($sort, '-+');
        if (! in_array($field, self::ALLOWED_SORTS, true)) {
            $field = 'issued_at';
            $direction = 'desc';
        }
        $query->orderBy($field, $direction);

        return InvoiceResource::collection(
            $query->paginate($perPage)->withQueryString(),
        );
    }

    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        abort_unless($request->user()?->can('invoices.create'), 403);

        $data = $request->validated();
        $items = $data['items'];
        unset($data['items']);

        $invoice = \App\Support\UniqueRetry::run(fn () => DB::transaction(function () use ($data, $items) {
            $subtotal = 0.0;
            $tax = 0.0;

            $invoice = Invoice::query()->create([
                ...$data,
                'issued_at' => $data['issued_at'] ?? now(),
                'subtotal' => 0,
                'tax_amount' => 0,
                'total' => 0,
                'paid_amount' => 0,
            ]);

            foreach ($items as $row) {
                $qty = (float) ($row['quantity'] ?? 1);
                $unit = (float) $row['unit_price'];
                $rate = (float) ($row['tax_rate'] ?? 0);
                $line = round($qty * $unit, 2);
                $lineTax = round($line * ($rate / 100), 2);

                InvoiceItem::query()->create([
                    'invoice_id' => $invoice->id,
                    'package_id' => $row['package_id'] ?? null,
                    'description' => $row['description'],
                    'quantity' => $qty,
                    'unit_price' => $unit,
                    'tax_rate' => $rate,
                    'total' => $line,
                ]);

                $subtotal += $line;
                $tax += $lineTax;
            }

            $invoice->update([
                'subtotal' => round($subtotal, 2),
                'tax_amount' => round($tax, 2),
                'total' => round($subtotal + $tax, 2),
            ]);

            return $invoice->fresh(['items', 'customer']);
        }));

        return (new InvoiceResource($invoice))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $id): InvoiceResource
    {
        abort_unless($request->user()?->can('invoices.view'), 403);

        $invoice = Invoice::query()
            ->with(['items', 'customer'])
            ->findOrFail($id);

        return new InvoiceResource($invoice);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->can('invoices.cancel'), 403);

        $invoice = Invoice::query()->findOrFail($id);
        if ($invoice->paid_amount > 0) {
            return response()->json([
                'message' => 'Cannot delete an invoice that has received payment. Cancel it instead.',
            ], 409);
        }
        $label = $invoice->number;
        $invoice->delete();

        \App\Support\Audit::record('invoice.cancelled', $invoice, null, $label);

        return response()->json(null, 204);
    }

    /**
     * Bulk-generate this month's invoices for every active subscription.
     */
    public function generateBulk(Request $request, InvoiceGenerator $generator): JsonResponse
    {
        abort_unless($request->user()?->can('invoices.create'), 403);

        $summary = $generator->runMonthlyBillingForCurrentTenant();

        return response()->json([
            'generated' => $summary['generated'],
            'skipped' => $summary['skipped'],
            'total_amount' => $summary['total_amount'],
            'message' => "Generated {$summary['generated']} invoice(s) for the current period.",
        ]);
    }

    /**
     * Stream a printable PDF of the invoice.
     */
    public function pdf(Request $request, string $id): Response
    {
        abort_unless($request->user()?->can('invoices.view'), 403);

        $invoice = Invoice::query()
            ->with(['items', 'customer', 'tenant'])
            ->findOrFail($id);

        $pdf = Pdf::loadView('invoices.pdf', [
            'invoice' => $invoice,
            'tenant' => $invoice->tenant,
            'customer' => $invoice->customer,
            'items' => $invoice->items,
        ])->setPaper('a4');

        return $pdf->stream("invoice-{$invoice->number}.pdf");
    }
}
