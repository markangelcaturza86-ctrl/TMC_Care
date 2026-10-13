<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // A department treasurer hands the cash he/she collected over to the TMC
        // Treasurer. One remittance = one hand-over for one donation drive.
        if (! Schema::hasTable('remittances')) {
            Schema::create('remittances', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();                 // RM-0001
                $table->foreignId('financial_request_id')->constrained('financial_requests')->cascadeOnDelete();
                $table->unsignedBigInteger('department_id');
                $table->decimal('amount', 12, 2);
                $table->string('status')->default('Pending');     // Pending | Received | Rejected
                $table->unsignedBigInteger('submitted_by_id')->nullable();
                $table->string('submitted_by')->nullable();
                $table->unsignedBigInteger('received_by_id')->nullable();
                $table->string('received_by')->nullable();
                $table->dateTime('received_at')->nullable();
                $table->string('note')->nullable();
                $table->timestamps();
            });
        }

        // Donations: who collected it and where the cash is right now.
        //   Collected = still with the department treasurer
        //   Remitted  = handed over, waiting for the TMC Treasurer to confirm
        //   Received  = confirmed; counts toward the drive total
        Schema::table('donations', function (Blueprint $table) {
            if (! Schema::hasColumn('donations', 'department_id')) {
                $table->unsignedBigInteger('department_id')->nullable();
            }
            if (! Schema::hasColumn('donations', 'status')) {
                $table->string('status')->default('Received');
            }
            if (! Schema::hasColumn('donations', 'remittance_id')) {
                $table->unsignedBigInteger('remittance_id')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('remittances');

        Schema::table('donations', function (Blueprint $table) {
            foreach (['department_id', 'status', 'remittance_id'] as $col) {
                if (Schema::hasColumn('donations', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
