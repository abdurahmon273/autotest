<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SingleSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_admin && $user->session_id !== $request->session()->getId()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->expectsJson()) {
                return response()->json(['message' => 'Boshqa qurilmadan kirilgani uchun tizimdan chiqarildingiz.'], 401);
            }

            return redirect()->route('login')->withErrors(['username' => 'Boshqa qurilmadan kirilgani uchun tizimdan chiqarildingiz.']);
        }

        return $next($request);
    }
}
