<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\QuizEnum;
use App\Enums\ResultStatusEnum;
use App\Models\Homework;
use App\Models\Result;
use App\Models\Group;
use App\Models\Role;
use App\Models\Theme;
use App\Models\User;
use Illuminate\Http\Request;

/** O'quvchi natijalari: uyga vazifaga bog'langan, yakunlangan resultlar bo'yicha yig'indilar. */
class StudentResultController extends ApiController
{
    public function index(Request $request)
    {
        $this->can('access_student');

        $groups = array_filter((array) $request->input('groups', []));
        $themes = array_filter((array) $request->input('themes', []));
        // Natija turlari: exam (20/50 talik), homework (vazifaga saqlangan), training (erkin mashg'ulot). Bo'sh = hammasi.
        $kinds = array_values(array_intersect((array) $request->input('kinds', []), ['exam', 'homework', 'training']));

        $scope = fn ($q) => $q
            ->where('status', ResultStatusEnum::FINISHED)
            ->when($themes, fn ($q) => $q->whereIn('theme_id', $themes))
            ->when($kinds && count($kinds) < 3, fn ($q) => $q->where(function ($q) use ($kinds) {
                foreach ($kinds as $k) {
                    $q->orWhere(fn ($q) => match ($k) {
                        'exam' => $q->whereIn('type', [QuizEnum::TWENTY, QuizEnum::FIFTY]),
                        'homework' => $q->whereNotNull('homework_id'),
                        'training' => $q->where('type', QuizEnum::TOPIC)->whereNull('homework_id'),
                    });
                }
            }));

        return User::withRole(Role::STUDENT)
            ->select('id', 'name', 'phone', 'username', 'created_at')
            ->with('groups:groups.id,name')
            ->withSum(['results as correct_sum' => $scope], 'correct')
            ->withSum(['results as in_correct_sum' => $scope], 'in_correct')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('username', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")))
            ->when($groups, fn ($q) => $q->whereHas('groups', fn ($q) => $q->whereIn('groups.id', $groups)))
            // Eng ko'p yechgan va eng yuqori foiz birinchi, umuman yechmaganlar oxirida
            ->orderByRaw('(COALESCE(correct_sum, 0) + COALESCE(in_correct_sum, 0)) DESC, (COALESCE(correct_sum, 0) / NULLIF(COALESCE(correct_sum, 0) + COALESCE(in_correct_sum, 0), 0)) DESC, name ASC')
            ->paginate(15);
    }

    /** O'quvchi sahifasi: profil + umumiy statistika (3 bo'lim bo'yicha sonlar). */
    public function show(int $id)
    {
        $this->can('show_student');

        $u = User::withRole(Role::STUDENT)->with('groups:groups.id,name')->findOrFail($id);
        $hwStatus = Homework::where('user_id', $u->id)->selectRaw('status, count(*) c')->groupBy('status')->pluck('c', 'status');
        $exam = Result::where('user_id', $u->id)->whereIn('type', [QuizEnum::TWENTY, QuizEnum::FIFTY])
            ->selectRaw('count(*) c, sum(status = 1 and is_passed) p, sum(status = 0) u')->first();
        $train = Result::where('user_id', $u->id)->where('type', QuizEnum::TOPIC)->whereNull('homework_id')
            ->selectRaw('count(*) c, count(distinct theme_id) t, sum(status = 0) u')->first();
        $last = Result::where('user_id', $u->id)->latest('updated_at')->value('updated_at');

        return [
            'student' => $u->only('id', 'name', 'username', 'phone', 'phone_formatted', 'chat_id', 'max_attempts', 'lang', 'created_at', 'updated_at') + [
                'groups' => $u->groups,
                'last_activity_at' => $last,
                'blocked' => (int) $u->max_attempts <= 0,
            ],
            'summary' => [
                'homeworks' => ['total' => (int) $hwStatus->sum(), 'passed' => (int) ($hwStatus[Homework::STATUS_PASSED] ?? 0), 'progress' => (int) ($hwStatus[Homework::STATUS_PROGRESS] ?? 0), 'failed' => (int) ($hwStatus[Homework::STATUS_FAILED] ?? 0)],
                'exams' => ['total' => (int) $exam->c, 'passed' => (int) $exam->p, 'unfinished' => (int) $exam->u],
                'trainings' => ['total' => (int) $train->c, 'themes' => (int) $train->t, 'unfinished' => (int) $train->u],
            ],
        ];
    }

    /** Uyga vazifalar bo'limi: homeworks + task + theme, statistikasi bilan. */
    public function homeworks(Request $request, int $id)
    {
        $this->can('show_student');

        $base = Homework::where('user_id', $id)
            ->join('tasks', 'tasks.id', '=', 'homeworks.task_id')
            ->when($request->filled('status'), fn ($q) => $q->where('homeworks.status', (int) $request->status))
            ->when($request->search, fn ($q, $s) => $q->where('tasks.title', 'like', "%{$s}%"))
            ->when(array_filter((array) $request->input('themes', [])), fn ($q, $t) => $q->whereIn('tasks.theme_id', $t));
        $base = $this->taskOverlap($request, $base, 'tasks.');
        $base = $this->overlapRange($request, $base, 'tasks.start_date', 'tasks.end_date');

        $stats = (clone $base)->selectRaw('count(*) total, sum(homeworks.status = 2) passed, sum(homeworks.status = 1) progress, sum(homeworks.status = 0) failed, round(avg(homeworks.percentage)) avg_percentage')->first();

        $rows = (clone $base)
            ->leftJoin('themes', 'themes.id', '=', 'tasks.theme_id')
            ->leftJoin('groups', 'groups.id', '=', 'tasks.group_id')
            ->select([
                'homeworks.id', 'homeworks.status', 'homeworks.percentage', 'homeworks.tests_count', 'homeworks.updated_at',
                'tasks.id as task_id', 'tasks.title', 'tasks.status as task_status', 'tasks.min_test_count', 'tasks.passing_percentage', 'tasks.start_date', 'tasks.end_date', 'tasks.group_id',
                'groups.name as group_name', 'themes.id as theme_id', 'themes.title as theme_title', 'themes.title_krill as theme_title_krill', 'themes.icon_type as theme_icon_type', 'themes.icon as theme_icon',
            ])
            ->withSum(['results as correct_sum' => fn ($q) => $q->where('status', ResultStatusEnum::FINISHED)], 'correct')
            ->withSum(['results as in_correct_sum' => fn ($q) => $q->where('status', ResultStatusEnum::FINISHED)], 'in_correct')
            ->withCount(['results' => fn ($q) => $q->where('status', ResultStatusEnum::FINISHED)])
            ->orderByDesc('homeworks.id')
            ->paginate(15);

        return $rows->toArray() + ['stats' => $this->ints($stats)];
    }

    /** Imtihonlar: 20 / 50 talik natijalar. */
    public function exams(Request $request, int $id)
    {
        $this->can('show_student');

        $base = Result::where('user_id', $id)
            ->whereIn('type', $request->type && in_array($request->type, ['20_TALIK', '50_TALIK']) ? [$request->type] : [QuizEnum::TWENTY, QuizEnum::FIFTY]);
        $base = $this->outcomeFilter($request, $base);
        $base = $this->dateRange($request, $base, 'created_at');

        $stats = (clone $base)
            ->selectRaw('count(*) total, sum(status = 1 and is_passed) passed, sum(status = 1 and not is_passed) failed, sum(status = 0) unfinished, round(avg(case when status = 1 then correct * 100 / nullif(correct + in_correct, 0) end)) avg_percentage, max(case when status = 1 then round(correct * 100 / nullif(correct + in_correct, 0)) end) best_percentage, sum(type = ?) twenty, sum(type = ?) fifty', [QuizEnum::TWENTY->value, QuizEnum::FIFTY->value])
            ->first();

        $rows = (clone $base)->orderByDesc('id')->paginate(15, ['id', 'type', 'status', 'correct', 'in_correct', 'all_questions', 'is_passed', 'created_at', 'updated_at']);

        return $rows->toArray() + ['stats' => $this->ints($stats)];
    }

    /** O'quv mashg'ulotlari: mavzu bo'yicha natijalar (vazifaga bog'langanlari belgilanadi). */
    public function trainings(Request $request, int $id)
    {
        $this->can('show_student');

        // Faqat uyga vazifadan tashqari (erkin) mashg'ulotlar
        $base = Result::where('user_id', $id)->where('type', QuizEnum::TOPIC)->whereNull('homework_id')
            ->when(array_filter((array) $request->input('themes', [])), fn ($q, $t) => $q->whereIn('theme_id', $t));
        $base = $this->outcomeFilter($request, $base);
        $base = $this->dateRange($request, $base, 'created_at');

        $stats = (clone $base)
            ->selectRaw('count(*) total, count(distinct theme_id) themes, sum(status = 1 and is_passed) passed, sum(status = 0) unfinished, round(avg(case when status = 1 then correct * 100 / nullif(correct + in_correct, 0) end)) avg_percentage, sum(correct) correct, sum(in_correct) in_correct')
            ->first();

        $rows = (clone $base)->with(['theme' => fn ($q) => $q->withTrashed()->select('id', 'title', 'title_krill', 'icon_type', 'icon', 'deleted_at')])->orderByDesc('id')
            ->paginate(15, ['id', 'theme_id', 'homework_id', 'status', 'correct', 'in_correct', 'all_questions', 'is_passed', 'created_at', 'updated_at']);

        return $rows->toArray() + ['stats' => $this->ints($stats)];
    }

    /** passed: 1 — o'tgan, 0 — o'ta olmagan, unfinished — tugallanmagan. Bo'sh — hammasi. */
    private function outcomeFilter(Request $request, $q)
    {
        return match ((string) $request->passed) {
            '1' => $q->where('status', ResultStatusEnum::FINISHED)->where('is_passed', true),
            '0' => $q->where('status', ResultStatusEnum::FINISHED)->where('is_passed', false),
            'unfinished' => $q->where('status', ResultStatusEnum::IN_PROGRESS),
            default => $q,
        };
    }

    /** Vazifa muddati from/to oralig'i bilan kesishsa chiqadi (boshlangan va hali tugamagan vazifalar ham). */
    private function overlapRange(Request $request, $q, string $startColumn, string $endColumn)
    {
        return $q
            ->when($request->from, fn ($q, $d) => $q->where($endColumn, '>=', \Carbon\Carbon::parse($d)->startOfDay()))
            ->when($request->to, fn ($q, $d) => $q->where($startColumn, '<', \Carbon\Carbon::parse($d)->addDay()->startOfDay()));
    }

    /** from/to (Y-m-d) bo'yicha sana oralig'i; to kunining oxirigacha. */
    /** Bo'limlar: har bo'lim bo'yicha o'quvchi natijalari (vazifa / mashg'ulot turlari, sana oralig'i). */
    public function themes(Request $request, int $id)
    {
        $this->can('show_student');

        $kinds = array_values(array_intersect((array) $request->input('kinds', ['homework', 'training']), ['homework', 'training'])) ?: ['homework', 'training'];
        $base = Result::where('user_id', $id)->where('status', ResultStatusEnum::FINISHED)->where('type', QuizEnum::TOPIC)->whereNotNull('theme_id')
            ->when(count($kinds) === 1, fn ($q) => $kinds[0] === 'homework' ? $q->whereNotNull('homework_id') : $q->whereNull('homework_id'));
        $base = $this->dateRange($request, $base, 'created_at');

        $agg = $base->selectRaw('theme_id, count(*) attempts, sum(homework_id is not null) hw_attempts, sum(is_passed) passed, sum(correct) correct, sum(in_correct) in_correct, max(created_at) last_at, max(round(correct * 100 / nullif(correct + in_correct, 0))) best')
            ->groupBy('theme_id')->get()->keyBy('theme_id');

        $hw = Homework::where('user_id', $id)->join('tasks', 'tasks.id', '=', 'homeworks.task_id')->whereNull('tasks.deleted_at')
            ->selectRaw('tasks.theme_id, count(*) tasks_count, sum(homeworks.status = 2) hw_passed, sum(homeworks.status = 0) hw_failed, sum(homeworks.status = 1) hw_progress')
            ->groupBy('tasks.theme_id')->get()->keyBy('theme_id');

        $rows = Theme::withTrashed()->ordered()->get(['id', 'title', 'title_krill', 'icon_type', 'icon', 'deleted_at'])->map(function ($t) use ($agg, $hw) {
            $a = $agg[$t->id] ?? null; $h = $hw[$t->id] ?? null;
            $c = (int) ($a->correct ?? 0); $ic = (int) ($a->in_correct ?? 0);

            return $t->toArray() + [
                'attempts' => (int) ($a->attempts ?? 0), 'hw_attempts' => (int) ($a->hw_attempts ?? 0), 'passed' => (int) ($a->passed ?? 0),
                'correct' => $c, 'in_correct' => $ic, 'total' => $c + $ic, 'percentage' => $c + $ic ? (int) round($c * 100 / ($c + $ic)) : 0, 'best' => (int) ($a->best ?? 0), 'last_at' => $a->last_at ?? null,
                'tasks_count' => (int) ($h->tasks_count ?? 0), 'hw_passed' => (int) ($h->hw_passed ?? 0), 'hw_failed' => (int) ($h->hw_failed ?? 0), 'hw_progress' => (int) ($h->hw_progress ?? 0),
            ];
        })->filter(fn ($t) => $t['attempts'] > 0 || $t['tasks_count'] > 0 || ! $t['deleted_at']);

        if ($request->filled('solved')) {
            $rows = $rows->filter(fn ($t) => (bool) (int) $request->solved === ($t['attempts'] > 0));
        }

        $sorted = $rows->sortBy([['attempts', 'desc'], ['percentage', 'desc'], ['title', 'asc']])->values();
        $page = max(1, (int) $request->input('page', 1));
        $paginator = new \Illuminate\Pagination\LengthAwarePaginator($sorted->forPage($page, 15)->values(), $sorted->count(), 15, $page);

        return $paginator->toArray() + ['stats' => ['solved_themes' => $rows->where('attempts', '>', 0)->count(), 'themes_total' => $rows->count(), 'attempts' => (int) $rows->sum('attempts'), 'correct' => (int) $rows->sum('correct'), 'in_correct' => (int) $rows->sum('in_correct')]];
    }

    /** Vazifa muddati tanlangan oraliq bilan kesishsa chiqadi (kelajakdagi va davom etayotgan vazifalar yo'qolmaydi). */
    private function taskOverlap(Request $request, $q, string $prefix = '')
    {
        return $q
            ->when($request->from, fn ($q, $d) => $q->where($prefix.'end_date', '>=', \Carbon\Carbon::parse($d)->startOfDay()))
            ->when($request->to, fn ($q, $d) => $q->where($prefix.'start_date', '<', \Carbon\Carbon::parse($d)->addDay()->startOfDay()));
    }

    private function dateRange(Request $request, $q, string $column)
    {
        return $q
            ->when($request->from, fn ($q, $d) => $q->where($column, '>=', \Carbon\Carbon::parse($d)->startOfDay()))
            ->when($request->to, fn ($q, $d) => $q->where($column, '<', \Carbon\Carbon::parse($d)->addDay()->startOfDay()));
    }

    private function ints($row): array
    {
        return array_map(fn ($v) => $v === null ? 0 : (int) $v, (array) $row->getAttributes());
    }

    /** Filtr uchun guruhlar va bo'limlar. */
    public function filters()
    {
        $this->can('access_student');

        return [
            'groups' => Group::orderBy('name')->get(['id', 'name']),
            'themes' => Theme::ordered()->get(['id', 'title', 'title_krill', 'icon_type', 'icon']),
        ];
    }
}
