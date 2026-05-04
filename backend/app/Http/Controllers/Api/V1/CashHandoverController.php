<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CashHandoverResource;
use App\Models\CashHandover;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CashHandoverController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) min(max((int) $request->integer('per_page', 25), 1), 100);

        $query = CashHandover::query()->with([
            'collector',
            'supervisor',
            'payments.customer',
            'payments.invoice',
        ]);

        if (is_array($filters = $request->input('filter'))) {
            foreach (['status', 'from_user_id', 'to_user_id'] as $f) {
                if (! empty($filters[$f])) {
                    $query->where($f, $filters[$f]);
                }
            }
        }

        $query->orderByDesc('handed_over_at');

        return CashHandoverResource::collection(
            $query->paginate($perPage)->withQueryString(),
        );
    }

    public function show(int $id): CashHandoverResource
    {
        $handover = CashHandover::query()
            ->with(['collector', 'supervisor', 'payments.customer', 'payments.invoice'])
            ->findOrFail($id);

        return new CashHandoverResource($handover);
    }

    /**
     * Supervisor confirms receipt of cash from the collector.
     * Requires `collectors.assign` (= manager+) — the same permission used
     * for assignment management.
     */
    public function confirm(Request $request, int $id): CashHandoverResource
    {
        if (! $request->user()->can('collectors.assign')) {
            abort(403);
        }

        $handover = CashHandover::query()->findOrFail($id);
        if ($handover->status !== 'pending') {
            abort(409, 'Only pending handovers can be confirmed.');
        }

        $handover->update([
            'status' => 'confirmed',
            'to_user_id' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        Audit::record(
            'handover.confirmed',
            $handover,
            ['amount' => (string) $handover->amount],
            "Handover #{$handover->id}",
        );

        return new CashHandoverResource(
            $handover->fresh()->load(['collector', 'supervisor', 'payments.customer', 'payments.invoice']),
        );
    }

    /**
     * Supervisor flags a discrepancy. Captures a reason so it surfaces in
     * audit + reports.
     */
    public function dispute(Request $request, int $id): CashHandoverResource
    {
        if (! $request->user()->can('collectors.assign')) {
            abort(403);
        }

        $request->validate([
            'reason' => ['required', 'string', 'max:5000'],
        ]);

        $handover = CashHandover::query()->findOrFail($id);
        if ($handover->status !== 'pending') {
            abort(409, 'Only pending handovers can be disputed.');
        }

        $handover->update([
            'status' => 'disputed',
            'to_user_id' => $request->user()->id,
            'disputed_at' => now(),
            'dispute_reason' => $request->input('reason'),
        ]);

        Audit::record(
            'handover.disputed',
            $handover,
            [
                'amount' => (string) $handover->amount,
                'reason' => $request->input('reason'),
            ],
            "Handover #{$handover->id}",
        );

        return new CashHandoverResource(
            $handover->fresh()->load(['collector', 'supervisor', 'payments.customer', 'payments.invoice']),
        );
    }

    /**
     * Resolve a disputed handover — for example, the missing cash was found
     * or the collector deposited the difference. Records who resolved it
     * and a final amount adjustment so the audit trail stays clean.
     */
    public function resolve(Request $request, int $id): CashHandoverResource
    {
        if (! $request->user()->can('collectors.assign')) {
            abort(403);
        }

        $request->validate([
            'resolution' => ['required', 'string', 'max:2000'],
            'final_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $handover = CashHandover::query()->findOrFail($id);
        if ($handover->status !== 'disputed') {
            abort(409, 'Only disputed handovers can be resolved.');
        }

        $update = [
            'status' => 'confirmed',
            'confirmed_at' => now(),
            'dispute_reason' => trim(
                ($handover->dispute_reason ?? '').
                "\n\n[Resolved by {$request->user()->name} at ".now()->toIso8601String().']: '.
                $request->input('resolution'),
            ),
        ];
        if ($request->filled('final_amount')) {
            $update['amount'] = $request->input('final_amount');
        }
        $handover->update($update);

        Audit::record(
            'handover.resolved',
            $handover,
            [
                'resolution' => $request->input('resolution'),
                'final_amount' => $request->input('final_amount'),
            ],
            "Handover #{$handover->id}",
        );

        return new CashHandoverResource(
            $handover->fresh()->load(['collector', 'supervisor', 'payments.customer', 'payments.invoice']),
        );
    }
}
