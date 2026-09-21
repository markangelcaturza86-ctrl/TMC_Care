<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->foreignId('personnel_id')->nullable()->after('student_id')->constrained('personnel')->nullOnDelete();
        });
        Schema::table('financial_requests', function (Blueprint $table) {
            $table->foreignId('personnel_id')->nullable()->after('student_id')->constrained('personnel')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->dropConstrainedForeignId('personnel_id');
        });
        Schema::table('financial_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('personnel_id');
        });
    }
};
