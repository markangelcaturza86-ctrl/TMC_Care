<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $columns = [
            'department' => fn (Blueprint $t) => $t->string('department')->nullable(),
            'year_level' => fn (Blueprint $t) => $t->string('year_level')->nullable(),
            'block_section' => fn (Blueprint $t) => $t->string('block_section')->nullable(),
            'requester_name' => fn (Blueprint $t) => $t->string('requester_name')->nullable(),
            'relationship' => fn (Blueprint $t) => $t->string('relationship')->nullable(),
            'contact_info' => fn (Blueprint $t) => $t->string('contact_info')->nullable(),
            'amount_funded' => fn (Blueprint $t) => $t->decimal('amount_funded', 12, 2)->default(0),
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
        foreach (['department', 'year_level', 'block_section', 'requester_name', 'relationship', 'contact_info', 'amount_funded'] as $col) {
            if (Schema::hasColumn('financial_requests', $col)) {
                Schema::table('financial_requests', function (Blueprint $table) use ($col) {
                    $table->dropColumn($col);
                });
            }
        }
    }
};
