<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('languages', fn (Blueprint $t) => $t->unsignedTinyInteger('status')->default(1)->after('code'));
    }

    public function down(): void
    {
        Schema::table('languages', fn (Blueprint $t) => $t->dropColumn('status'));
    }
};
