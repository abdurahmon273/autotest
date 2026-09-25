<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GlobalSetting extends Model
{
    protected $fillable = [
        'telegram_bot_token',
        'default_language_id',
        'max_attempts_count',
        'effective_at',
    ];

    protected function casts(): array
    {
        return ['effective_at' => 'datetime'];
    }

    public static function current(): static
    {
        return static::orderByDesc('effective_at')->orderByDesc('id')->firstOrNew();
    }
}
