<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('global_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('task_notification_time')->default(4)->after('quiz_wait_time')->comment('Vazifa tugashidan necha soat oldin eslatma yuboriladi');
        });
    }

    public function down(): void
    {
        Schema::table('global_settings', function (Blueprint $table) {
            $table->dropColumn('task_notification_time');
        });
    }
};
