<?php

namespace App\Services\Quiz;

use App\Enums\QuizEnum;
use App\Enums\ResultStatusEnum;
use App\Models\Question;
use App\Models\Result;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

class TopicQuizService extends QuizService
{
    public function type(): QuizEnum
    {
        return QuizEnum::TOPIC;
    }

    protected function questionsQuery(?int $themeId = null): Builder
    {
        return Question::whereHas('themes', fn ($q) => $q->where('themes.id', $themeId))->orderBy('id');
    }

    /** Har boshlashda savollar tasodifiy tartibda; tartib result_questions.order ga yoziladi va keyin o'zgarmaydi. */
    protected function pickQuestions(User $user, ?int $themeId, string $lang): \Illuminate\Support\Collection
    {
        return $this->getQuestions($themeId, $lang)->shuffle()->values();
    }

    public function getThemeTests(int $themeId, string $lang = 'krill')
    {
        return $this->getQuestions($themeId, $lang);
    }

    public static function progressKey(int $userId): string
    {
        return 'user_theme_progress_'.$userId;
    }

    public static function flushProgress(int $userId): void
    {
        Cache::forget(self::progressKey($userId));
    }

    /** {theme_id: percent} — faqat oxirgi yakunlangan natija. Natija bo'lmasa bo'sh massiv keshlanadi, qayta query ketmaydi. */
    public function progressForUser(User $user): array
    {
        return Cache::remember(self::progressKey($user->id), 3600, function () use ($user) {
            $base = Result::where('user_id', $user->id)
                ->where('type', QuizEnum::TOPIC)
                ->where('status', ResultStatusEnum::FINISHED)
                ->whereNotNull('theme_id');

            if (! (clone $base)->exists()) {
                return [];
            }

            $latest = (clone $base)->selectRaw('MAX(id)')->groupBy('theme_id');

            return Result::whereIn('id', $latest)
                ->selectRaw('theme_id, ROUND(correct * 100 / NULLIF(correct + in_correct, 0)) as percent')
                ->pluck('percent', 'theme_id')
                ->map(fn ($p) => (int) $p)
                ->all();
        });
    }

    public function lastResult(User $user, int $themeId): ?Result
    {
        return Result::where('user_id', $user->id)
            ->where('type', QuizEnum::TOPIC)
            ->where('theme_id', $themeId)
            ->latest('id')
            ->first();
    }
}
