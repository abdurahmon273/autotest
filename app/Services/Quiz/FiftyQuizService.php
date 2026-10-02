<?php

namespace App\Services\Quiz;

use App\Enums\QuizEnum;
use App\Models\Question;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class FiftyQuizService extends QuizService
{
    public function type(): QuizEnum
    {
        return QuizEnum::FIFTY;
    }

    protected function questionsQuery(?int $themeId = null): Builder
    {
        return Question::inRandomOrder()->limit(QuizEnum::QUESTION_COUNT[$this->type()->value]);
    }

    protected function pickQuestions(User $user, ?int $themeId, string $lang): Collection
    {
        $ids = app(RandomQuizService::class)->fiftyIds($user);

        return $this->loadByIds($ids, $lang);
    }
}
