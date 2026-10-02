<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('result_questions', function (Blueprint $table) {
            $table->unsignedInteger('time')->default(0)->after('is_last')->comment('Savol belgilangunga qadar fokusda turgan vaqt, soniya (faqat 20/50 talik)');
            $table->unsignedTinyInteger('timing_status')->default(0)->after('time')->comment('1 — imtihondagi eng ko‘p vaqt ketgan 3 ta savoldan biri');
            $table->index(['user_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::table('result_questions', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'question_id']);
            $table->dropColumn(['time', 'timing_status']);
        });
    }
};
