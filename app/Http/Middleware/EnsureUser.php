<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnsureUser
{
    public const TTL = 300;

    public function handle(Request $request, Closure $next): Response
    {
        $u = $request->user();
        abort_unless($u, 403);
        abort_if($u->max_attempts < 1, 403, 'Imkoniyatlar tugagan.');

        $access = Cache::remember(self::key($u->id), self::TTL, fn () => [
            'student' => $u->is_student,
            'teacher' => $u->is_teacher,
            'has_group' => $u->groups()->exists(),
        ]);

        abort_unless($access['student'] || $access['teacher'], 403);
        abort_if($access['student'] && ! $access['has_group'], 403, 'Guruhga biriktirilmagan.');

        return $next($request);
    }

    public static function key(int $userId): string
    {
        return 'user_access_'.$userId;
    }

    public static function flush(int|iterable $userIds): void
    {
        foreach (is_iterable($userIds) ? $userIds : [$userIds] as $id) {
            Cache::forget(self::key($id));
        }
    }
}
