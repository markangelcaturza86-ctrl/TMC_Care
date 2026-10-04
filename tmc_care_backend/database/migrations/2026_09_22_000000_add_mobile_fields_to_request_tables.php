<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->dateTime('incident_date')->nullable()->after('date_submitted');
            $table->text('people_involved')->nullable()->after('description');
        });

        Schema::table('financial_requests', function (Blueprint $table) {
            $table->string('department')->nullable()->after('program');
            $table->string('year_level')->nullable()->after('department');
            $table->string('block_section')->nullable()->after('year_level');
            $table->string('requester_name')->nullable();
            $table->string('relationship')->nullable();
            $table->decimal('amount_funded', 12, 2)->default(0);
            $table->string('contact_info')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->dropColumn(['incident_date', 'people_involved']);
        });

        Schema::table('financial_requests', function (Blueprint $table) {
            $table->dropColumn([
                'department', 'year_level', 'block_section',
                'requester_name', 'relationship', 'amount_funded', 'contact_info',
            ]);
        });
    }
};
