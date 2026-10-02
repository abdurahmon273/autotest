<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\QuizEnum;
use App\Enums\ResultStatusEnum;
use App\Models\Group;
use App\Models\Homework;
use App\Models\Result;
use App\Models\Task;
use App\Models\Theme;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Guruhlar bo'yicha natijalar: qamrov, vazifalar bajarilishi, o'quvchilar ko'rsatkichlari. */
class GroupResultController extends ApiController
{
    /** Ro'yxat: har guruh uchun asosiy ko'rsatkichlar bitta so'rovda (subquery select). */
    public function index(Request $request)
    {
        $this->can('access_group');

        $themesTotal = max(1, Theme::count());
        $hw = fn (string $expr) => Homework::selectRaw($expr)->join('tasks', 'tasks.id', '=', 'homeworks.task_id')->whereColumn('tasks.group_id', 'groups.id')->whereNull('tasks.deleted_at');

        $rows = Group::query()
            ->select('groups.id', 'groups.name', 'groups.description', 'groups.telegram_chat_id', 'groups.created_at')
            ->withCount('students')
            ->addSelect([
                'tasks_count' => Task::selectRaw('count(*)')->whereColumn('group_id', 'groups.id'),
                'active_tasks' => Task::selectRaw('count(*)')->whereColumn('group_id', 'groups.id')->where('status', Task::STATUS_ACCESSIBLE)->where('end_date', '>', now()),
                'themes_covered' => Task::selectRaw('count(distinct theme_id)')->whereColumn('group_id', 'groups.id'),
                'hw_total' => $hw('count(*)'),
                'hw_passed' => $hw('sum(homeworks.status = 2)'),
                'hw_failed' => $hw('sum(homeworks.status = 0)'),
                'hw_avg' => $hw('round(avg(homeworks.percentage))')->where('homeworks.tests_count', '>', 0),
                'blocked_students' => DB::table('group_user')->selectRaw('count(*)')->join('users', 'users.id', '=', 'group_user.user_id')->whereColumn('group_user.group_id', 'groups.id')->where('users.max_attempts', '<=', 0)->whereNull('users.deleted_at'),
                'last_task_at' => Task::select('end_date')->whereColumn('group_id', 'groups.id')->orderByDesc('end_date')->limit(1),
            ])
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q->where('groups.name', 'like', "%{$s}%")->orWhere('groups.description', 'like', "%{$s}%")))
            ->when($request->activity === 'active', fn ($q) => $q->has('tasks'))
            ->when($request->activity === 'idle', fn ($q) => $q->doesntHave('tasks'))
            ->orderByDesc('themes_covered')->orderByDesc('hw_passed')->orderBy('groups.name')
            ->paginate(15);

        $rows->getCollection()->transform(fn ($g) => $this->decorate($g, $themesTotal));

        return $rows->toArray() + ['themes_total' => $themesTotal];
    }

    /** Guruh sahifasi: profil + umumiy ko'rsatkichlar. */
    public function show(int $id)
    {
        $this->can('show_group');

        $g = Group::withCount('students')->findOrFail($id);
        $themesTotal = max(1, Theme::count());
        $tasks = Task::where('group_id', $id)->selectRaw('count(*) total, sum(status = 1 and end_date > now()) active, sum(status = 0 or end_date <= now()) finished, count(distinct theme_id) covered, min(start_date) first_at, max(end_date) last_at')->first();
        $hw = Homework::join('tasks', 'tasks.id', '=', 'homeworks.task_id')->where('tasks.group_id', $id)->whereNull('tasks.deleted_at')
            ->selectRaw('count(*) total, sum(homeworks.status = 2) passed, sum(homeworks.status = 1) progress, sum(homeworks.status = 0) failed, round(avg(case when homeworks.tests_count > 0 then homeworks.percentage end)) avg_percentage, sum(homeworks.tests_count) answered')->first();
        $studentIds = $g->students()->pluck('users.id');
        $res = Result::whereIn('user_id', $studentIds)->where('status', ResultStatusEnum::FINISHED)
            ->selectRaw('sum(correct) correct, sum(in_correct) in_correct, sum(homework_id is not null) hw_results, sum(type in (?, ?)) exams, sum(type in (?, ?) and is_passed) exams_passed, sum(type = ? and homework_id is null) trainings', [QuizEnum::TWENTY->value, QuizEnum::FIFTY->value, QuizEnum::TWENTY->value, QuizEnum::FIFTY->value, QuizEnum::TOPIC->value])->first();
        $blocked = $g->students()->where('max_attempts', '<=', 0)->count();
        $activeStudents = Result::whereIn('user_id', $studentIds)->where('created_at', '>=', now()->subDays(7))->distinct('user_id')->count('user_id');

        $covered = (int) $tasks->covered;

        return [
            'group' => $g->only('id', 'name', 'description', 'telegram_chat_id', 'students_count', 'created_at'),
            'summary' => [
                'themes_total' => $themesTotal,
                'themes_covered' => $covered,
                'coverage' => (int) round($covered * 100 / $themesTotal),
                'tasks' => ['total' => (int) $tasks->total, 'active' => (int) $tasks->active, 'finished' => (int) $tasks->finished, 'first_at' => $tasks->first_at, 'last_at' => $tasks->last_at],
                'homeworks' => ['total' => (int) $hw->total, 'passed' => (int) $hw->passed, 'progress' => (int) $hw->progress, 'failed' => (int) $hw->failed, 'avg_percentage' => (int) $hw->avg_percentage, 'answered' => (int) $hw->answered,
                    'pass_rate' => ($d = (int) $hw->passed + (int) $hw->failed) ? (int) round((int) $hw->passed * 100 / $d) : 0],
                'results' => ['correct' => (int) $res->correct, 'in_correct' => (int) $res->in_correct, 'percentage' => ($t = (int) $res->correct + (int) $res->in_correct) ? (int) round((int) $res->correct * 100 / $t) : 0,
                    'exams' => (int) $res->exams, 'exams_passed' => (int) $res->exams_passed, 'trainings' => (int) $res->trainings, 'hw_results' => (int) $res->hw_results],
                'students' => ['total' => $g->students_count, 'blocked' => $blocked, 'active_week' => $activeStudents],
            ],
        ];
    }

    /** O'quvchilar: vazifaga bog'langan natijalar bo'yicha yig'indilar + homework holatlari (sana oralig'i: natija sanasi). */
    public function students(Request $request, int $id)
    {
        $this->can('show_group');

        $scope = fn ($q) => $this->dateRange($request, $q->where('status', ResultStatusEnum::FINISHED)->whereNotNull('homework_id'), 'created_at');
        $hwScope = fn ($q) => $q->whereHas('task', fn ($t) => $t->where('group_id', $id));

        $rows = Group::findOrFail($id)->students()
            ->select('users.id', 'users.name', 'users.username', 'users.phone', 'users.max_attempts')
            ->withSum(['results as correct_sum' => $scope], 'correct')
            ->withSum(['results as in_correct_sum' => $scope], 'in_correct')
            ->withCount(['homeworks as hw_passed' => fn ($q) => $hwScope($q)->where('homeworks.status', Homework::STATUS_PASSED)])
            ->withCount(['homeworks as hw_failed' => fn ($q) => $hwScope($q)->where('homeworks.status', Homework::STATUS_FAILED)])
            ->withCount(['homeworks as hw_progress' => fn ($q) => $hwScope($q)->where('homeworks.status', Homework::STATUS_PROGRESS)])
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q->where('users.name', 'like', "%{$s}%")->orWhere('users.username', 'like', "%{$s}%")->orWhere('users.phone', 'like', "%{$s}%")))
            ->when($request->status === 'blocked', fn ($q) => $q->where('users.max_attempts', '<=', 0))
            ->when($request->status === 'active', fn ($q) => $q->where('users.max_attempts', '>', 0))
            ->orderByRaw('(COALESCE(correct_sum, 0) + COALESCE(in_correct_sum, 0)) DESC, (COALESCE(correct_sum, 0) / NULLIF(COALESCE(correct_sum, 0) + COALESCE(in_correct_sum, 0), 0)) DESC, users.name ASC')
            ->paginate(15, ['users.id', 'users.name', 'users.username', 'users.phone', 'users.max_attempts']);

        $rows->getCollection()->transform(fn ($u) => $u->only('id', 'name', 'username', 'phone', 'max_attempts', 'correct_sum', 'in_correct_sum', 'hw_passed', 'hw_failed', 'hw_progress'));

        return $rows->toArray();
    }

    /** Vazifalar: har biri uchun homework holatlari (sana oralig'i: tugash vaqti). */
    public function tasks(Request $request, int $id)
    {
        $this->can('show_group');

        $base = Task::where('group_id', $id)
            ->when($request->filled('status'), fn ($q) => $q->where('status', (int) $request->status))
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"));
        $base = $this->taskOverlap($request, $base);

        $stats = (clone $base)->selectRaw('count(*) total, sum(status = 1 and end_date > now()) active, count(distinct theme_id) themes')->first();

        $rows = (clone $base)
            ->with('theme:id,title,title_krill,icon_type,icon')
            ->withCount(['homeworks', 'homeworks as passed_count' => fn ($q) => $q->where('status', Homework::STATUS_PASSED), 'homeworks as failed_count' => fn ($q) => $q->where('status', Homework::STATUS_FAILED), 'homeworks as progress_count' => fn ($q) => $q->where('status', Homework::STATUS_PROGRESS)])
            ->withAvg(['homeworks as avg_percentage' => fn ($q) => $q->where('tests_count', '>', 0)], 'percentage')
            ->orderByDesc('id')
            ->paginate(15);

        return $rows->toArray() + ['stats' => ['total' => (int) $stats->total, 'active' => (int) $stats->active, 'themes' => (int) $stats->themes]];
    }

    /** Bo'limlar qamrovi: barcha bo'limlar, shu guruhda vazifa bor-yo'qligi va natijalar. */
    public function themes(Request $request, int $id)
    {
        $this->can('show_group');

        $studentIds = Group::findOrFail($id)->students()->pluck('users.id');
        $taskAgg = Task::where('group_id', $id)->selectRaw('theme_id, count(*) tasks_count, max(end_date) last_at')->groupBy('theme_id')->get()->keyBy('theme_id');
        $hwAgg = Homework::join('tasks', 'tasks.id', '=', 'homeworks.task_id')->where('tasks.group_id', $id)->whereNull('tasks.deleted_at')
            ->selectRaw('tasks.theme_id, sum(homeworks.status = 2) passed, sum(homeworks.status = 0) failed, sum(homeworks.status = 1) progress, round(avg(case when homeworks.tests_count > 0 then homeworks.percentage end)) avg_percentage')
            ->groupBy('tasks.theme_id')->get()->keyBy('theme_id');
        $resAgg = Result::whereIn('user_id', $studentIds)->where('status', ResultStatusEnum::FINISHED)->where('type', QuizEnum::TOPIC)->whereNotNull('theme_id')
            ->selectRaw('theme_id, count(*) attempts, sum(correct) correct, sum(in_correct) in_correct, count(distinct user_id) students')
            ->groupBy('theme_id')->get()->keyBy('theme_id');

        $themes = Theme::ordered()->get(['id', 'title', 'title_krill', 'icon_type', 'icon'])->map(function ($t) use ($taskAgg, $hwAgg, $resAgg) {
            $ta = $taskAgg[$t->id] ?? null; $ha = $hwAgg[$t->id] ?? null; $ra = $resAgg[$t->id] ?? null;
            $c = (int) ($ra->correct ?? 0); $ic = (int) ($ra->in_correct ?? 0);

            return $t->toArray() + [
                'covered' => (bool) $ta,
                'tasks_count' => (int) ($ta->tasks_count ?? 0),
                'last_at' => $ta->last_at ?? null,
                'passed' => (int) ($ha->passed ?? 0), 'failed' => (int) ($ha->failed ?? 0), 'progress' => (int) ($ha->progress ?? 0),
                'avg_percentage' => (int) ($ha->avg_percentage ?? 0),
                'attempts' => (int) ($ra->attempts ?? 0), 'students' => (int) ($ra->students ?? 0),
                'correct' => $c, 'in_correct' => $ic, 'percentage' => $c + $ic ? (int) round($c * 100 / ($c + $ic)) : 0,
            ];
        });

        $coveredCount = $themes->where('covered', true)->count();
        if ($request->filled('covered')) {
            $themes = $themes->where('covered', (bool) (int) $request->covered);
        }
        $sorted = $themes->sortBy([['covered', 'desc'], ['tasks_count', 'desc'], ['title', 'asc']])->values();
        $page = max(1, (int) $request->input('page', 1));
        $per = 15;
        $paginator = new \Illuminate\Pagination\LengthAwarePaginator($sorted->forPage($page, $per)->values(), $sorted->count(), $per, $page);

        return $paginator->toArray() + ['covered' => $coveredCount, 'themes_total' => Theme::count()];
    }

    private function decorate($g, int $themesTotal)
    {
        $g->themes_covered = (int) $g->themes_covered;
        $g->coverage = (int) round($g->themes_covered * 100 / $themesTotal);
        $g->hw_total = (int) $g->hw_total; $g->hw_passed = (int) $g->hw_passed; $g->hw_failed = (int) $g->hw_failed; $g->hw_avg = (int) $g->hw_avg;
        $g->pass_rate = ($d = $g->hw_passed + $g->hw_failed) ? (int) round($g->hw_passed * 100 / $d) : 0;
        $g->tasks_count = (int) $g->tasks_count; $g->active_tasks = (int) $g->active_tasks; $g->blocked_students = (int) $g->blocked_students;

        return $g;
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
}
