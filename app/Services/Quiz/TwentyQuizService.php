<?php

namespace App\Services\Quiz;

use App\Enums\QuizEnum;
use App\Models\Question;
use Illuminate\Database\Eloquent\Builder;

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
}
