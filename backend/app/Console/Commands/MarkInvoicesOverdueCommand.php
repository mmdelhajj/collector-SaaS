<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Invoice;
use Illuminate\Console\Command;

/**
 * Flips any invoice still tagged `open` or `partial` whose due date is in
 * the past to `overdue`. Idempotent — safe to run hourly. Designed for the
 * isp-saas-scheduler.timer that runs every minute (we self-rate-limit by
 * only processing rows that aren't already overdue).
 *
 * Cross-tenant on purpose — the scheduler doesn't know about tenants and
 * the result is a status flip that doesn't leak data.
 */
class MarkInvoicesOverdueCommand extends Command
{
    protected $signature = 'invoices:mark-overdue';

    protected $description = 'Flip past-due open/partial invoices to overdue.';

    public function handle(): int
    {
        $count = Invoice::withoutTenant()
            ->whereIn('status', ['open', 'partial'])
            ->where('balance_due', '>', 0)
            ->where('due_at', '<', now())
            ->update(['status' => 'overdue']);

        $this->info("Marked {$count} invoice(s) overdue.");

        return self::SUCCESS;
    }
}
