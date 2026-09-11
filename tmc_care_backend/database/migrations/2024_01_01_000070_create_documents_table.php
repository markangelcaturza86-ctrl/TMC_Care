<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('owner')->nullable();
            $table->string('linked_type')->nullable(); // 'incident_report' | 'financial_request'
            $table->unsignedBigInteger('linked_id')->nullable();
            $table->string('linked_code')->nullable(); // display code e.g. FR-2024-0052
            $table->string('file_path')->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('status')->default('Pending');
            $table->timestamp('uploaded_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
