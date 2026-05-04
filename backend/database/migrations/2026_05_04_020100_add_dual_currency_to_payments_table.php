<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pre-fix: payments stored only `amount` + `currency`. PaymentRecorder
     * added `amount` directly to invoice.paid_amount with no conversion, so
     * a 4,475,000 LBP payment on a $50 USD invoice produced
     * paid_amount = 4,475,050 — instantly "paid" with vastly wrong arithmetic.
     *
     * Post-fix: split the payment into the *received* tuple (what the
     * customer actually handed over, in their currency) and the canonical
     * `amount` (what gets applied to the invoice, in the invoice's currency).
     * `exchange_rate_used` snapshots the FX rate at payment time so a later
     * rate change doesn't retroactively alter what the customer paid.
     *
     * Backfill: existing rows had no conversion, so we set
     *   amount_received = amount
     *   currency_received = currency
     *   exchange_rate_used = 1
     * which preserves their (already-stored) interpretation that amount was
     * in invoice currency. New writes go through PaymentRecorder which sets
     * all three correctly.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->decimal('amount_received', 12, 2)->nullable()->after('amount');
            $table->string('currency_received', 3)->nullable()->after('amount_received');
            $table->decimal('exchange_rate_used', 18, 6)->nullable()->after('currency_received');
        });

        DB::statement('UPDATE payments SET amount_received = amount, currency_received = currency, exchange_rate_used = 1 WHERE amount_received IS NULL');
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['amount_received', 'currency_received', 'exchange_rate_used']);
        });
    }
};
