<?php

namespace App\Services\Quiz;

use App\Enums\QuizEnum;
use App\Enums\ResultQuestionStatusEnum;
use App\Enums\ResultStatusEnum;
use App\Models\Answer;
use App\Models\Result;
use App\Models\ResultQuestion;
use App\Models\User;
use App\Support\Lang;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

abstract class QuizService
{
    abstract public function type(): QuizEnum;

    abstract protected function questionsQuery(?int $themeId = null): Builder;

    protected function textColumns(string $lang): array
    {
        $o = Lang::other($lang);

        return [
            DB::raw("COALESCE(question_{$lang}, question_{$o}) as question"),
            DB::raw("COALESCE(instruction_{$lang}, instruction_{$o}) as instruction"),
        ];
    }

    protected function answerColumns(string $lang): string
    {
        $o = Lang::other($lang);

        return "answers:id,question_id,order,COALESCE(text_{$lang}, text_{$o}) as text";
    }

    public function getQuestions(?int $themeId = null, string $lang = 'krill'): Collection
    {
        return $this->questionsQuery($themeId)
            ->select('id', 'image', ...$this->textColumns($lang))
            ->with(['answers' => fn ($q) => $q->select('id', 'question_id', 'order', DB::raw("COALESCE(text_{$lang}, text_".Lang::other($lang).") as text"))])
            ->get();
    }

    public function texts(Result $result, string $lang): Collection
    {
        $ids = $result->questions()->pluck('question_id');

        return \App\Models\Question::whereIn('id', $ids)
            ->select('id', ...$this->textColumns($lang))
            ->with(['answers' => fn ($q) => $q->select('id', 'question_id', 'order', DB::raw("COALESCE(text_{$lang}, text_".Lang::other($lang).") as text"))])
            ->get()
            ->map(fn ($q) => ['id' => $q->id, 'question' => $q->question, 'instruction' => $q->instruction, 'answers' => $q->answers->map->only('id', 'text')->values()]);
    }

    public function start(User $user, ?int $themeId = null, string $lang = 'krill'): Result
    {
        $questions = $this->getQuestions($themeId, $lang);

        return DB::transaction(function () use ($user, $themeId, $questions) {
            $result = Result::create([
                'user_id' => $user->id,
                'type' => $this->type(),
                'theme_id' => $themeId,
                'status' => ResultStatusEnum::IN_PROGRESS,
                'all_questions' => $questions->count(),
            ]);

            $now = now();
            ResultQuestion::insert($questions->values()->map(fn ($q, $i) => [
                'result_id' => $result->id,
                'question_id' => $q->id,
                'user_id' => $user->id,
                'order' => $i + 1,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all());

            $result->setRelation('quizQuestions', $questions);

            return $result;
        });
    }

    public function answer(Result $result, int $questionId, int $answerId): array
    {
        $rq = $result->questions()->where('question_id', $questionId)->firstOrFail();
        abort_if($rq->status !== ResultQuestionStatusEnum::UNANSWERED, 422, 'Bu savolga javob berilgan.');
        abort_if($result->status === ResultStatusEnum::FINISHED, 422, 'Test yakunlangan.');

        $answers = Answer::where('question_id', $questionId)->get(['id', 'is_correct']);
        $correct = $answers->firstWhere('is_correct', 1);
        abort_unless($answers->contains('id', $answerId), 422, 'Javob topilmadi.');

        $isCorrect = $correct && $correct->id === $answerId;

        DB::transaction(function () use ($result, $rq, $answerId, $correct, $isCorrect) {
            $result->questions()->where('is_last', 1)->update(['is_last' => 0]);
            $rq->update([
                'user_answer_id' => $answerId,
                'correct_answer_id' => $correct?->id,
                'status' => $isCorrect ? ResultQuestionStatusEnum::CORRECT : ResultQuestionStatusEnum::INCORRECT,
                'is_last' => 1,
            ]);
            $isCorrect ? $result->increment('correct') : $result->increment('in_correct');

            $limit = $this->type()->minIncorrectCount();
            $exceeded = $limit > 0 && $result->in_correct > $limit;
            $unanswered = $result->questions()->where('status', ResultQuestionStatusEnum::UNANSWERED)->exists();

            if ($exceeded || ! $unanswered) {
                $this->finish($result);
            }
        });

        return [
            'is_correct' => $isCorrect,
            'correct_answer_id' => $correct?->id,
            'result' => $this->summary($result->refresh()),
        ];
    }

    public function finish(Result $result): Result
    {
        $limit = $this->type()->minIncorrectCount();
        $result->update([
            'status' => ResultStatusEnum::FINISHED,
            'is_passed' => $limit > 0 ? $result->in_correct <= $limit : true,
        ]);

        return $result;
    }

    public function summary(Result $result): array
    {
        return [
            'id' => $result->id,
            'type' => $result->type->value,
            'status' => $result->status->value,
            'correct' => $result->correct,
            'in_correct' => $result->in_correct,
            'all_questions' => $result->all_questions,
            'is_passed' => $result->is_passed,
            'min_incorrect_count' => $result->type->minIncorrectCount(),
            'created_at' => $result->created_at,
        ];
    }

    public function payload(Result $result, string $lang = 'krill'): array
    {
        $rqs = $result->questions()->get(['question_id', 'status', 'user_answer_id', 'correct_answer_id', 'is_last', 'order'])->keyBy('question_id');
        $questions = $result->relationLoaded('quizQuestions')
            ? $result->quizQuestions
            : \App\Models\Question::whereIn('id', $rqs->keys())->select('id', 'image', ...$this->textColumns($lang))->with(['answers' => fn ($q) => $q->select('id', 'question_id', 'order', DB::raw("COALESCE(text_{$lang}, text_".Lang::other($lang).") as text"))])->get();

        return $this->summary($result) + [
            'lang' => $lang,
            'questions' => $questions->sortBy(fn ($q) => $rqs[$q->id]->order)->values()->map(fn ($q) => [
                'id' => $q->id,
                'question' => $q->question,
                'image' => $q->image_url,
                'instruction' => $q->instruction,
                'answers' => $q->answers->map->only('id', 'text')->values(),
                'status' => $rqs[$q->id]->status->value,
                'user_answer_id' => $rqs[$q->id]->user_answer_id,
                'correct_answer_id' => $rqs[$q->id]->status === ResultQuestionStatusEnum::UNANSWERED ? null : $rqs[$q->id]->correct_answer_id,
                'is_last' => $rqs[$q->id]->is_last,
            ]),
        ];
    }

    public static function for(QuizEnum $type): static
    {
        return match ($type) {
            QuizEnum::TWENTY => new TwentyQuizService,
            QuizEnum::FIFTY => new FiftyQuizService,
            QuizEnum::TOPIC => new TopicQuizService,
        };
    }
}
