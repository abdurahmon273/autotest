<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('themes', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('icon')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('type')->default(0);
            $table->text('question');
            $table->string('image')->nullable();
            $table->longText('instruction')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('question_theme', function (Blueprint $table) {
            $table->foreignId('theme_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->primary(['theme_id', 'question_id']);
        });

        Schema::create('answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->text('text');
            $table->unsignedTinyInteger('is_correct')->default(0);
            $table->unsignedTinyInteger('order')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('answers');
        Schema::dropIfExists('question_theme');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('themes');
    }
};
