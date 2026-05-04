<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CollectorAssignment;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Read-only aggregations for the /reports dashboard.
 *
 * Each method returns a small payload summarising one aspect of the tenant's
 * billing/collection state. Compute is done in SQL via groupBy/raw expressions
 * so we can scale to many invoices without loading them into PHP memory.
 */
class ReportsController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $today = now()->startOfDay();
        $thisMonthStart = now()->startOfMonth();
        $lastMonthStart = (clone $thisMonthStart)->subMonth();

        $collectedToday = (float) Payment::query()
            ->where('status', 'completed')
            ->where('collected_at', '>=', $today)
            ->sum('amount');

        $collectedThisMonth = (float) Payment::query()
            ->where('status', 'completed')
            ->where('collected_at', '>=', $thisMonthStart)
            ->sum('amount');

        $collectedLastMonth = (float) Payment::query()
            ->where('status', 'completed')
            ->where('collected_at', '>=', $lastMonthStart)
            ->where('collected_at', '<', $thisMonthStart)
            ->sum('amount');

        $totalOutstanding = (float) Invoice::query()
            ->whereIn('status', ['open', 'partial', 'overdue'])
            ->sum('balance_due');

        $overdueOutstanding = (float) Invoice::query()
            ->whereIn('status', ['open', 'partial', 'overdue'])
            ->where('due_at', '<', now())
            ->sum('balance_due');

        $openInvoices = (int) Invoice::query()
            ->whereIn('status', ['open', 'partial', 'overdue'])
            ->count();

        $overdue30plus = (int) Invoice::query()
            ->whereIn('status', ['open', 'partial', 'overdue'])
            ->where('due_at', '<', now()->subDays(30))
            ->count();

        // Today's collectors — anyone with an assignment touched today.
        $collectorStats = CollectorAssignment::query()
            ->whereDate('assigned_at', '>=', $today)
            ->selectRaw('collector_user_id, status, COUNT(*) AS n')
            ->groupBy('collector_user_id', 'status')
            ->get()
            ->groupBy('collector_user_id');

        $todayCollections = Payment::query()
            ->where('status', 'completed')
            ->where('collected_at', '>=', $today)
            ->whereNotNull('collected_by_user_id')
            ->selectRaw('collected_by_user_id, SUM(amount) AS total')
            ->groupBy('collected_by_user_id')
            ->pluck('total', 'collected_by_user_id');

        $userIds = $collectorStats->keys()->merge($todayCollections->keys())->unique();
        $users = User::query()->whereIn('id', $userIds)->get()->keyBy('id');

        $collectorsLive = $userIds->map(function ($userId) use ($users, $collectorStats, $todayCollections) {
            $u = $users->get($userId);
            if (! $u) return null;
            $statuses = $collectorStats->get($userId, collect())->pluck('n', 'status');
            $total = (int) $statuses->sum();
            $done = (int) ($statuses->get('completed') ?? 0);

            return [
                'id' => $u->id,
                'name' => $u->name,
                'collected_today' => round((float) ($todayCollections->get($userId) ?? 0), 2),
                'completed' => $done,
                'total' => $total,
                'progress' => $total > 0 ? (int) round(($done / $total) * 100) : 0,
                'status' => $total === 0
                    ? 'not-started'
                    : ($done >= $total ? 'done' : 'on-route'),
            ];
        })->filter()->values();

        // Recent activity from the audit log — most recent 10 events.
        $activity = AuditLog::query()
            ->with('user')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn (AuditLog $a) => [
                'id' => $a->id,
                'action' => $a->action,
                'subject_label' => $a->subject_label,
                'user_name' => $a->user?->name,
                'created_at' => $a->created_at?->toIso8601String(),
                'changes' => $a->changes,
            ]);

        return response()->json([
            'collected_today' => round($collectedToday, 2),
            'collected_this_month' => round($collectedThisMonth, 2),
            'collected_last_month' => round($collectedLastMonth, 2),
            'mom_change_pct' => $collectedLastMonth > 0
                ? round((($collectedThisMonth - $collectedLastMonth) / $collectedLastMonth) * 100, 1)
                : null,
            'total_outstanding' => round($totalOutstanding, 2),
            'overdue_outstanding' => round($overdueOutstanding, 2),
            'active_customers' => (int) Customer::query()->where('status', 'active')->count(),
            'suspended_customers' => (int) Customer::query()->where('status', 'suspended')->count(),
            'open_invoices' => $openInvoices,
            'overdue_30_plus' => $overdue30plus,
            'collectors_today' => $collectorsLive,
            'recent_activity' => $activity,
            'backup' => $this->backupStatus(),
        ]);
    }

    /**
     * Reads /var/backups/isp-saas/.last-success (touched by the nightly
     * backup script) so the dashboard can warn loudly when backups stop.
     *
     * @return array<string, mixed>
     */
    private function backupStatus(): array
    {
        $heartbeat = '/var/backups/isp-saas/.last-success';
        if (! is_readable($heartbeat)) {
            return ['last_success_at' => null, 'age_hours' => null, 'status' => 'unknown'];
        }

        $iso = trim((string) file_get_contents($heartbeat));
        try {
            $when = \Carbon\Carbon::parse($iso);
        } catch (\Throwable) {
            return ['last_success_at' => null, 'age_hours' => null, 'status' => 'unknown'];
        }

        $hours = $when->diffInHours(now(), absolute: true);
        $status = match (true) {
            $hours < 26 => 'healthy',
            $hours < 50 => 'stale',
            default => 'failing',
        };

        return [
            'last_success_at' => $when->toIso8601String(),
            'age_hours' => round($hours, 1),
            'status' => $status,
        ];
    }

    /**
     * Accounts-receivable aging — splits outstanding balance into the standard
     * "current / 1-30 / 31-60 / 61-90 / 90+" buckets relative to invoice due_at.
     */
    public function aging(Request $request): JsonResponse
    {
        $rows = Invoice::query()
            ->whereIn('status', ['open', 'partial', 'overdue'])
            ->where('balance_due', '>', 0)
            ->selectRaw("
                SUM(CASE WHEN due_at >= NOW() THEN balance_due ELSE 0 END) AS current,
                SUM(CASE WHEN due_at <  NOW() AND due_at >= NOW() - INTERVAL '30 days' THEN balance_due ELSE 0 END) AS d_1_30,
                SUM(CASE WHEN due_at <  NOW() - INTERVAL '30 days' AND due_at >= NOW() - INTERVAL '60 days' THEN balance_due ELSE 0 END) AS d_31_60,
                SUM(CASE WHEN due_at <  NOW() - INTERVAL '60 days' AND due_at >= NOW() - INTERVAL '90 days' THEN balance_due ELSE 0 END) AS d_61_90,
                SUM(CASE WHEN due_at <  NOW() - INTERVAL '90 days' THEN balance_due ELSE 0 END) AS d_90_plus,
                COUNT(*) AS invoice_count
            ")
            ->first();

        return response()->json([
            'buckets' => [
                'current' => (float) $rows->current,
                '1_30' => (float) $rows->d_1_30,
                '31_60' => (float) $rows->d_31_60,
                '61_90' => (float) $rows->d_61_90,
                '90_plus' => (float) $rows->d_90_plus,
            ],
            'total' => round(
                (float) $rows->current
                + (float) $rows->d_1_30
                + (float) $rows->d_31_60
                + (float) $rows->d_61_90
                + (float) $rows->d_90_plus,
                2,
            ),
            'invoice_count' => (int) $rows->invoice_count,
        ]);
    }

    /**
     * Collection performance per collector. Default window: last 30 days.
     */
    public function collectorPerformance(Request $request): JsonResponse
    {
        $since = $request->date('since') ?? now()->subDays(30);

        $collectorIds = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'collector'))
            ->where('tenant_id', $request->user()->tenant_id)
            ->pluck('id', 'name');

        $rows = $collectorIds->map(function ($id, $name) use ($since) {
            $collected = (float) Payment::query()
                ->where('collected_by_user_id', $id)
                ->where('status', 'completed')
                ->where('collected_at', '>=', $since)
                ->sum('amount');

            $assigned = (int) CollectorAssignment::query()
                ->where('collector_user_id', $id)
                ->where('assigned_at', '>=', $since)
                ->count();

            $completed = (int) CollectorAssignment::query()
                ->where('collector_user_id', $id)
                ->where('assigned_at', '>=', $since)
                ->where('status', 'completed')
                ->count();

            $failed = (int) CollectorAssignment::query()
                ->where('collector_user_id', $id)
                ->where('assigned_at', '>=', $since)
                ->where('status', 'failed')
                ->count();

            return [
                'user_id' => $id,
                'name' => $name,
                'collected' => round($collected, 2),
                'assignments_total' => $assigned,
                'assignments_completed' => $completed,
                'assignments_failed' => $failed,
                'success_rate' => $assigned > 0
                    ? round(($completed / $assigned) * 100, 1)
                    : null,
            ];
        })->values()->sortByDesc('collected')->values();

        return response()->json([
            'since' => $since->toIso8601String(),
            'data' => $rows,
        ]);
    }

    /**
     * Revenue grouped by service category (Internet vs Electricity vs Satellite).
     */
    public function revenue(Request $request): JsonResponse
    {
        $since = $request->date('since') ?? now()->startOfMonth();

        // Sum invoice_items by package.service_category_id, then resolve names.
        // Driven from invoice_items (which is BelongsToTenant) so the global
        // scope picks up tenant filtering automatically.
        $byCategory = \App\Models\InvoiceItem::query()
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->leftJoin('packages', 'packages.id', '=', 'invoice_items.package_id')
            ->leftJoin('service_categories', 'service_categories.id', '=', 'packages.service_category_id')
            ->whereIn('invoices.status', ['paid', 'partial', 'open', 'overdue'])
            ->where('invoices.issued_at', '>=', $since)
            ->selectRaw("
                COALESCE(service_categories.id::text, 'uncat') AS category_id,
                COALESCE(service_categories.name, 'Uncategorised') AS category_name,
                SUM(invoice_items.total) AS billed,
                SUM(CASE WHEN invoices.status = 'paid' THEN invoice_items.total ELSE 0 END) AS collected
            ")
            ->groupBy('service_categories.id', 'service_categories.name')
            ->orderByDesc('billed')
            ->get();

        return response()->json([
            'since' => $since->toIso8601String(),
            'data' => $byCategory->map(fn ($row) => [
                'category_id' => $row->category_id,
                'category_name' => $row->category_name,
                'billed' => (float) $row->billed,
                'collected' => (float) $row->collected,
                'collection_rate' => (float) $row->billed > 0
                    ? round(((float) $row->collected / (float) $row->billed) * 100, 1)
                    : null,
            ]),
        ]);
    }

    /**
     * CSV export — picks one of the report types based on ?type=.
     */
    public function export(Request $request): StreamedResponse
    {
        if (! $request->user()->can('reports.export')) {
            abort(403);
        }

        $type = $request->string('type')->toString() ?: 'aging';
        $tenantName = $request->user()->tenant?->name ?? 'tenant';
        $stamp = now()->format('Y-m-d');

        return response()->streamDownload(function () use ($type, $request) {
            $out = fopen('php://output', 'w');
            try {
                match ($type) {
                    'aging' => $this->streamAgingCsv($out),
                    'collectors' => $this->streamCollectorsCsv($out, $request),
                    'revenue' => $this->streamRevenueCsv($out, $request),
                    default => fputcsv($out, ['error', 'unknown report type'])
                };
            } finally {
                fclose($out);
            }
        }, "{$tenantName}-{$type}-{$stamp}.csv", [
            'Content-Type' => 'text/csv; charset=utf-8',
        ]);
    }

    /** @param  resource  $out */
    private function streamAgingCsv($out): void
    {
        fputcsv($out, ['Customer code', 'Customer', 'Invoice', 'Issued', 'Due', 'Balance', 'Bucket']);
        Invoice::query()
            ->whereIn('status', ['open', 'partial', 'overdue'])
            ->where('balance_due', '>', 0)
            ->with('customer')
            ->orderBy('due_at')
            ->chunk(500, function ($invoices) use ($out) {
                foreach ($invoices as $i) {
                    $daysPastDue = $i->due_at ? now()->diffInDays($i->due_at, false) * -1 : 0;
                    $bucket = match (true) {
                        $daysPastDue < 0 => 'current',
                        $daysPastDue <= 30 => '1-30',
                        $daysPastDue <= 60 => '31-60',
                        $daysPastDue <= 90 => '61-90',
                        default => '90+',
                    };
                    fputcsv($out, [
                        $i->customer?->code ?? '',
                        $i->customer?->full_name ?? '',
                        $i->number,
                        $i->issued_at?->format('Y-m-d'),
                        $i->due_at?->format('Y-m-d'),
                        number_format((float) $i->balance_due, 2),
                        $bucket,
                    ]);
                }
            });
    }

    /** @param  resource  $out */
    private function streamCollectorsCsv($out, Request $request): void
    {
        fputcsv($out, ['Collector', 'Collected', 'Assigned', 'Completed', 'Failed', 'Success rate %']);
        $data = $this->collectorPerformance($request)->getData(true)['data'];
        foreach ($data as $row) {
            fputcsv($out, [
                $row['name'],
                number_format((float) $row['collected'], 2),
                $row['assignments_total'],
                $row['assignments_completed'],
                $row['assignments_failed'],
                $row['success_rate'] ?? '',
            ]);
        }
    }

    /** @param  resource  $out */
    private function streamRevenueCsv($out, Request $request): void
    {
        fputcsv($out, ['Service category', 'Billed', 'Collected', 'Collection rate %']);
        $data = $this->revenue($request)->getData(true)['data'];
        foreach ($data as $row) {
            fputcsv($out, [
                $row['category_name'],
                number_format((float) $row['billed'], 2),
                number_format((float) $row['collected'], 2),
                $row['collection_rate'] ?? '',
            ]);
        }
    }
}
