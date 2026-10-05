<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** chat_id uniqueness soft-deleted userlarni ham qamrab olardi; endi faqat tirik userlar bo'yicha validatsiyada tekshiriladi. */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['chat_id']);
            $table->index('chat_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['chat_id']);
            $table->unique('chat_id');
        });
    }
};
