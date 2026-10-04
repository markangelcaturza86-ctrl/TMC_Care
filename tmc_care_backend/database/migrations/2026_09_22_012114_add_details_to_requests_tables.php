<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->json('details')->nullable()->after('description');
        });

        Schema::table('financial_requests', function (Blueprint $table) {
            $table->json('details')->nullable()->after('reason');
        });
    }

    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->dropColumn('details');
        });

        Schema::table('financial_requests', function (Blueprint $table) {
            $table->dropColumn('details');
        });
    }
};
