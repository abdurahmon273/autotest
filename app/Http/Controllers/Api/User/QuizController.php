<?php

namespace App\Http\Controllers\Api\User;

use App\Enums\QuizEnum;
use App\Http\Controllers\Controller;
use App\Models\Result;
use App\Models\Theme;
use App\Services\Quiz\QuizService;
use App\Services\Quiz\TopicQuizService;
use App\Support\Lang;
use Illuminate\Http\Request;

class QuizController extends Controller
{
    public function me(Request $request)
    {
        return $request->user()->only('id', 'name', 'username');
    }

    public function languages()
    {
        return Lang::all(true);
    }

    public function themes(Request $request)
    {
        return Theme::select('id', 'icon_type', 'icon')->titled(Lang::pick($request->lang))->orderBy('id')->get();
    }

    public function theme(Request $request, Theme $theme, TopicQuizService $service)
    {
        $last = $service->lastResult($request->user(), $theme->id);

        $lang = Lang::pick($request->lang);

        return [
            'theme' => ['id' => $theme->id, 'title' => ($lang === 'krill' ? $theme->title_krill : $theme->title) ?? $theme->title ?? $theme->title_krill, 'icon_type' => $theme->icon_type, 'icon' => $theme->icon, 'icon_url' => $theme->icon_url],
            'questions_count' => $theme->questions()->count(),
            'has_result' => (bool) $last,
            'last_result' => $last ? $service->summary($last) : null,
        ];
    }

    public function themeQuestions(Request $request, Theme $theme, TopicQuizService $service)
    {
        return $service->getThemeTests($theme->id, Lang::pick($request->lang));
    }

    public function startTheme(Request $request, Theme $theme, TopicQuizService $service)
    {
        abort_if($theme->questions()->doesntExist(), 422, 'Bu mavzuda savollar yo‘q.');

        $lang = Lang::pick($request->lang);

        return $service->payload($service->start($request->user(), $theme->id, $lang), $lang);
    }

    public function show(Request $request, Result $result)
    {
        abort_unless($result->user_id === $request->user()->id, 403);

        return QuizService::for($result->type)->payload($result, Lang::pick($request->lang));
    }

    public function texts(Request $request, Result $result)
    {
        abort_unless($result->user_id === $request->user()->id, 403);

        return QuizService::for($result->type)->texts($result, Lang::pick($request->lang));
    }

    public function answer(Request $request, Result $result)
    {
        abort_unless($result->user_id === $request->user()->id, 403);
        $data = $request->validate(['question_id' => ['required', 'integer'], 'answer_id' => ['required', 'integer']]);

        return QuizService::for($result->type)->answer($result, $data['question_id'], $data['answer_id']);
    }

    public function lastThemeResult(Request $request, Theme $theme, TopicQuizService $service)
    {
        $last = $service->lastResult($request->user(), $theme->id);

        return $last ? $service->payload($last, Lang::pick($request->lang)) : response()->json(null);
    }
}
