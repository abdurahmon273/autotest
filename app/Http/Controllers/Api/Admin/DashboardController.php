<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Group;
use App\Models\ResultQuestion;
use App\Models\Role;
use App\Models\Task;
use App\Models\Theme;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends ApiController
{
    public const MAX_DAYS = 366;

    public function __invoke(Request $request)
    {
        $this->can('access_dashboard');
        [$from, $to] = $this->range($request);

        return response()->json([
            'stats' => [
                'teachers' => User::withRole(Role::TEACHER)->count(),
                'students' => User::withRole(Role::STUDENT)->count(),
                'newStudents' => User::withRole(Role::STUDENT)->whereBetween('created_at', [$from, $to])->count(),
                'staff' => User::staff()->count(),
            ],
            'recent' => User::withRole(Role::STUDENT)->latest()->take(5)->get(['id', 'name', 'phone', 'created_at']),
        ]);
    }

    public function charts(Request $request)
    {
        $this->can('access_dashboard');
        [$from, $to] = $this->range($request);

        return response()->json([
            'activity' => $this->answersPerDay($from, $to),
            'homework' => $this->homeworkCoverage($from, $to),
        ]);
    }

    /** from/to (Y-m-d). Standart: oxirgi 2 oy. Eng ko'pi 366 kun. */
    private function range(Request $request): array
    {
        $to = $request->to ? Carbon::parse($request->to)->endOfDay() : now()->endOfDay();
        $from = $request->from ? Carbon::parse($request->from)->startOfDay() : $to->copy()->subMonths(2)->startOfDay();

        if ($from->gt($to)) {
            $from = $to->copy()->startOfDay();
        }
        if ($from->diffInDays($to) > self::MAX_DAYS) {
            $from = $to->copy()->subDays(self::MAX_DAYS)->startOfDay();
        }

        return [$from, $to];
    }

    /** Har kuni javob berilgan savollar soni. */
    private function answersPerDay(Carbon $from, Carbon $to): array
    {
        $answered = ResultQuestion::whereBetween('created_at', [$from, $to])
            ->whereNotNull('user_answer_id')
            ->selectRaw('DATE(created_at) as day, count(*) as c')
            ->groupBy('day')
            ->pluck('c', 'day');

        $rows = [];
        for ($d = $from->copy(); $d->lte($to); $d->addDay()) {
            $key = $d->toDateString();
            $rows[] = ['date' => $key, 'answers' => (int) ($answered[$key] ?? 0)];
        }

        return $rows;
    }

    /**
     * Guruhlarga vazifa berilishi:
     * - groups: har guruh uchun oraliqda berilgan vazifalar soni
     * - percent: oraliqda kamida bitta vazifa olgan guruhlar ulushi
     * - themes: har mavzu bo'yicha oraliqda shu mavzudan vazifa olgan guruhlar ulushi (%).
     */
    private function homeworkCoverage(Carbon $from, Carbon $to): array
    {
        $groups = Group::orderBy('name')
            ->withCount(['tasks as tasks_in_range' => fn ($q) => $q->whereBetween('created_at', [$from, $to])])
            ->get(['id', 'name']);

        $total = $groups->count();
        $covered = $groups->where('tasks_in_range', '>', 0)->count();

        $perTheme = Task::whereBetween('created_at', [$from, $to])
            ->selectRaw('theme_id, count(distinct group_id) as groups_count')
            ->groupBy('theme_id')
            ->pluck('groups_count', 'theme_id');

        $themes = Theme::orderBy('id')->get(['id', 'title', 'title_krill'])->map(fn ($t) => [
            'id' => $t->id,
            'title' => $t->title ?? $t->title_krill,
            'groups' => (int) ($perTheme[$t->id] ?? 0),
            'percent' => $total ? (int) round(($perTheme[$t->id] ?? 0) * 100 / $total) : 0,
        ])->values();

        return [
            'total' => $total,
            'covered' => $covered,
            'percent' => $total ? (int) round($covered * 100 / $total) : 0,
            'groups' => $groups->map(fn ($g) => ['id' => $g->id, 'name' => $g->name, 'tasks' => (int) $g->tasks_in_range])->values(),
            'themes' => $themes,
        ];
    }
}
