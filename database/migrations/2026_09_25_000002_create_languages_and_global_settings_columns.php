<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('languages', function (Blueprint $table) {
            $table->id();
            $table->string('title', 64);
            $table->string('code', 16)->unique();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('global_settings', function (Blueprint $table) {
            $table->foreignId('default_language_id')->nullable()->after('telegram_bot_token')->constrained('languages')->nullOnDelete();
            $table->unsignedSmallInteger('max_attempts_count')->default(3)->after('default_language_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedSmallInteger('max_attempts')->default(3)->after('chat_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('max_attempts'));
        Schema::table('global_settings', function (Blueprint $t) {
            $t->dropConstrainedForeignId('default_language_id');
            $t->dropColumn('max_attempts_count');
        });
        Schema::dropIfExists('languages');
    }
};
