<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Each column is added only if it is missing, so this is safe to run
        // even if some columns were already created manually or by a partial run.
        Schema::table('incident_reports', function (Blueprint $table) {
            if (! Schema::hasColumn('incident_reports', 'incident_date')) {
                $table->dateTime('incident_date')->nullable();
            }
            if (! Schema::hasColumn('incident_reports', 'people_involved')) {
                $table->text('people_involved')->nullable();
            }
        });

        Schema::table('financial_requests', function (Blueprint $table) {
            foreach (['department', 'year_level', 'block_section', 'requester_name', 'relationship', 'contact_info'] as $col) {
                if (! Schema::hasColumn('financial_requests', $col)) {
                    $table->string($col)->nullable();
                }
            }
            if (! Schema::hasColumn('financial_requests', 'amount_funded')) {
                $table->decimal('amount_funded', 12, 2)->default(0);
            }
        });
    }

    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            foreach (['incident_date', 'people_involved'] as $col) {
                if (Schema::hasColumn('incident_reports', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
        Schema::table('financial_requests', function (Blueprint $table) {
            foreach (['department', 'year_level', 'block_section', 'requester_name', 'relationship', 'contact_info', 'amount_funded'] as $col) {
                if (Schema::hasColumn('financial_requests', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
