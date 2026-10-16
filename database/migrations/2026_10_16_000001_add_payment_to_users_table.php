<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('payment')->nullable()->after('max_attempts')->comment('To‘lov summasi (so‘m). null — kiritilmagan');
            $table->index('payment');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['payment']);
            $table->dropColumn('payment');
        });
    }
};
