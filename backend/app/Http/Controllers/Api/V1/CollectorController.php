<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Collector\CheckInRequest;
use App\Http\Requests\Collector\HandoverRequest;
use App\Http\Resources\CashHandoverResource;
use App\Http\Resources\CollectorAssignmentResource;
use App\Http\Resources\CollectorRouteResource;
use App\Models\CashHandover;
use App\Models\CollectorAssignment;
use App\Models\CollectorRoute;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Audit;
use App\Support\Rbac;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Self-service endpoints for the authenticated collector.
 *
 * These are the routes the Flutter mobile app talks to all day. They never
 * accept a `collector_user_id` parameter — the user is always the
 * authenticated user, scoped to their tenant.
 */
class CollectorController extends Controller
{
    /**
     * Today's assigned, in-progress, completed, and failed invoices for me.
     */
    public function myAssignments(Request $request): AnonymousResourceCollection
    {
        $userId = $request->user()->id;
        $date = $request->date('date') ?? now()->startOfDay();

        $query = CollectorAssignment::query()
            ->where('collector_user_id', $userId)
            ->whereDate('assigned_at', $date)
            ->with(['invoice.customer'])
            ->orderBy('priority')
            ->orderBy('route_order')
            ->orderBy('assigned_at');

        return CollectorAssignmentResource::collection(
            $query->paginate(100)->withQueryString(),
        );
    }

