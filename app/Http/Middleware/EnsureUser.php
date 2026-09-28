<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $u = $request->user();
        abort_unless($u && ($u->is_student || $u->is_teacher), 403);
        abort_if($u->max_attempts < 1, 403, 'Imkoniyatlar tugagan.');
        abort_if($u->is_student && $u->groups()->doesntExist(), 403, 'Guruhga biriktirilmagan.');

        return $next($request);
    }
}
