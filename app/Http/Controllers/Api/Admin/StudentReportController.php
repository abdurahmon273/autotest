<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\QuizEnum;
use App\Enums\ResultStatusEnum;
use App\Models\Homework;
use App\Models\Result;
use App\Models\Role;
use App\Models\Theme;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * O'quvchi hisoboti: tanlangan davr bo'yicha bitta javobda to'liq ma'lumot.
 * 8 ta aggregate so'rov, qolgan hisob-kitob PHP da (kunlik qatorlar bo'yicha).
 */
class StudentReportController extends ApiController
{
    /** O'quvchi tanlanganda: birinchi natija sanasi (default "dan" sanasi uchun). */
    public function range(int $id)
    {
        $this->can('show_student');
        $u = User::withRole(Role::STUDENT)->findOrFail($id);
        $first = Result::where('user_id', $id)->min('created_at');

        return ['student' => $u->only('id', 'name', 'username', 'phone'), 'first_result_at' => $first ? Carbon::parse($first)->toDateString() : $u->created_at->toDateString(), 'today' => now()->toDateString()];
    }

    public function report(Request $request, int $id)
    {
        $this->can('show_student');

        $u = User::withRole(Role::STUDENT)->with('groups:groups.id,name')->findOrFail($id);
        $from = Carbon::parse($request->input('from', now()->subDays(60)->toDateString()))->startOfDay();
        $to = Carbon::parse($request->input('to', now()->toDateString()))->endOfDay();
        $days = max(1, (int) $from->diffInDays($to->copy()->startOfDay()) + 1);

        $finished = fn () => Result::where('user_id', $id)->where('status', ResultStatusEnum::FINISHED)->whereBetween('created_at', [$from, $to]);
        $T = QuizEnum::TWENTY->value; $F = QuizEnum::FIFTY->value; $P = QuizEnum::TOPIC->value;

        // 1. Umumiy
        $all = $finished()->selectRaw("
            count(*) attempts, sum(correct) correct, sum(in_correct) in_correct,
            sum(type in (?, ?)) exams, sum(type in (?, ?) and is_passed) exams_passed,
            sum(case when type in (?, ?) then correct else 0 end) exam_correct, sum(case when type in (?, ?) then in_correct else 0 end) exam_in_correct,
            sum(type = ? and homework_id is not null) hw_attempts, sum(type = ? and homework_id is null) free_attempts,
            count(distinct date(created_at)) active_days, max(created_at) last_at, min(created_at) first_at", [$T, $F, $T, $F, $T, $F, $T, $F, $P, $P])->first();

        // 2. Kunlik dinamika (chart)
        $daily = $finished()->selectRaw('date(created_at) d, count(*) attempts, sum(correct) correct, sum(in_correct) in_correct, sum(type in (?, ?)) exams, sum(type in (?, ?) and is_passed) exams_passed', [$T, $F, $T, $F])
            ->groupBy('d')->orderBy('d')->get();

        // 3. Mavzular bo'yicha
        $byTheme = $finished()->where('type', QuizEnum::TOPIC)->whereNotNull('theme_id')
            ->selectRaw('theme_id, count(*) attempts, sum(correct) correct, sum(in_correct) in_correct, max(created_at) last_at')
            ->groupBy('theme_id')->get()->keyBy('theme_id');
        $allThemes = Theme::orderBy('title')->get(['id', 'title', 'title_krill', 'icon_type', 'icon']);
        $themes = $allThemes->keyBy('id');
        $themesTotal = $allThemes->count();

        // 4. Uyga vazifalar (davr: vazifa muddati kesishgan)
        $hw = Homework::where('homeworks.user_id', $id)->join('tasks', 'tasks.id', '=', 'homeworks.task_id')->whereNull('tasks.deleted_at')
            ->where('tasks.end_date', '>=', $from)->where('tasks.start_date', '<=', $to)
            ->leftJoin('themes', 'themes.id', '=', 'tasks.theme_id')
            ->orderByDesc('tasks.end_date')
            ->get(['homeworks.status', 'homeworks.percentage', 'homeworks.tests_count', 'tasks.title', 'tasks.min_test_count', 'tasks.passing_percentage', 'tasks.start_date', 'tasks.end_date', 'tasks.status as task_status', 'themes.title as theme_title', 'themes.title_krill as theme_title_krill']);

        // 5. Oxirgi imtihonlar (trend)
        $lastExams = $finished()->whereIn('type', [$T, $F])->orderByDesc('id')->limit(10)->get(['type', 'correct', 'in_correct', 'is_passed', 'created_at'])->reverse()->values();

        // ---- PHP hisob-kitoblar ----
        $pct = fn ($c, $ic) => ($c + $ic) ? (int) round($c * 100 / ($c + $ic)) : 0;
        $overall = $pct((int) $all->correct, (int) $all->in_correct);

        // Dinamika: davr uzunligiga qarab kun / hafta
        $bucketWeeks = $days > 45;
        $series = [];
        foreach ($daily as $r) {
            $d = Carbon::parse($r->d);
            $key = $bucketWeeks ? $d->copy()->startOfWeek()->toDateString() : $r->d;
            $s = &$series[$key];
            $s = $s ?? ['date' => $key, 'attempts' => 0, 'correct' => 0, 'in_correct' => 0, 'exams' => 0, 'exams_passed' => 0];
            $s['attempts'] += (int) $r->attempts; $s['correct'] += (int) $r->correct; $s['in_correct'] += (int) $r->in_correct; $s['exams'] += (int) $r->exams; $s['exams_passed'] += (int) $r->exams_passed;
            unset($s);
        }
        $series = array_values(array_map(fn ($s) => $s + ['percentage' => $pct($s['correct'], $s['in_correct'])], $series));

        // Trend: davrning birinchi yarmi vs ikkinchi yarmi
        $half = $from->copy()->addDays(intdiv($days, 2));
        $h1 = ['c' => 0, 'ic' => 0]; $h2 = ['c' => 0, 'ic' => 0];
        foreach ($daily as $r) { $t = Carbon::parse($r->d)->lt($half) ? 'h1' : 'h2'; $$t['c'] += (int) $r->correct; $$t['ic'] += (int) $r->in_correct; }
        $trend = ($h1['c'] + $h1['ic'] && $h2['c'] + $h2['ic']) ? $pct($h2['c'], $h2['ic']) - $pct($h1['c'], $h1['ic']) : null;

        // Streak (ketma-ket faol kunlar)
        $dates = $daily->pluck('d')->map(fn ($d) => Carbon::parse($d))->values();
        $best = 0; $cur = 0; $prev = null;
        foreach ($dates as $d) { $cur = $prev && $prev->copy()->addDay()->isSameDay($d) ? $cur + 1 : 1; $best = max($best, $cur); $prev = $d; }
        $currentStreak = 0;
        if ($dates->isNotEmpty() && $dates->last()->diffInDays(now()->startOfDay()) <= 1) { $currentStreak = $cur; }

        // Mavzular
        $themeRows = $byTheme->map(function ($r) use ($themes, $pct) {
            $t = $themes[$r->theme_id] ?? null;
            return ['id' => (int) $r->theme_id, 'title' => $t?->title ?? $t?->title_krill ?? 'O‘chirilgan bo‘lim', 'icon' => $t && $t->icon_type === 0 ? $t->icon : null,
                'attempts' => (int) $r->attempts, 'correct' => (int) $r->correct, 'in_correct' => (int) $r->in_correct, 'percentage' => $pct((int) $r->correct, (int) $r->in_correct), 'last_at' => $r->last_at];
        })->values();
        $strong = $themeRows->where('attempts', '>=', 1)->sortByDesc('percentage')->take(5)->values();
        $weak = $themeRows->where('attempts', '>=', 1)->sortBy('percentage')->take(5)->values();

        // Uyga vazifalar
        $hwStats = ['total' => $hw->count(), 'passed' => $hw->where('status', Homework::STATUS_PASSED)->count(), 'failed' => $hw->where('status', Homework::STATUS_FAILED)->count(), 'progress' => $hw->where('status', Homework::STATUS_PROGRESS)->count()];
        $penalties = $hw->where('status', Homework::STATUS_FAILED)->map(fn ($h) => ['title' => $h->title, 'theme' => $h->theme_title ?? $h->theme_title_krill, 'percentage' => (int) $h->percentage, 'tests_count' => (int) $h->tests_count, 'min_test_count' => (int) $h->min_test_count, 'passing_percentage' => (int) $h->passing_percentage, 'end_date' => $h->end_date])->values();

        // Imtihonga layoqat: oxirgi 10 imtihonning o'tish ulushi + umumiy foiz
        $examPct = $pct((int) $all->exam_correct, (int) $all->exam_in_correct);
        $recentPass = $lastExams->count() ? (int) round($lastExams->where('is_passed', true)->count() * 100 / $lastExams->count()) : null;
        $readiness = match (true) {
            $lastExams->count() < 3 => ['key' => 'unknown', 'label' => 'Imtihonlar yetarli emas', 'hint' => 'Baholash uchun kamida 3 ta imtihon kerak'],
            $recentPass >= 80 && $examPct >= 90 => ['key' => 'ready', 'label' => 'Imtihonga tayyor', 'hint' => "Oxirgi imtihonlarning {$recentPass}% i muvaffaqiyatli"],
            $recentPass >= 50 => ['key' => 'almost', 'label' => 'Deyarli tayyor', 'hint' => "Oxirgi imtihonlarning {$recentPass}% i muvaffaqiyatli"],
            default => ['key' => 'not_ready', 'label' => 'Hali tayyor emas', 'hint' => "Oxirgi imtihonlarning faqat {$recentPass}% i muvaffaqiyatli"],
        };

        // Daraja: umumiy to'g'ri foizi bo'yicha
        $level = match (true) {
            (int) $all->attempts === 0 => ['key' => 'none', 'label' => 'Natija yo‘q', 'grade' => '—'],
            $overall >= 90 => ['key' => 'excellent', 'label' => 'A’lo', 'grade' => 'A'],
            $overall >= 75 => ['key' => 'good', 'label' => 'Yaxshi', 'grade' => 'B'],
            $overall >= 60 => ['key' => 'fair', 'label' => 'Qoniqarli', 'grade' => 'C'],
            default => ['key' => 'weak', 'label' => 'Zaif', 'grade' => 'D'],
        };

        // Faollik darajasi
        $activeShare = (int) round((int) $all->active_days * 100 / $days);
        $activity = match (true) {
            (int) $all->attempts === 0 => ['key' => 'none', 'label' => 'Faol emas'],
            $activeShare >= 60 => ['key' => 'high', 'label' => 'Muntazam'],
            $activeShare >= 30 => ['key' => 'mid', 'label' => 'O‘rtacha'],
            default => ['key' => 'low', 'label' => 'Kam faol'],
        };

        // Xulosa: qisqa, tuzilgan qatorlar (label / value / hint / tone)
        $tone = fn ($p) => $p >= 90 ? 'good' : ($p >= 75 ? 'warning' : ($p >= 60 ? 'serious' : 'critical'));
        $summary = [];
        if ((int) $all->attempts) {
            $summary[] = ['label' => 'Faollik', 'value' => "{$all->active_days} / {$days} kun", 'hint' => "kunlarning {$activeShare}% ida test yechgan", 'tone' => $activeShare >= 60 ? 'good' : ($activeShare >= 30 ? 'warning' : 'critical')];
            $summary[] = ['label' => 'Yechilgan testlar', 'value' => (int) $all->attempts.' ta', 'hint' => ((int) $all->correct + (int) $all->in_correct).' ta savol', 'tone' => null];
            $summary[] = ['label' => 'To‘g‘ri javoblar', 'value' => "{$overall}%", 'hint' => "{$all->correct} to‘g‘ri · {$all->in_correct} xato", 'tone' => $tone($overall)];
            if ($trend !== null) $summary[] = ['label' => 'O‘zgarish', 'value' => ($trend > 0 ? '+' : '').$trend.'%', 'hint' => $trend > 3 ? 'davr oxirida yaxshilandi' : ($trend < -3 ? 'davr oxirida pasaydi' : 'barqaror'), 'tone' => $trend > 3 ? 'good' : ($trend < -3 ? 'critical' : null)];
            if ((int) $all->exams) $summary[] = ['label' => 'Imtihonlar', 'value' => "{$all->exams_passed} / {$all->exams} o‘tdi", 'hint' => "to‘g‘ri javoblar {$examPct}%", 'tone' => $tone((int) round((int) $all->exams_passed * 100 / (int) $all->exams))];
            if ($hwStats['total']) $summary[] = ['label' => 'Uyga vazifalar', 'value' => "{$hwStats['passed']} / {$hwStats['total']} bajarildi", 'hint' => $hwStats['failed'] ? "{$hwStats['failed']} ta bajarilmadi · jarima {$hwStats['failed']}" : ($hwStats['progress'] ? "{$hwStats['progress']} ta jarayonda" : 'jarima yo‘q'), 'tone' => $hwStats['failed'] ? 'critical' : ($hwStats['passed'] ? 'good' : null)];
            if ($weak->isNotEmpty()) $summary[] = ['label' => 'Eng zaif bo‘lim', 'value' => $weak->first()['title'], 'hint' => $weak->first()['percentage'].'% to‘g‘ri', 'tone' => $tone($weak->first()['percentage'])];
            if ($strong->isNotEmpty() && $strong->first()['id'] !== $weak->first()['id']) $summary[] = ['label' => 'Eng kuchli bo‘lim', 'value' => $strong->first()['title'], 'hint' => $strong->first()['percentage'].'% to‘g‘ri', 'tone' => $tone($strong->first()['percentage'])];
        } else {
            $summary[] = ['label' => 'Natija', 'value' => 'Yo‘q', 'hint' => 'tanlangan davrda yakunlangan test yo‘q', 'tone' => null];
        }

        return [
            'student' => $u->only('id', 'name', 'username', 'phone', 'max_attempts', 'created_at') + ['groups' => $u->groups, 'blocked' => (int) $u->max_attempts <= 0],
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString(), 'days' => $days, 'bucket' => $bucketWeeks ? 'week' : 'day'],
            'verdict' => ['level' => $level, 'readiness' => $readiness, 'activity' => $activity, 'trend' => $trend],
            'totals' => [
                'attempts' => (int) $all->attempts, 'correct' => (int) $all->correct, 'in_correct' => (int) $all->in_correct, 'questions' => (int) $all->correct + (int) $all->in_correct, 'percentage' => $overall,
                'exams' => (int) $all->exams, 'exams_passed' => (int) $all->exams_passed, 'exam_percentage' => $examPct, 'hw_attempts' => (int) $all->hw_attempts, 'free_attempts' => (int) $all->free_attempts,
                'active_days' => (int) $all->active_days, 'active_share' => $activeShare, 'per_active_day' => (int) $all->active_days ? round((int) $all->attempts / (int) $all->active_days, 1) : 0,
                'best_streak' => $best, 'current_streak' => $currentStreak, 'first_at' => $all->first_at, 'last_at' => $all->last_at,
                'themes_touched' => $themeRows->count(), 'themes_total' => $themesTotal,
            ],
            'series' => $series,
            'themes' => $themeRows->sortByDesc('attempts')->values(),
            // Barcha bo'limlar: yechilmaganlar ham (0 ta), tartib — ko'p yechilgan birinchi
            'all_themes' => $allThemes->map(function ($t) use ($byTheme, $pct) {
                $r = $byTheme[$t->id] ?? null; $c = (int) ($r->correct ?? 0); $ic = (int) ($r->in_correct ?? 0);
                return ['id' => $t->id, 'title' => $t->title ?? $t->title_krill, 'icon' => $t->icon_type === 0 ? $t->icon : null, 'attempts' => (int) ($r->attempts ?? 0), 'correct' => $c, 'in_correct' => $ic, 'percentage' => $pct($c, $ic)];
            })->sortBy([['attempts', 'desc'], ['percentage', 'desc'], ['title', 'asc']])->values(),
            'strong_themes' => $strong,
            'weak_themes' => $weak,
            'homeworks' => $hwStats + ['penalty_points' => $hwStats['failed'], 'attempts_left' => (int) $u->max_attempts],
            'penalties' => $penalties,
            'last_exams' => $lastExams->map(fn ($e) => ['type' => $e->type->value, 'percentage' => $pct($e->correct, $e->in_correct), 'is_passed' => (bool) $e->is_passed, 'created_at' => $e->created_at]),
            'summary' => $summary,
        ];
    }
}
