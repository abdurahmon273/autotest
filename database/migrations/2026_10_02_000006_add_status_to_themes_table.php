<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('themes', function (Blueprint $table) {
            $table->unsignedTinyInteger('status')->default(1)->after('icon')->index()->comment('1 - faol, 0 - yashirin (hech qayerda ishlatilmaydi)');
        });
    }

    public function down(): void
    {
        Schema::table('themes', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
