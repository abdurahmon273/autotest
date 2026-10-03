<?php

namespace App\Models;

use App\Enums\QuizEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class GlobalSetting extends Model
{
    protected $fillable = [
        'telegram_bot_token',
        'default_language_id',
        'max_attempts_count',
        'default_quiz_image',
        'twenty_quiz_time',
        'fifty_quiz_time',
        'quiz_wait_time',
        'task_notification_time',
        'effective_at',
    ];

    public const DEFAULT_TWENTY_TIME = 25;

    public const DEFAULT_FIFTY_TIME = 60;

    public const DEFAULT_WAIT_TIME = 2;

    public const DEFAULT_TASK_NOTIFICATION_TIME = 4;

    public static function taskNotificationHours(): int
    {
        return (int) (static::current()->task_notification_time ?? self::DEFAULT_TASK_NOTIFICATION_TIME);
    }

    public static function examMinutes(QuizEnum $type): int
    {
        $s = static::current();

        return match ($type) {
            QuizEnum::TWENTY => (int) ($s->twenty_quiz_time ?? self::DEFAULT_TWENTY_TIME),
            QuizEnum::FIFTY => (int) ($s->fifty_quiz_time ?? self::DEFAULT_FIFTY_TIME),
            default => 0,
        };
    }

    public static function waitSeconds(): int
    {
        return (int) (static::current()->quiz_wait_time ?? self::DEFAULT_WAIT_TIME);
    }

    protected function casts(): array
    {
        return ['effective_at' => 'datetime'];
    }

    public static function current(): static
    {
        return static::orderByDesc('effective_at')->orderByDesc('id')->firstOrNew();
    }

    public const QUIZ_IMAGE_CACHE = 'settings.default_quiz_image_url';

    /** Rasmsiz savollar uchun standart rasm URL (keshlanadi, rasm o'zgarganda flush qilinadi). */
    public static function defaultQuizImageUrl(): ?string
    {
        return Cache::rememberForever(self::QUIZ_IMAGE_CACHE, function () {
            $path = static::current()->default_quiz_image;

            return $path && Storage::disk('public')->exists($path) ? Storage::url($path).'?v='.Storage::disk('public')->lastModified($path) : null;
        }) ?: null;
    }

    public static function flushQuizImage(): void
    {
        Cache::forget(self::QUIZ_IMAGE_CACHE);
    }
}
