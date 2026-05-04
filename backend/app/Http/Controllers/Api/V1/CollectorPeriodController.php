<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CashHandover;
use App\Models\CollectorAssignment;
use App\Models\CollectorRoute;
use App\Models\Payment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Per-collector drill-down. One endpoint covers today / week / month / year
 * with the same response shape — the frontend picks which sections to render
 * based on the range length.
 */
class CollectorPeriodController extends Controller
{
    public function show(Request $request, int $userId): JsonResponse
    {
        // Permission: managers + above can view any collector; a collector
        // can view their own page.
        $current = $request->user();
        $isOwner = $current->id === $userId;
        if (
            ! $isOwner &&
            ! $current->can('collectors.view') &&
            ! $current->can('collectors.assign')
        ) {
            abort(403);
        }

        $user = User::query()
            ->where('tenant_id', $current->tenant_id)
            ->findOrFail($userId);

        $range = $request->query('range', 'today');
        $anchor = $request->query('date')
            ? CarbonImmutable::parse((string) $request->query('date'))
            : CarbonImmutable::now();
        [$start, $end, $bucket] = $this->bounds($range, $anchor);

        // ─── Aggregations ─────────────────────────────────────────────
        $payments = Payment::query()
            ->where('collected_by_user_id', $userId)
            ->where('status', 'completed')
            ->where('collected_at', '>=', $start)
            ->where('collected_at', '<', $end)
            ->get();

        $collected = (float) $payments->sum('amount');
        $methodBreakdown = $payments
            ->groupBy('method')
            ->map(fn ($g) => [
                'count' => $g->count(),
                'total' => round((float) $g->sum('amount'), 2),
            ]);

        // Day-bucketed series for charts. We always bucket by day; the
        // frontend can re-aggregate to weeks for year views if it wants.
        $series = $payments
            ->groupBy(fn ($p) => $p->collected_at?->format('Y-m-d'))
            ->map(fn ($g, $date) => [
                'date' => $date,
                'amount' => round((float) $g->sum('amount'), 2),
                'count' => $g->count(),
            ])
            ->values();

        // Fill empty days with zeros so the bar chart isn't sparse.
        $filled = [];
        $cursor = $start;
        while ($cursor < $end) {
            $key = $cursor->format('Y-m-d');
            $hit = $series->firstWhere('date', $key);
            $filled[] = $hit ?? ['date' => $key, 'amount' => 0, 'count' => 0];
            $cursor = $cursor->addDay();
        }

        // Assignment outcomes.
        $assignments = CollectorAssignment::query()
            ->where('collector_user_id', $userId)
            ->where('assigned_at', '>=', $start)
            ->where('assigned_at', '<', $end)
            ->get();
        $assignmentCounts = [
            'total' => $assignments->count(),
            'completed' => $assignments->where('status', 'completed')->count(),
            'failed' => $assignments->where('status', 'failed')->count(),
            'pending' => $assignments->whereIn('status', ['pending', 'in_progress'])->count(),
            'reassigned' => $assignments->where('status', 'reassigned')->count(),
        ];
        $successRate = $assignmentCounts['total'] > 0
            ? round(
                ($assignmentCounts['completed'] / $assignmentCounts['total']) * 100,
                1,
            )
            : null;

        // Top customers by amount in this range.
        $topCustomers = $payments
            ->groupBy('customer_id')
            ->map(function ($g) {
                $sample = $g->load('customer')->first();

                return [
                    'customer_id' => $sample->customer_id,
                    'customer' => $sample->customer
                        ? [
                            'id' => $sample->customer->id,
                            'code' => $sample->customer->code,
                            'full_name' => $sample->customer->full_name,
                        ]
                        : null,
                    'visits' => $g->count(),
                    'collected' => round((float) $g->sum('amount'), 2),
                ];
            })
            ->sortByDesc('collected')
            ->take(10)
            ->values();

        // Cash handovers in range.
        $handovers = CashHandover::query()
            ->where('from_user_id', $userId)
            ->where('handed_over_at', '>=', $start)
            ->where('handed_over_at', '<', $end)
            ->orderByDesc('handed_over_at')
            ->get();
        $handoverSummary = [
            'count' => $handovers->count(),
            'pending' => $handovers->where('status', 'pending')->count(),
            'confirmed' => $handovers->where('status', 'confirmed')->count(),
            'disputed' => $handovers->where('status', 'disputed')->count(),
            'declared_total' => round((float) $handovers->sum('amount'), 2),
        ];
        $recentHandovers = $handovers->take(15)->map(fn ($h) => [
            'id' => $h->id,
            'amount' => (float) $h->amount,
            'status' => $h->status,
            'handed_over_at' => $h->handed_over_at?->toIso8601String(),
            'dispute_reason' => $h->dispute_reason,
        ])->values();

        // Best/worst day (only meaningful for week+ ranges).
        $bestDay = collect($filled)->sortByDesc('amount')->first();
        $worstDay = collect($filled)->where('amount', '>', 0)->sortBy('amount')->first();

        // Activity timeline — pulled from audit log + payments + check-ins.
        // For "today" we want every micro-event; for longer ranges we sample.
        $timeline = $this->buildTimeline($userId, $current->tenant_id, $start, $end, $range);

        // Day-specific extras: GPS track + check-in/out.
        $route = $range === 'today' || $range === 'yesterday'
            ? CollectorRoute::query()
                ->where('collector_user_id', $userId)
                ->whereDate('date', $start->format('Y-m-d'))
                ->first()
            : null;

        return response()->json([
            'data' => [
                'collector' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'range' => $range,
                'anchor' => $anchor->toDateString(),
                'window' => [
                    'start' => $start->toIso8601String(),
                    'end' => $end->toIso8601String(),
                    'bucket' => $bucket,
                ],
                'kpis' => [
                    'collected' => round($collected, 2),
                    'currency' => 'USD',
                    'visits' => $assignmentCounts['total'],
                    'completed' => $assignmentCounts['completed'],
                    'failed' => $assignmentCounts['failed'],
                    'pending' => $assignmentCounts['pending'],
                    'success_rate' => $successRate,
                    'avg_per_active_day' => $this->avgPerActiveDay($filled),
                    'disputes' => $handoverSummary['disputed'],
                ],
                'series' => $filled,
                'method_breakdown' => $methodBreakdown,
                'top_customers' => $topCustomers,
                'handovers' => [
                    'summary' => $handoverSummary,
                    'recent' => $recentHandovers,
                ],
                'best_day' => $bestDay && $bestDay['amount'] > 0 ? $bestDay : null,
                'worst_day' => $worstDay,
                'timeline' => $timeline,
                'route' => $route ? [
                    'started_at' => $route->started_at?->toIso8601String(),
                    'ended_at' => $route->ended_at?->toIso8601String(),
                    'last_ping_at' => $route->last_ping_at?->toIso8601String(),
                    'last_latitude' => $route->last_latitude !== null
                        ? (float) $route->last_latitude : null,
                    'last_longitude' => $route->last_longitude !== null
                        ? (float) $route->last_longitude : null,
                    'gps_track' => $route->gps_track ?? [],
                    'total_collected' => (float) $route->total_collected,
                ] : null,
            ],
        ]);
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable, 2: string}
     */
    private function bounds(string $range, CarbonImmutable $anchor): array
    {
        return match ($range) {
            'yesterday' => [
                $anchor->subDay()->startOfDay(),
                $anchor->subDay()->endOfDay()->addSecond(),
                'hour',
            ],
            'week' => [
                $anchor->startOfWeek()->startOfDay(),
                $anchor->endOfWeek()->endOfDay()->addSecond(),
                'day',
            ],
            'month' => [
                $anchor->startOfMonth()->startOfDay(),
                $anchor->endOfMonth()->endOfDay()->addSecond(),
                'day',
            ],
            'year' => [
                $anchor->startOfYear()->startOfDay(),
                $anchor->endOfYear()->endOfDay()->addSecond(),
                'day',
            ],
            default /* today */ => [
                $anchor->startOfDay(),
                $anchor->endOfDay()->addSecond(),
                'hour',
            ],
        };
    }

