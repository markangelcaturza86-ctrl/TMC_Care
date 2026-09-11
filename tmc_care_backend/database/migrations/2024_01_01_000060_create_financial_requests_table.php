<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('financial_requests', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('student_id')->nullable()->constrained('students')->nullOnDelete();
            $table->string('student_name')->nullable();
            $table->string('program')->nullable();
            $table->string('type');
            $table->decimal('amount_requested', 12, 2)->default(0);
            $table->decimal('amount_approved', 12, 2)->nullable();
            $table->date('date_submitted');
            $table->string('status')->default('Submitted');
            $table->text('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_requests');
    }
};
