<?php

namespace App\Services\Quiz;

use App\Enums\QuizEnum;
use App\Models\Question;
use App\Models\ResultQuestion;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class RandomQuizService
{
    public const TWENTY = 20;

    public const FIFTY = 50;

    public function twenty(?User $user = null): Collection
    {
        return $this->loadQuestions($this->twentyIds($user));
    }

    public function fifty(?User $user = null): Collection
    {
        return $this->loadQuestions($this->fiftyIds($user));
    }

    public function twentyIds(?User $user = null): array
    {
        return $this->pickIds(self::TWENTY, 1, $user);
    }

    public function fiftyIds(?User $user = null): array
    {
        return $this->pickIds(self::FIFTY, 3, $user);
    }

    public function pickIds(int $count, int $minPerTheme, ?User $user = null): array
    {
        $pool = $this->questionsByTheme();
        $wrong = $user ? $this->wrongQuestionIds($user) : [];
        $slow = $user ? $this->slowQuestionIds($user) : [];
        $themeCount = count($pool);
        if ($themeCount === 0) {
            return [];
        }

        $maxPerTheme = $this->maxPerTheme($count, $themeCount);
        $minPerTheme = $this->minPerTheme($count, $minPerTheme, $themeCount);

        $picked = [];
        $perTheme = array_fill_keys(array_keys($pool), 0);

        $themeIds = array_keys($pool);
        shuffle($themeIds);

        foreach ($themeIds as $themeId) {
            while ($perTheme[$themeId] < $minPerTheme) {
                $questionId = $this->takeOne($pool[$themeId], $picked);
                if ($questionId === null) {
                    break;
                }
                $picked[$questionId] = $themeId;
                $perTheme[$themeId]++;
            }
        }

        $extra = 0;
        while (count($picked) < $count && $themeIds) {
            $index = array_rand($themeIds);
            $themeId = $themeIds[$index];

            $preferred = $extra % 2 === 0 ? $wrong : $slow;
            $questionId = $perTheme[$themeId] < $maxPerTheme ? $this->takePreferredFirst($pool[$themeId], $picked, $preferred) : null;
            if ($questionId === null) {
                unset($themeIds[$index]);

                continue;
            }

            $picked[$questionId] = $themeId;
            $perTheme[$themeId]++;
            $extra++;
        }

        return array_keys($picked);
    }

    public function maxPerTheme(int $count, int $themeCount): int
    {
        return intdiv($count, $themeCount) + 1;
    }

    public function minPerTheme(int $count, int $wanted, int $themeCount): int
    {
        return min($wanted, intdiv($count, $themeCount));
    }

    private function questionsByTheme(): array
    {
        $rows = DB::table('question_theme')
            ->join('questions', 'questions.id', '=', 'question_theme.question_id')
            ->join('themes', 'themes.id', '=', 'question_theme.theme_id')
            ->whereNull('questions.deleted_at')
            ->whereNull('themes.deleted_at')
            ->where('themes.status', 1) // yashirin mavzular random quizga kirmaydi
            ->get(['question_theme.theme_id', 'question_theme.question_id']);

        $pool = [];
        foreach ($rows->groupBy('theme_id') as $themeId => $items) {
            $pool[$themeId] = $items->pluck('question_id')->shuffle()->all();
        }

        return $pool;
    }

    private function wrongQuestionIds(User $user): array
    {
        return ResultQuestion::where('user_id', $user->id)
            ->whereNotNull('user_answer_id')
            ->groupBy('question_id')
            ->havingRaw('SUM(user_answer_id = correct_answer_id) = 0')
            ->havingRaw('SUM(user_answer_id != correct_answer_id) > 1')
            ->pluck('question_id')
            ->flip()
            ->all();
    }

    private function slowQuestionIds(User $user): array
    {
        $latest = ResultQuestion::query()
            ->selectRaw('MAX(result_questions.id) as id')
            ->join('results', 'results.id', '=', 'result_questions.result_id')
            ->where('result_questions.user_id', $user->id)
            ->whereNotNull('result_questions.user_answer_id')
            ->whereIn('results.type', [QuizEnum::TWENTY, QuizEnum::FIFTY])
            ->groupBy('result_questions.question_id');

        return ResultQuestion::whereIn('id', $latest)
            ->where('timing_status', 1)
            ->pluck('question_id')
            ->flip()
            ->all();
    }

    private function takePreferredFirst(array &$ids, array $picked, array $preferred): ?int
    {
        foreach ($ids as $index => $id) {
            if (isset($preferred[$id]) && ! isset($picked[$id])) {
                unset($ids[$index]);

                return $id;
            }
        }

        return $this->takeOne($ids, $picked);
    }

    private function takeOne(array &$ids, array $picked): ?int
    {
        while ($ids) {
            $id = array_shift($ids);
            if (! isset($picked[$id])) {
                return $id;
            }
        }

        return null;
    }

    private function loadQuestions(array $ids): Collection
    {
        $order = array_flip($ids);

        return Question::with([
            'themes' => fn ($q) => $q->select('themes.id')->titled(),
            'answers' => fn ($q) => $q->select('id', 'question_id', 'text_krill', 'text_latin', 'is_correct', 'order')->orderBy('order'),
        ])
            ->whereIn('id', $ids)
            ->get()
            ->sortBy(fn ($q) => $order[$q->id])
            ->values();
    }
}
