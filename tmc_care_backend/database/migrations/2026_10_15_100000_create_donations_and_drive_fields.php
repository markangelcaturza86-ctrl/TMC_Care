<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('donations')) {
            Schema::create('donations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('financial_request_id')->constrained('financial_requests')->cascadeOnDelete();
                $table->string('donor_name');
                $table->decimal('amount', 12, 2);
                $table->date('received_on');
                $table->string('recorded_by');
                $table->string('notes')->nullable();
                $table->timestamps();
            });
        }

        $columns = [
            'amount_collected' => fn (Blueprint $t) => $t->decimal('amount_collected', 12, 2)->default(0),
            'drive_deadline' => fn (Blueprint $t) => $t->date('drive_deadline')->nullable(),
            'approved_by_id' => fn (Blueprint $t) => $t->unsignedBigInteger('approved_by_id')->nullable(),
            'approved_by' => fn (Blueprint $t) => $t->string('approved_by')->nullable(),
            'approved_at' => fn (Blueprint $t) => $t->dateTime('approved_at')->nullable(),
            'released_by_id' => fn (Blueprint $t) => $t->unsignedBigInteger('released_by_id')->nullable(),
            'released_by' => fn (Blueprint $t) => $t->string('released_by')->nullable(),
            'released_to' => fn (Blueprint $t) => $t->string('released_to')->nullable(),
            'released_at' => fn (Blueprint $t) => $t->dateTime('released_at')->nullable(),
            'drive_announcement_code' => fn (Blueprint $t) => $t->string('drive_announcement_code')->nullable(),
        ];

        foreach ($columns as $name => $add) {
            if (! Schema::hasColumn('financial_requests', $name)) {
                Schema::table('financial_requests', function (Blueprint $table) use ($add) {
                    $add($table);
                });
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('donations');

        foreach (['amount_collected', 'drive_deadline', 'approved_by_id', 'approved_by', 'approved_at', 'released_by_id', 'released_by', 'released_to', 'released_at', 'drive_announcement_code'] as $col) {
            if (Schema::hasColumn('financial_requests', $col)) {
                Schema::table('financial_requests', function (Blueprint $table) use ($col) {
                    $table->dropColumn($col);
                });
            }
        }
    }
};