    private function avgPerActiveDay(array $series): float
    {
        $active = array_filter($series, fn ($d) => $d['amount'] > 0);
        if (count($active) === 0) {
            return 0.0;
        }
        $sum = array_sum(array_column($active, 'amount'));

        return round($sum / count($active), 2);
    }

    /**
     * Rich activity stream pulled from operational tables (payments,
     * assignments, handovers) plus non-payment audit entries. Each entry
     * carries enough fields for a self-contained card on the frontend:
     * amount paid, invoice total + balance left, collector notes, etc.
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildTimeline(
        int $userId,
        string $tenantId,
        CarbonImmutable $start,
        CarbonImmutable $end,
        string $range,
    ): array {
        $limit = match ($range) {
            'today', 'yesterday' => 200,
            'week' => 100,
            'month' => 60,
            default => 30,
        };

        $payments = Payment::query()
            ->with(['customer', 'invoice'])
            ->where('collected_by_user_id', $userId)
            ->where('collected_at', '>=', $start)
            ->where('collected_at', '<', $end)
            ->orderByDesc('collected_at')
            ->limit($limit)
            ->get()
            ->map(function (Payment $p) {
                $invoiceTotal = $p->invoice ? (float) $p->invoice->total : null;
                $balanceLeft = $p->invoice ? (float) $p->invoice->balance_due : null;
                $cleared = $invoiceTotal !== null && $balanceLeft !== null && $balanceLeft <= 0;

                return [
                    'id' => 'p-' . $p->id,
                    'kind' => 'payment',
                    'when' => $p->collected_at?->toIso8601String(),
                    'amount' => (float) $p->amount,
                    'currency' => $p->currency,
                    'method' => $p->method,
                    'status' => $p->status,
                    'notes' => $p->notes,
                    'reference_number' => $p->reference_number,
                    'cleared' => $cleared,
                    'invoice' => $p->invoice
                        ? [
                            'id' => $p->invoice->id,
                            'number' => $p->invoice->number,
                            'total' => $invoiceTotal,
                            'balance_due' => $balanceLeft,
                            'status' => $p->invoice->status,
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

        $fails = CollectorAssignment::query()
            ->with(['invoice.customer'])
            ->where('collector_user_id', $userId)
            ->where('status', 'failed')
            ->where('updated_at', '>=', $start)
            ->where('updated_at', '<', $end)
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (CollectorAssignment $a) => [
                'id' => 'f-' . $a->id,
                'kind' => 'failure',
                'when' => $a->updated_at?->toIso8601String(),
                'failure_reason' => $a->failure_reason,
                'failure_notes' => $a->failure_notes ?? null,
                'invoice' => $a->invoice
                    ? [
                        'id' => $a->invoice->id,
                        'number' => $a->invoice->number,
                        'balance_due' => (float) $a->invoice->balance_due,
                    ]
                    : null,
                'customer' => $a->invoice?->customer
                    ? [
                        'id' => $a->invoice->customer->id,
                        'code' => $a->invoice->customer->code,
                        'full_name' => $a->invoice->customer->full_name,
                    ]
                    : null,
            ]);

        $handovers = CashHandover::query()
            ->where('from_user_id', $userId)
            ->where('handed_over_at', '>=', $start)
            ->where('handed_over_at', '<', $end)
            ->orderByDesc('handed_over_at')
            ->limit(20)
            ->get()
            ->map(fn (CashHandover $h) => [
                'id' => 'h-' . $h->id,
                'kind' => 'handover',
                'when' => ($h->confirmed_at ?? $h->disputed_at ?? $h->handed_over_at)?->toIso8601String(),
                'handover_id' => $h->id,
                'amount' => (float) $h->amount,
                'currency' => $h->currency,
                'status' => $h->status,
                'notes' => $h->notes,
                'dispute_reason' => $h->dispute_reason,
            ]);

        // Non-payment / non-handover audit entries (role changes, RADIUS, …)
        $audit = AuditLog::query()
            ->where('user_id', $userId)
            ->where('created_at', '>=', $start)
            ->where('created_at', '<', $end)
            ->whereNotIn('action', [
                'payment.created',
                'handover.submitted',
                'handover.confirmed',
                'handover.disputed',
                'handover.resolved',
            ])
            ->orderByDesc('created_at')
            ->limit(30)
            ->get()
            ->map(fn (AuditLog $a) => [
                'id' => 'a-' . $a->id,
                'kind' => 'audit',
                'when' => $a->created_at?->toIso8601String(),
                'action' => $a->action,
                'subject_label' => $a->subject_label,
                'changes' => $a->changes,
            ]);

        $all = collect()
            ->concat($payments)
            ->concat($fails)
            ->concat($handovers)
            ->concat($audit)
            ->sortByDesc('when')
            ->take($limit)
            ->values();

        return $all->all();
    }
}
