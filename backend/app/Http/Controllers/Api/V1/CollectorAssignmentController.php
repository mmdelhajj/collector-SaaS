<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Collector\BulkAssignRequest;
use App\Http\Requests\Collector\UpdateAssignmentRequest;
use App\Http\Resources\CollectorAssignmentResource;
use App\Models\CollectorAssignment;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class CollectorAssignmentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) min(max((int) $request->integer('per_page', 25), 1), 100);

        $query = CollectorAssignment::query()
            ->with(['collector', 'invoice.customer', 'invoice.items.package.serviceCategory']);

        if (is_array($filters = $request->input('filter'))) {
            foreach (['status', 'collector_user_id', 'zone'] as $f) {
                if (! empty($filters[$f])) {
                    $query->where($f, $filters[$f]);
                }
            }
            if (! empty($filters['date'])) {
                $query->whereDate('assigned_at', $filters['date']);
            }
        }

        $query->orderBy('priority')
            ->orderBy('route_order')
            ->orderByDesc('assigned_at');

        return CollectorAssignmentResource::collection(
            $query->paginate($perPage)->withQueryString(),
        );
    }

    public function bulkAssign(BulkAssignRequest $request): JsonResponse
    {
        $data = $request->validated();
        $tenantId = $request->user()->tenant_id;

        // Make sure the chosen collector is in this tenant.
        $collector = User::query()
            ->where('id', $data['collector_user_id'])
            ->where('tenant_id', $tenantId)
            ->first();
        if (! $collector) {
            return response()->json(['message' => 'Collector not found in this tenant.'], 422);
        }

        // When `use_order` is on, the input array order controls each new
        // assignment's route_order (1, 2, 3, …) so the collector visits them
        // in that sequence. Priority is also derived from rank so list +
        // priority badges agree.
        $useOrder = (bool) ($data['use_order'] ?? false);

        $invoiceById = Invoice::query()
            ->whereIn('id', $data['invoice_ids'])
            ->whereIn('status', ['open', 'partial', 'overdue'])
            ->get()
            ->keyBy('id');

        $orderedInvoices = collect($data['invoice_ids'])
            ->map(fn ($id) => $invoiceById->get($id))
            ->filter()
            ->values();

        $assigned = 0;
        $skipped = [];

        DB::transaction(function () use (
            $orderedInvoices, $collector, $request, $data, $useOrder, &$assigned, &$skipped
        ) {
            $total = $orderedInvoices->count();
            $bucketSize = max(1, (int) ceil($total / 5));

            foreach ($orderedInvoices as $i => $invoice) {
                $position = $i + 1;

                // Mark any active prior assignment as reassigned.
                CollectorAssignment::query()
                    ->where('invoice_id', $invoice->id)
                    ->whereIn('status', ['pending', 'in_progress'])
                    ->update([
                        'status' => 'reassigned',
                        'updated_at' => now(),
                    ]);

                CollectorAssignment::query()->create([
                    'tenant_id' => $invoice->tenant_id,
                    'collector_user_id' => $collector->id,
                    'invoice_id' => $invoice->id,
                    'assigned_by' => $request->user()->id,
                    'assigned_at' => now(),
                    'status' => 'pending',
                    'priority' => $useOrder
                        ? min(5, (int) ceil($position / $bucketSize))
                        : ($data['priority'] ?? 3),
                    'route_order' => $useOrder ? $position : null,
                    'zone' => $data['zone'] ?? null,
                ]);
                $assigned++;
            }

            $skipped = array_values(array_diff(
                $data['invoice_ids'],
                $orderedInvoices->pluck('id')->all(),
            ));
        });

        return response()->json([
            'assigned' => $assigned,
            'skipped' => count($skipped),
            'skipped_ids' => $skipped,
            'message' => "Assigned {$assigned} invoice(s) to {$collector->name}.",
        ], 201);
    }

    public function show(int $id): CollectorAssignmentResource
    {
        $assignment = CollectorAssignment::query()
            ->with(['collector', 'invoice.customer'])
            ->findOrFail($id);

        return new CollectorAssignmentResource($assignment);
    }

    public function update(UpdateAssignmentRequest $request, int $id): CollectorAssignmentResource
    {
        $assignment = CollectorAssignment::query()->findOrFail($id);

        // Collectors can only update their own assignments. Managers/admins can update any.
        $isOwner = $assignment->collector_user_id === $request->user()->id;
        $canManage = $request->user()->can('collectors.assign');
        if (! $isOwner && ! $canManage) {
            abort(403);
        }

        $data = $request->validated();
        if (($data['status'] ?? null) === 'completed') {
            $data['completed_at'] = now();
        }

        $assignment->update($data);

        return new CollectorAssignmentResource(
            $assignment->fresh(['collector', 'invoice.customer']),
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('collectors.assign')) {
            abort(403);
        }

        $assignment = CollectorAssignment::query()->findOrFail($id);
        $assignment->delete();

        return response()->json(null, 204);
    }
}
