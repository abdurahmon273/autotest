<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', fn (Blueprint $t) => $t->text('question_krill')->nullable()->change());
        Schema::table('answers', fn (Blueprint $t) => $t->text('text_krill')->nullable()->change());
    }

    public function down(): void
    {
        Schema::table('questions', fn (Blueprint $t) => $t->text('question_krill')->nullable(false)->change());
        Schema::table('answers', fn (Blueprint $t) => $t->text('text_krill')->nullable(false)->change());
    }
};
