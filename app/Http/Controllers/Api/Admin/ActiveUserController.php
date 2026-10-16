<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Group;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Faol foydalanuvchilar. Bazada alohida "login vaqti" ustuni yo'q, shuning uchun faollik
 * mavjud izlardan yig'iladi:
 *  - `sessions.last_activity` — joriy web sessiyaning oxirgi so'rovi (unix vaqt, UTC);
 *  - `result_questions.updated_at` — savolga javob berilgan vaqt (eng aniq faollik izi);
 *  - `results.created_at` — test boshlangan vaqt.
 */
class ActiveUserController extends ApiController
{
    /** Shuncha daqiqa ichida so'rov bo'lsa — "hozir onlayn". */
    public const ONLINE_MINUTES = 5;

    /** Kun bo'yicha umumiy ko'rsatkichlar va soatlar bo'yicha faollik. */
    public function stats(Request $request)
    {
        $this->can('access_test');
        [$start, $end] = $this->day($request);
        $students = User::withRole(Role::STUDENT)->when($request->group_id, fn ($q, $g) => $q->whereHas('groups', fn ($q) => $q->where('groups.id', $g)));
        $ids = $students->clone()->pluck('users.id');

        $total = $ids->count();
        $online = DB::table('sessions')->whereIn('user_id', $ids)->where('last_activity', '>=', now()->subMinutes(self::ONLINE_MINUTES)->timestamp)->distinct()->count('user_id');
        $activeIds = $this->activeUserIds($ids, $start, $end);
        $active = count($activeIds);

        $answers = DB::table('result_questions')->whereIn('user_id', $ids)->whereBetween('updated_at', [$start, $end])->whereNotNull('user_answer_id');
        $hours = array_fill(0, 24, ['hour' => 0, 'answers' => 0, 'users' => 0]);
        foreach ($answers->clone()->selectRaw('HOUR(updated_at) h, COUNT(*) c, COUNT(DISTINCT user_id) u')->groupBy('h')->get() as $row) {
            $hours[(int) $row->h] = ['hour' => (int) $row->h, 'answers' => (int) $row->c, 'users' => (int) $row->u];
        }
        foreach ($hours as $h => &$v) {
            $v['hour'] = $h;
        }
        unset($v);

        return response()->json([
            'date' => $start->toDateString(),
            'is_today' => $start->isToday(),
            'total' => $total,
            'online' => $online,
            'active' => $active,
            'inactive' => max(0, $total - $active),
            'tests' => DB::table('results')->whereNull('deleted_at')->whereIn('user_id', $ids)->whereBetween('created_at', [$start, $end])->count(),
            'answers' => $answers->count(),
            'new_students' => $students->clone()->whereBetween('users.created_at', [$start, $end])->count(),
            'telegram' => $students->clone()->whereNotNull('chat_id')->count(),
            'hours' => array_values($hours),
            'peak_hour' => collect($hours)->sortByDesc('answers')->first(fn ($h) => $h['answers'] > 0)['hour'] ?? null,
        ]);
    }

