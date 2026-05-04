<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('cash_handover_id')
                ->nullable()
                ->after('collected_by_user_id')
                ->constrained('cash_handovers')
                ->nullOnDelete();
            $table->index(['tenant_id', 'cash_handover_id']);
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['cash_handover_id']);
            $table->dropIndex(['tenant_id', 'cash_handover_id']);
            $table->dropColumn('cash_handover_id');
        });
    }
};
