<?php

namespace App\Services\Quiz;

use App\Enums\QuizEnum;
use App\Models\Question;
use App\Models\Result;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

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

    public function getThemeTests(int $themeId, string $lang = 'krill')
    {
        return $this->getQuestions($themeId, $lang);
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
