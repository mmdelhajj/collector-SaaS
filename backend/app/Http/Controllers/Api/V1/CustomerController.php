<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CustomerController extends Controller
{
    private const ALLOWED_SORTS = [
        'created_at', 'updated_at', 'last_name', 'first_name', 'code', 'balance_due',
    ];

    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('customers.view'), 403);

        $perPage = (int) min(max((int) $request->integer('per_page', 25), 1), 100);

        $query = Customer::query();

        // ?filter[status]=active&filter[city]=Tripoli&filter[service_category_id]=2
        if (is_array($filters = $request->input('filter'))) {
            foreach (['status', 'city', 'service_category_id'] as $field) {
                if (! empty($filters[$field])) {
                    $query->where($field, $filters[$field]);
                }
            }
        }

        // ?search=ahmad — name, code, phone, email
        if ($search = $request->string('search')->trim()->toString()) {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
            $query->where(function ($q) use ($like) {
                $q->where('first_name', 'ilike', $like)
                    ->orWhere('last_name', 'ilike', $like)
                    ->orWhere('code', 'ilike', $like)
                    ->orWhere('phone_primary', 'ilike', $like)
                    ->orWhere('email', 'ilike', $like);
            });
        }

        // ?sort=-created_at  /  ?sort=last_name
        $sort = $request->string('sort')->trim()->toString() ?: '-created_at';
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $field = ltrim($sort, '-+');
        if (! in_array($field, self::ALLOWED_SORTS, true)) {
            $field = 'created_at';
            $direction = 'desc';
        }
        $query->orderBy($field, $direction);

        return CustomerResource::collection(
            $query->paginate($perPage)->withQueryString(),
        );
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        abort_unless($request->user()?->can('customers.create'), 403);

        $customer = \App\Support\UniqueRetry::run(fn () => Customer::query()->create(
            [...$request->validated(), 'created_by' => $request->user()?->id]
        ));

        return (new CustomerResource($customer))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $id): CustomerResource
    {
        abort_unless($request->user()?->can('customers.view'), 403);
        $customer = Customer::query()->findOrFail($id);

        return new CustomerResource($customer);
    }

    public function update(UpdateCustomerRequest $request, string $id): CustomerResource
    {
        abort_unless($request->user()?->can('customers.edit'), 403);
        $customer = Customer::query()->findOrFail($id);
        $customer->update($request->validated());

        return new CustomerResource($customer->fresh());
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->can('customers.delete'), 403);
        $customer = Customer::query()->findOrFail($id);
        $label = $customer->full_name ?? $customer->code;
        $customer->delete();

        \App\Support\Audit::record('customer.deleted', $customer, null, $label);

        return response()->json(null, 204);
    }

    /**
     * Aging breakdown of every unpaid invoice for one customer. Same buckets
     * as /reports/aging but scoped to a single customer so the customer page
     * can show a "Total outstanding $X" panel with one-click bulk-assign.
     */
    public function outstanding(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->can('customers.view'), 403);
        $customer = Customer::query()->findOrFail($id);

        $invoices = \App\Models\Invoice::query()
            ->where('customer_id', $customer->id)
            ->whereIn('status', ['open', 'partial', 'overdue'])
            ->where('balance_due', '>', 0)
            ->orderBy('due_at')
            ->get();

        $now = now();
        $buckets = [
            'current' => ['label' => 'Not yet due', 'count' => 0, 'total' => 0.0, 'invoice_ids' => []],
            '1_30' => ['label' => '1–30 days', 'count' => 0, 'total' => 0.0, 'invoice_ids' => []],
            '31_60' => ['label' => '31–60 days', 'count' => 0, 'total' => 0.0, 'invoice_ids' => []],
            '61_90' => ['label' => '61–90 days', 'count' => 0, 'total' => 0.0, 'invoice_ids' => []],
            '90_plus' => ['label' => '90+ days', 'count' => 0, 'total' => 0.0, 'invoice_ids' => []],
        ];

        foreach ($invoices as $inv) {
            $days = $inv->due_at ? $now->diffInDays($inv->due_at, false) : 0;
            // diffInDays returns positive for future, negative for past.
            $overdueDays = $days < 0 ? abs((int) $days) : 0;

            $key = match (true) {
                $days >= 0 => 'current',
                $overdueDays <= 30 => '1_30',
                $overdueDays <= 60 => '31_60',
                $overdueDays <= 90 => '61_90',
                default => '90_plus',
            };
            $buckets[$key]['count']++;
            $buckets[$key]['total'] = round($buckets[$key]['total'] + (float) $inv->balance_due, 2);
            $buckets[$key]['invoice_ids'][] = $inv->id;
        }

        return response()->json([
            'data' => [
                'customer_id' => $customer->id,
                'total_outstanding' => round((float) $invoices->sum('balance_due'), 2),
                'invoice_count' => $invoices->count(),
                'oldest_due_at' => $invoices->first()?->due_at?->toIso8601String(),
                'oldest_overdue_days' => $invoices->first()
                    ? (int) max(0, $now->diffInDays($invoices->first()->due_at, false) * -1)
                    : 0,
                'buckets' => array_values($buckets),
                'all_invoice_ids' => $invoices->pluck('id'),
            ],
        ]);
    }
}
