<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Tenant;
use App\Support\Audit;
use App\Support\TenantContext;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pull today's exchange rates from open.er-api.com and update every tenant
 * whose exchange_rate_source = 'auto'. Runs once per day on a schedule —
 * also dispatched on-demand by SettingsController::refreshExchangeRate().
 *
 * Safe to re-run: if the rate hasn't changed since the last fetch, no-op.
 */
class RefreshExchangeRatesJob implements ShouldQueue
{
    use Queueable;

    private const API_URL = 'https://open.er-api.com/v6/latest/USD';
    private const TIMEOUT_SECONDS = 15;

    /**
     * @param  string|null  $singleTenantId  if set, only that tenant is
     *   processed (used by the per-tenant "Refresh now" button). The
     *   single-tenant path ignores exchange_rate_source so a manual admin
     *   can pull a one-off rate without flipping to auto first.
     */
    public function __construct(
        public ?string $singleTenantId = null,
    ) {}

    /**
     * @return array{updated:int, skipped:int, errors:array<string>}
     */
    public function handle(): array
    {
        $response = Http::timeout(self::TIMEOUT_SECONDS)
            ->acceptJson()
            ->get(self::API_URL);

        if (! $response->successful()) {
            $msg = "FX API request failed: HTTP {$response->status()}";
            Log::warning($msg);
            return ['updated' => 0, 'skipped' => 0, 'errors' => [$msg]];
        }

        $body = $response->json();
        if (! is_array($body) || ($body['result'] ?? '') !== 'success') {
            $msg = 'FX API returned non-success body';
            Log::warning($msg, ['body' => $body]);
            return ['updated' => 0, 'skipped' => 0, 'errors' => [$msg]];
        }

        $rates = $body['rates'] ?? [];
        if (! is_array($rates) || ! isset($rates['USD'])) {
            $msg = 'FX API rates payload malformed';
            Log::warning($msg);
            return ['updated' => 0, 'skipped' => 0, 'errors' => [$msg]];
        }

        $query = Tenant::query()->whereNotNull('currency_secondary');
        if ($this->singleTenantId !== null) {
            $query->where('id', $this->singleTenantId);
        } else {
            $query->where('exchange_rate_source', 'auto');
        }

        $updated = 0;
        $skipped = 0;
        $errors = [];

        foreach ($query->get() as $tenant) {
            $primary = $tenant->currency_primary;
            $secondary = $tenant->currency_secondary;
            if (! $primary || ! $secondary) {
                $skipped++;
                continue;
            }

            // API base is USD. To get primary→secondary rate, divide
            // (USD→secondary) by (USD→primary). When primary == USD this
            // simplifies to USD→secondary directly.
            $usdToPrimary = $primary === 'USD' ? 1.0 : ($rates[$primary] ?? null);
            $usdToSecondary = $secondary === 'USD' ? 1.0 : ($rates[$secondary] ?? null);

            if ($usdToPrimary === null || $usdToSecondary === null) {
                $errors[] = "Tenant {$tenant->id} ({$tenant->name}): currency pair {$primary}/{$secondary} unsupported by API";
                $skipped++;
                continue;
            }

            $newRate = round((float) $usdToSecondary / (float) $usdToPrimary, 4);
            $oldRate = $tenant->exchange_rate !== null ? (float) $tenant->exchange_rate : null;

            if ($oldRate !== null && abs($oldRate - $newRate) < 0.00005) {
                // No meaningful change at our 4-decimal precision.
                $skipped++;
                continue;
            }

            $tenant->exchange_rate = $newRate;
            $tenant->exchange_rate_updated_at = now();
            $tenant->save();

            // Audit under the affected tenant's context so it's attributed
            // there. user_id is null because this is a system action.
            $context = app(TenantContext::class);
            $previous = $context->get();
            $context->set($tenant);
            try {
                Audit::record(
                    'tenant.exchange_rate_updated',
                    $tenant,
                    [
                        'old' => $oldRate,
                        'new' => $newRate,
                        'source' => 'auto',
                    ],
                );
            } finally {
                if ($previous) {
                    $context->set($previous);
                } else {
                    $context->clear();
                }
            }

            $updated++;
        }

        Log::info('FX refresh complete', [
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => count($errors),
        ]);

        return ['updated' => $updated, 'skipped' => $skipped, 'errors' => $errors];
    }
}
