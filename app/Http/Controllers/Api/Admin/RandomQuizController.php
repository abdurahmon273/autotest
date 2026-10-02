<?php

namespace App\Http\Controllers\Api\Admin;


use App\Models\Theme;
use App\Models\User;
use App\Services\Quiz\RandomQuizService;
use Illuminate\Http\Request;

class RandomQuizController extends ApiController
{
    public function generate(Request $request, RandomQuizService $service)
    {
        $this->can('access_random_logic');

        $data = $request->validate([
            'count' => ['required', 'in:20,50'],
            'user_id' => ['nullable', 'exists:users,id'],
        ]);

        $user = isset($data['user_id']) ? User::find($data['user_id']) : null;
        $count = (int) $data['count'];

        $questions = $count === RandomQuizService::FIFTY ? $service->fifty($user) : $service->twenty($user);
        $themeCount = max(Theme::has('questions')->count(), 1);
        $wantedMin = $count === RandomQuizService::FIFTY ? 3 : 1;

        return [
            'count' => $count,
            'theme_count' => $themeCount,
            'min_per_theme' => $service->minPerTheme($count, $wantedMin, $themeCount),
            'max_per_theme' => $service->maxPerTheme($count, $themeCount),
            'user' => $user?->only('id', 'name', 'username'),
            'questions' => $questions->map(fn ($q, $i) => [
                'order' => $i + 1,
                'id' => $q->id,
                'question' => $q->question_latin ?: $q->question_krill,
                'image_url' => $q->image_url,
                'themes' => $q->themes->map(fn ($t) => ['id' => $t->id, 'title' => $t->title]),
                'correct' => $q->answers->firstWhere('is_correct', true)?->text_latin,
            ]),
        ];
    }
}
