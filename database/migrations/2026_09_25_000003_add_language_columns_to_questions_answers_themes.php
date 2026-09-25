<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->renameColumn('question', 'question_krill');
            $table->renameColumn('instruction', 'instruction_krill');
        });
        Schema::table('questions', function (Blueprint $table) {
            $table->text('question_latin')->nullable()->after('question_krill');
            $table->longText('instruction_latin')->nullable()->after('instruction_krill');
        });
        Schema::table('answers', function (Blueprint $table) {
            $table->renameColumn('text', 'text_krill');
        });
        Schema::table('answers', function (Blueprint $table) {
            $table->text('text_latin')->nullable()->after('text_krill');
        });
        Schema::table('themes', function (Blueprint $table) {
            $table->string('title_krill')->nullable()->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('themes', fn (Blueprint $t) => $t->dropColumn('title_krill'));
        Schema::table('answers', fn (Blueprint $t) => $t->dropColumn('text_latin'));
        Schema::table('answers', fn (Blueprint $t) => $t->renameColumn('text_krill', 'text'));
        Schema::table('questions', fn (Blueprint $t) => $t->dropColumn(['question_latin', 'instruction_latin']));
        Schema::table('questions', function (Blueprint $t) {
            $t->renameColumn('question_krill', 'question');
            $t->renameColumn('instruction_krill', 'instruction');
        });
    }
};
