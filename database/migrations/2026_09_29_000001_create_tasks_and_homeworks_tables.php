<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->dateTime('start_date');
            $table->dateTime('end_date');
            $table->unsignedTinyInteger('passing_percentage');
            $table->unsignedSmallInteger('min_test_count');
            $table->unsignedTinyInteger('status')->default(1)->comment('1 - accessible, 0 - expired');
            $table->foreignId('group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('theme_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['group_id', 'status']);
            $table->index(['status', 'end_date']);
        });

        Schema::create('homeworks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('status')->default(0);
            $table->unsignedTinyInteger('percentage')->default(0);
            $table->unsignedSmallInteger('tests_count')->default(0);
            $table->timestamps();
            $table->unique(['task_id', 'user_id']);
        });

        Schema::table('results', function (Blueprint $table) {
            $table->foreignId('homework_id')->nullable()->after('theme_id')->constrained('homeworks')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('results', function (Blueprint $table) {
            $table->dropConstrainedForeignId('homework_id');
        });
        Schema::dropIfExists('homeworks');
        Schema::dropIfExists('tasks');
    }
};
