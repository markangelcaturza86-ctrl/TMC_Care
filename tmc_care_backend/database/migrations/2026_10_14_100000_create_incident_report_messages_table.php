<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('incident_report_messages')) {
            return;
        }

        Schema::create('incident_report_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_report_id')->constrained('incident_reports')->cascadeOnDelete();
            $table->string('sender');            // 'admin' or 'reporter'
            $table->string('sender_name');
            $table->text('body');
            $table->boolean('read')->default(false); // read by the other side
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_report_messages');
    }
};