    /** O'quvchilar ro'yxati: oxirgi faollik, shu kundagi birinchi/oxirgi faollik, testlar soni. 15 tadan. */
    public function index(Request $request)
    {
        $this->can('access_test');
        [$start, $end] = $this->day($request);
        $onlineTs = now()->subMinutes(self::ONLINE_MINUTES)->timestamp;
        // sessions.last_activity UTC unix; MySQL FROM_UNIXTIME sessiya tz'da beradi — app tz'ga keltiramiz.
        $shift = (int) now()->utcOffset() * 60 - (int) (DB::selectOne('select TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) d')->d ?? 0);

        $sess = 'select max(s.last_activity) from sessions s where s.user_id = users.id';
        $ans = 'select max(rq.updated_at) from result_questions rq where rq.user_id = users.id';
        $dayAns = 'from result_questions rq where rq.user_id = users.id and rq.user_answer_id is not null and rq.updated_at between ? and ?';

        $q = User::withRole(Role::STUDENT)
            ->select('users.id', 'users.name', 'users.phone', 'users.username', 'users.chat_id', 'users.max_attempts', 'users.created_at')
            ->selectRaw("($sess) as last_session")
            ->selectRaw("GREATEST(COALESCE(FROM_UNIXTIME(($sess) + $shift), '1970-01-01'), COALESCE(($ans), '1970-01-01')) as last_seen")
            ->selectRaw("(select min(rq.updated_at) $dayAns) as day_first", [$start, $end])
            ->selectRaw("(select max(rq.updated_at) $dayAns) as day_last", [$start, $end])
            ->selectRaw("(select count(*) $dayAns) as day_answers", [$start, $end])
            ->selectRaw('(select count(*) from results r where r.user_id = users.id and r.deleted_at is null and r.created_at between ? and ?) as day_tests', [$start, $end])
            ->selectRaw('(select count(*) from sessions s where s.user_id = users.id and s.last_activity >= ?) as online', [$onlineTs])
            ->selectRaw('(select count(*) from sessions s where s.user_id = users.id and s.last_activity between ? and ?) as day_session', [$start->timestamp, $end->timestamp])
            ->with('groups:groups.id,name')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('users.name', 'like', "%{$s}%")
                ->orWhere('users.username', 'like', "%{$s}%")
                ->orWhere('users.phone', 'like', "%{$s}%")))
            ->when($request->group_id, fn ($q, $g) => $q->whereHas('groups', fn ($q) => $q->where('groups.id', $g)));

        $activeExpr = '(day_answers > 0 or day_tests > 0 or day_session > 0)';
        match ($request->status) {
            'online' => $q->havingRaw('online > 0'),
            'active' => $q->havingRaw($activeExpr),
            'inactive' => $q->havingRaw("not $activeExpr"),
            default => null,
        };

        $page = $q->orderByDesc('online')->orderByDesc('last_seen')->orderBy('users.name')->paginate(15);

        $page->getCollection()->transform(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'phone' => $u->phone,
            'username' => $u->username,
            'telegram' => $u->chat_id !== null,
            'blocked' => (int) $u->max_attempts <= 0,
            'groups' => $u->groups->map->only('id', 'name')->values(),
            'online' => (int) $u->online > 0,
            'active' => (int) $u->day_answers > 0 || (int) $u->day_tests > 0 || (int) $u->day_session > 0,
            'last_seen' => $u->last_seen && ! str_starts_with($u->last_seen, '1970') ? Carbon::parse($u->last_seen)->toIso8601String() : null,
            'day_first' => $u->day_first ? Carbon::parse($u->day_first)->toIso8601String() : null,
            'day_last' => $u->day_last ? Carbon::parse($u->day_last)->toIso8601String() : null,
            'day_tests' => (int) $u->day_tests,
            'day_answers' => (int) $u->day_answers,
            'created_at' => $u->created_at?->toIso8601String(),
        ]);

        return $page;
    }

    /** Filtr uchun guruhlar. */
    public function groups()
    {
        $this->can('access_test');

        return Group::orderBy('name')->get(['id', 'name']);
    }

    /** Kun oralig'i (date=Y-m-d, standart bugun). */
    private function day(Request $request): array
    {
        $d = $request->date ? Carbon::parse($request->date) : now();
        if ($d->isFuture()) {
            $d = now();
        }

        return [$d->copy()->startOfDay(), $d->copy()->endOfDay()];
    }

    /** Shu kunda iz qoldirgan o'quvchilar: javob bergan, test boshlagan yoki sessiyasi bo'lgan. */
    private function activeUserIds($ids, Carbon $start, Carbon $end): array
    {
        $a = DB::table('result_questions')->whereIn('user_id', $ids)->whereBetween('updated_at', [$start, $end])->whereNotNull('user_answer_id')->distinct()->pluck('user_id');
        $b = DB::table('results')->whereNull('deleted_at')->whereIn('user_id', $ids)->whereBetween('created_at', [$start, $end])->distinct()->pluck('user_id');
        $c = DB::table('sessions')->whereIn('user_id', $ids)->whereBetween('last_activity', [$start->timestamp, $end->timestamp])->distinct()->pluck('user_id');

        return $a->merge($b)->merge($c)->unique()->values()->all();
    }
}
