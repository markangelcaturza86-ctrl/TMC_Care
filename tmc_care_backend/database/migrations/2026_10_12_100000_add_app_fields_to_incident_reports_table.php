<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            if (! Schema::hasColumn('incident_reports', 'incident_date')) {
                $table->dateTime('incident_date')->nullable()->after('location');
            }
            if (! Schema::hasColumn('incident_reports', 'people_involved')) {
                $table->text('people_involved')->nullable()->after('description');
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
    }
};
