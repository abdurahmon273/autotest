<?php

namespace App\Services\Quiz;

use App\Enums\QuizEnum;
use App\Models\Question;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class TwentyQuizService extends QuizService
{
    public function type(): QuizEnum
    {
        return QuizEnum::TWENTY;
    }

    protected function questionsQuery(?int $themeId = null): Builder
    {
        return Question::inRandomOrder()->limit(QuizEnum::QUESTION_COUNT[$this->type()->value]);
    }

    protected function pickQuestions(User $user, ?int $themeId, string $lang): Collection
    {
        $ids = app(RandomQuizService::class)->twentyIds($user);

        return $this->loadByIds($ids, $lang);
    }
}
