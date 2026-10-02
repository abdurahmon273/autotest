<?php

namespace App\Http\Controllers\Api\User;

use App\Enums\QuizEnum;
use App\Http\Controllers\Controller;
use App\Models\Homework;
use App\Models\Result;
use App\Models\Theme;
use App\Services\Quiz\QuizService;
use App\Services\Quiz\TopicQuizService;
use App\Services\HomeworkService;
use App\Support\Lang;
use Illuminate\Http\Request;

class QuizController extends Controller
{
    public function me(Request $request)
    {
        return $request->user()->only('id', 'name', 'username');
    }

    public function languages(Request $request)
    {
        return ['list' => Lang::all(true), 'current' => Lang::forUser($request->user())];
    }

    /** Foydalanuvchi tilini saqlash. */
    public function setLang(Request $request)
    {
        $keys = array_column(Lang::all(true), 'key');
        $data = $request->validate(['lang' => ['required', 'string', \Illuminate\Validation\Rule::in($keys)]]);
        $request->user()->forceFill(['lang' => $data['lang']])->saveQuietly();

        return ['lang' => $data['lang']];
    }

    public function themes(Request $request)
    {
        return Theme::select('id', 'icon_type', 'icon')
            ->titled(Lang::pick($request->lang))
            ->orderBy('id')
            ->get();
    }

    /** Har mavzu uchun oxirgi yakunlangan natija foizi: {theme_id: percent}. Keshlanadi, natija yakunlanganda tozalanadi. */
    public function themesProgress(Request $request, TopicQuizService $service)
    {
        return (object) $service->progressForUser($request->user());
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

    public function show(Request $request, Result $result, HomeworkService $homeworks)
    {
        abort_unless($result->user_id === $request->user()->id, 403);

        return QuizService::for($result->type)->payload($result, Lang::pick($request->lang)) + ['homework_options' => $homeworks->optionsForResult($result)];
    }

    /** Menyu uchun: userning faol vazifalari (bo'sh bo'lsa bo'lim ko'rinmaydi). */
    public function homeworks(Request $request, HomeworkService $homeworks)
    {
        return $homeworks->listForUser($request->user(), Lang::pick($request->lang));
    }

    /** Yakunlangan natijani vazifa sifatida saqlash. */
    public function attachHomework(Request $request, Result $result, HomeworkService $homeworks)
    {
        abort_unless($result->user_id === $request->user()->id, 403);
        $data = $request->validate(['homework_id' => ['required', 'integer']]);
        $homework = Homework::where('user_id', $request->user()->id)->findOrFail($data['homework_id']);

        $homework = $homeworks->attach($result, $homework);

        return ['message' => 'Vazifa sifatida saqlandi.', 'homework' => $homeworks->summary($homework)];
    }

    public function texts(Request $request, Result $result)
    {
        abort_unless($result->user_id === $request->user()->id, 403);

        return QuizService::for($result->type)->texts($result, Lang::pick($request->lang));
    }

    public function answer(Request $request, Result $result, HomeworkService $homeworks)
    {
        abort_unless($result->user_id === $request->user()->id, 403);
        $data = $request->validate(['question_id' => ['required', 'integer'], 'answer_id' => ['required', 'integer'], 'time' => ['nullable', 'integer', 'min:0', 'max:86400']]);

        $res = QuizService::for($result->type)->answer($result, $data['question_id'], $data['answer_id'], (int) ($data['time'] ?? 0));
        if ($result->status === \App\Enums\ResultStatusEnum::FINISHED) {
            $res['homework_options'] = $homeworks->optionsForResult($result);
        }

        return $res;
    }

    public function finish(Request $request, Result $result)
    {
        abort_unless($result->user_id === $request->user()->id, 403);
        $service = QuizService::for($result->type);

        if ($result->status !== \App\Enums\ResultStatusEnum::FINISHED) {
            $service->finish($result, $service->isExpired($result));
        }

        return $service->summary($result->refresh());
    }

    public function lastThemeResult(Request $request, Theme $theme, TopicQuizService $service)
    {
        $last = $service->lastResult($request->user(), $theme->id);

        return $last ? $service->payload($last, Lang::pick($request->lang)) + ['homework_options' => app(HomeworkService::class)->optionsForResult($last)] : response()->json(null);
    }
}
