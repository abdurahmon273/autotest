<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('global_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('twenty_quiz_time')->default(25)->after('default_quiz_image')->comment('20 talik imtihon vaqti, daqiqa');
            $table->unsignedSmallInteger('fifty_quiz_time')->default(60)->after('twenty_quiz_time')->comment('50 talik imtihon vaqti, daqiqa');
            $table->unsignedSmallInteger('quiz_wait_time')->default(2)->after('fifty_quiz_time')->comment('Javobdan keyin keyingi savolga o‘tish kutish vaqti, soniya');
        });
    }

    public function down(): void
    {
        Schema::table('global_settings', function (Blueprint $table) {
            $table->dropColumn(['twenty_quiz_time', 'fifty_quiz_time', 'quiz_wait_time']);
        });
    }
};
