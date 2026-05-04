<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\SendInvoiceReminderJob;
use App\Models\Invoice;
use App\Models\MessageLog;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

/**
 * Reads each tenant's notification preferences and dispatches reminder /
 * overdue jobs for invoices matching the configured day-offsets:
 *
 *   reminder_days_before: [5, 2]   → invoices due in exactly 5 or 2 days
 *   overdue_days_after:   [1, 3, 7] → invoices that became overdue 1/3/7 days ago
 *
 * Designed to run once a day (e.g. 9 AM via the scheduler). Self-deduplicates
 * by checking messages_log so re-running on the same day doesn't double-send.
 * Honours `quiet_hours_*` — anything inside the window is skipped (the next
 * day's run will pick it up anyway).
 */
class SendDueRemindersCommand extends Command
{
    protected $signature = 'invoices:send-due-reminders';

    protected $description = 'Dispatch invoice reminder + overdue chase messages per tenant settings.';

    public function handle(): int
    {
        $totalQueued = 0;

        Tenant::query()->where('status', '!=', 'suspended')->chunk(50, function ($tenants) use (&$totalQueued) {
            foreach ($tenants as $tenant) {
                $totalQueued += $this->processTenant($tenant);
            }
        });

        $this->info("Queued {$totalQueued} reminder message(s).");

        return self::SUCCESS;
    }

    private function processTenant(Tenant $tenant): int
    {
        $settings = $tenant->settings['notifications'] ?? [];

        // All time-of-day decisions must use the tenant's timezone, not the
        // app's. A tenant in UTC+8 with quiet_hours 21:00–08:00 expects local
        // time, not Asia/Beirut. Same for "today" / "due in N days" — these
        // wall-clock concepts straddle UTC midnight differently per region.
        $tz = $tenant->timezone ?: config('app.timezone', 'UTC');

        if ($this->insideQuietHours($settings, $tz)) {
            return 0;
        }

        $reminderDays = $this->normalizeDays($settings['reminder_days_before'] ?? [5, 2]);
        $overdueDays = $this->normalizeDays($settings['overdue_days_after'] ?? [1, 3, 7]);

        $today = Carbon::now($tz)->startOfDay();

        $queued = 0;

        // Pre-due reminders.
        foreach ($reminderDays as $days) {
            $target = $today->copy()->addDays($days);
            $queued += $this->dispatchFor(
                $tenant->id,
                fn ($q) => $q
                    ->whereIn('status', ['open', 'partial'])
                    ->where('balance_due', '>', 0)
                    ->whereDate('due_at', $target->toDateString()),
                'invoice_reminder',
            );
        }

        // Post-due chases.
        foreach ($overdueDays as $days) {
            $target = $today->copy()->subDays($days);
            $queued += $this->dispatchFor(
                $tenant->id,
                fn ($q) => $q
                    ->whereIn('status', ['open', 'partial', 'overdue'])
                    ->where('balance_due', '>', 0)
                    ->whereDate('due_at', $target->toDateString()),
                'invoice_overdue',
            );
        }

        return $queued;
    }

    /**
     * @param  callable(Builder): Builder  $filter
     */
    private function dispatchFor(string $tenantId, callable $filter, string $templateKey): int
    {
        $query = Invoice::withoutTenant()->where('tenant_id', $tenantId);
        $query = $filter($query);

        $count = 0;
        $query->orderBy('id')->chunkById(200, function ($chunk) use (&$count, $templateKey) {
            foreach ($chunk as $invoice) {
                if ($this->alreadySentToday($invoice->id, $templateKey)) {
                    continue;
                }
                SendInvoiceReminderJob::dispatch($invoice->id, $templateKey);
                $count++;
            }
        });

        return $count;
    }

    private function alreadySentToday(string $invoiceId, string $templateKey): bool
    {
        return MessageLog::query()
            ->where('related_type', Invoice::class)
            ->where('related_id', $invoiceId)
            ->where('template_key', $templateKey)
            ->whereDate('created_at', today())
            ->exists();
    }

    /**
     * @param  array<mixed>  $raw
     * @return list<int>
     */
    private function normalizeDays(array $raw): array
    {
        return collect($raw)
            ->map(fn ($v) => (int) $v)
            ->filter(fn ($v) => $v >= 0 && $v <= 120)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $settings
     */
    private function insideQuietHours(array $settings, string $tz): bool
    {
        $start = $settings['quiet_hours_start'] ?? null;
        $end = $settings['quiet_hours_end'] ?? null;
        if (! $start || ! $end) {
            return false;
        }

        try {
            $now = Carbon::now($tz)->format('H:i');
            // Wrap-around (e.g. 21:00 → 08:00) is handled by string compare with
            // an OR clause: inside if (now >= start) OR (now < end).
            if ($start > $end) {
                return $now >= $start || $now < $end;
            }

            return $now >= $start && $now < $end;
        } catch (\Throwable) {
            return false;
        }
    }
}