    /**
     * Summary of my collection performance — today, this week, this month.
     */
    public function myStats(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $today = now()->startOfDay();
        $thisWeek = now()->startOfWeek();
        $thisMonth = now()->startOfMonth();

        $assignmentCounts = function (Carbon $since) use ($userId) {
            return CollectorAssignment::query()
                ->where('collector_user_id', $userId)
                ->where('assigned_at', '>=', $since)
                ->selectRaw('status, COUNT(*) AS count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->all();
        };

        $collected = function (Carbon $since) use ($userId) {
            return (float) Payment::query()
                ->where('collected_by_user_id', $userId)
                ->where('status', 'completed')
                ->where('collected_at', '>=', $since)
                ->sum('amount');
        };

        return response()->json([
            'today' => [
                'collected' => round($collected($today), 2),
                'assignments' => $assignmentCounts($today),
            ],
            'this_week' => [
                'collected' => round($collected($thisWeek), 2),
                'assignments' => $assignmentCounts($thisWeek),
            ],
            'this_month' => [
                'collected' => round($collected($thisMonth), 2),
                'assignments' => $assignmentCounts($thisMonth),
            ],
        ]);
    }

    /**
     * Today's payments recorded by the authenticated collector — used by the
     * web `/my-route` page to show "what I've collected today" alongside the
     * assignment list.
     */
    public function myPayments(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $tenant = $request->user()->tenant;
        $handoverMethods = $this->handoverMethods($tenant);
        $since = now()->startOfDay();

        $payments = Payment::query()
            ->with(['customer', 'invoice'])
            ->where('collected_by_user_id', $userId)
            ->where('status', 'completed')
            ->where('collected_at', '>=', $since)
            ->orderByDesc('collected_at')
            ->limit(50)
            ->get();

        // Per-tenant routing decides whether each payment is "in collector's
        // hands" (needs handover) or "direct to company".
        $rows = $payments->map(function ($p) use ($handoverMethods) {
            $routing = in_array($p->method, $handoverMethods, true)
                ? 'in_hand'
                : 'direct';

            return [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'currency' => $p->currency,
                'method' => $p->method,
                'collected_at' => $p->collected_at?->toIso8601String(),
                'reference_number' => $p->reference_number,
                'notes' => $p->notes,
                'routing' => $routing,
                'handed_over' => $p->cash_handover_id !== null,
                'invoice' => $p->invoice
                    ? [
                        'id' => $p->invoice->id,
                        'number' => $p->invoice->number,
                    ]
                    : null,
                'customer' => $p->customer
                    ? [
                        'id' => $p->customer->id,
                        'code' => $p->customer->code,
                        'full_name' => $p->customer->full_name,
                    ]
                    : null,
            ];
        });

        $totals = [
            'in_hand' => round((float) $payments->whereIn('method', $handoverMethods)->sum('amount'), 2),
            'direct' => round((float) $payments->whereNotIn('method', $handoverMethods)->sum('amount'), 2),
            'all' => round((float) $payments->sum('amount'), 2),
        ];

        return response()->json([
            'data' => $rows,
            'totals' => $totals,
            'handover_methods' => $handoverMethods,
        ]);
    }

    /**
     * Start the collector's day. Idempotent — if a route exists for today,
     * returns it unchanged.
     */
    public function checkIn(CheckInRequest $request): CollectorRouteResource
    {
        $route = CollectorRoute::query()->firstOrCreate(
            [
                'tenant_id' => $request->user()->tenant_id,
                'collector_user_id' => $request->user()->id,
                'date' => now()->toDateString(),
            ],
            [
                'started_at' => now(),
                'start_latitude' => $request->input('latitude'),
                'start_longitude' => $request->input('longitude'),
            ],
        );

        return new CollectorRouteResource($route->load('collector'));
    }

    /**
     * Close the day's route, computing total_collected from completed payments.
     */
    public function checkOut(CheckInRequest $request): CollectorRouteResource
    {
        $route = CollectorRoute::query()
            ->where('collector_user_id', $request->user()->id)
            ->where('date', now()->toDateString())
            ->firstOrFail();

        // Sum completed payments that haven't yet been bundled into a handover
        // (best-effort — refining this requires payment→handover linkage).
        $totalCollected = (float) Payment::query()
            ->where('collected_by_user_id', $request->user()->id)
            ->where('status', 'completed')
            ->whereDate('collected_at', $route->date)
            ->sum('amount');

        $route->update([
            'ended_at' => now(),
            'end_latitude' => $request->input('latitude'),
            'end_longitude' => $request->input('longitude'),
            'total_collected' => $totalCollected,
        ]);

        return new CollectorRouteResource($route->fresh()->load('collector'));
    }

    /**
     * GPS ping from the mobile app — updates the last known location and
     * appends to the route's gps_track jsonb. Bounded so a misbehaving client
     * can't blow up the column.
     */
    public function ping(Request $request): JsonResponse
    {
        $data = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $route = CollectorRoute::query()->firstOrCreate(
            [
                'tenant_id' => $request->user()->tenant_id,
                'collector_user_id' => $request->user()->id,
                'date' => now()->toDateString(),
            ],
            [
                'started_at' => now(),
                'start_latitude' => $data['latitude'],
                'start_longitude' => $data['longitude'],
            ],
        );

        $track = $route->gps_track ?? [];
        $track[] = [
            'lat' => $data['latitude'],
            'lng' => $data['longitude'],
            'at' => now()->toIso8601String(),
        ];
        // Bound at 1000 points — drop oldest if exceeded.
        if (count($track) > 1000) {
            $track = array_slice($track, -1000);
        }

        $route->update([
            'last_latitude' => $data['latitude'],
            'last_longitude' => $data['longitude'],
            'last_ping_at' => now(),
            'gps_track' => $track,
        ]);

        return response()->json(['ok' => true]);
    }

    /**
     * Default — only physical cash needs a handover. Whish/OMT/Areeba/card
     * are typically routed straight to the company wallet so they DON'T
     * pass through the collector. A tenant whose business model differs can
     * override via `settings.payments.handover_methods`.
     */
    private const DEFAULT_HANDOVER_METHODS = ['cash'];

    /**
     * Methods that need a physical handover for the active tenant. Reads
     * the override set in /settings/payments, falls back to the default.
     *
     * @return list<string>
     */
    private function handoverMethods(Tenant $tenant): array
    {
        $override = $tenant->settings['payments']['handover_methods'] ?? null;
        if (is_array($override) && count($override) > 0) {
            return array_values(array_filter($override, 'is_string'));
        }

        return self::DEFAULT_HANDOVER_METHODS;
    }

    /**
     * Returns the funds the collector is currently holding — payments using
     * methods that this tenant treats as "passes through the collector".
     */
    public function pendingCash(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $tenant = $request->user()->tenant;
        $methods = $this->handoverMethods($tenant);

        $unbundled = Payment::query()
            ->with(['customer', 'invoice'])
            ->where('collected_by_user_id', $userId)
            ->where('status', 'completed')
            ->whereIn('method', $methods)
            ->whereNull('cash_handover_id')
            ->orderBy('collected_at')
            ->get();

        return response()->json([
            'data' => [
                'expected_amount' => round((float) $unbundled->sum('amount'), 2),
                'currency' => 'USD',
                'count' => $unbundled->count(),
                'breakdown_by_method' => $unbundled
                    ->groupBy('method')
                    ->map(fn ($group) => [
                        'count' => $group->count(),
                        'total' => round((float) $group->sum('amount'), 2),
                    ]),
                'payments' => $unbundled->map(fn ($p) => [
                    'id' => $p->id,
                    'amount' => (float) $p->amount,
                    'method' => $p->method,
                    'collected_at' => $p->collected_at?->toIso8601String(),
                    'customer' => $p->customer
                        ? ['code' => $p->customer->code, 'full_name' => $p->customer->full_name]
                        : null,
                    'invoice' => $p->invoice
                        ? ['number' => $p->invoice->number]
                        : null,
                ]),
            ],
        ]);
    }

    /**
     * Active users in this tenant that a collector can hand cash to —
     * owners, admins, managers, and accountants. Stripped down to id/name
     * so the collector mobile picker doesn't need broader user access.
     */
    public function supervisors(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $allowed = [
            Rbac::ROLE_TENANT_OWNER,
            Rbac::ROLE_TENANT_ADMIN,
            Rbac::ROLE_MANAGER,
            Rbac::ROLE_ACCOUNTANT,
        ];

        $users = User::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->where('id', '!=', $request->user()->id)
            ->whereHas('roles', fn ($q) => $q->whereIn('name', $allowed))
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return response()->json([
            'data' => $users->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ]),
        ]);
    }

    /**
     * Hand cash over to a supervisor. Creates a CashHandover with status
     * `pending`, links every unbundled cash payment from this collector to
     * it (so supervisor can audit later) and writes an audit-log entry.
     */
    public function handover(HandoverRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        $tenant = $request->user()->tenant;
        $methods = $this->handoverMethods($tenant);

        $route = CollectorRoute::query()
            ->where('collector_user_id', $userId)
            ->where('date', now()->toDateString())
            ->first();

        $tenantId = $request->user()->tenant_id;
        $photoPath = null;
        $signaturePath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store(
                "tenants/{$tenantId}/handovers/photos",
                'public',
            );
        }
        if ($request->hasFile('signature')) {
            $signaturePath = $request->file('signature')->store(
                "tenants/{$tenantId}/handovers/signatures",
                'public',
            );
        }

        $handover = DB::transaction(function () use (
            $request,
            $userId,
            $route,
            $methods,
            $photoPath,
            $signaturePath,
        ) {
            $h = CashHandover::query()->create([
                'tenant_id' => $request->user()->tenant_id,
                'from_user_id' => $userId,
                'to_user_id' => $request->input('to_user_id'),
                'amount' => $request->input('amount'),
                'currency' => $request->input('currency', 'USD'),
                'status' => 'pending',
                'notes' => $request->input('notes'),
                'photo_path' => $photoPath,
                'signature_path' => $signaturePath,
                'collector_route_id' => $route?->id,
                'handed_over_at' => now(),
            ]);

            // Sweep every unbundled payment for the tenant's configured
            // handover methods so the supervisor can audit the bundle.
            Payment::query()
                ->where('collected_by_user_id', $userId)
                ->where('status', 'completed')
                ->whereIn('method', $methods)
                ->whereNull('cash_handover_id')
                ->update(['cash_handover_id' => $h->id]);

            return $h;
        });

        Audit::record(
            'handover.submitted',
            $handover,
            ['amount' => (string) $handover->amount, 'currency' => $handover->currency],
            "Handover #{$handover->id}",
        );

        $handover->load(['collector', 'supervisor', 'payments.customer', 'payments.invoice']);

        return (new CashHandoverResource($handover))
            ->response()
            ->setStatusCode(201);
    }
}
