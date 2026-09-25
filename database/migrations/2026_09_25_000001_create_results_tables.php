<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 32);
            $table->foreignId('theme_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('status')->default(0);
            $table->unsignedSmallInteger('correct')->default(0);
            $table->unsignedSmallInteger('in_correct')->default(0);
            $table->unsignedSmallInteger('all_questions')->default(0);
            $table->boolean('is_passed')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['user_id', 'type', 'theme_id']);
        });

        Schema::create('result_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('result_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('correct_answer_id')->nullable()->constrained('answers')->nullOnDelete();
            $table->foreignId('user_answer_id')->nullable()->constrained('answers')->nullOnDelete();
            $table->unsignedTinyInteger('status')->default(0);
            $table->unsignedTinyInteger('is_last')->default(0);
            $table->unsignedSmallInteger('order')->default(1);
            $table->timestamps();
            $table->unique(['result_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('result_questions');
        Schema::dropIfExists('results');
    }
};
