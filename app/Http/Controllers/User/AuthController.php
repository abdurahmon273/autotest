<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function show()
    {
        return Auth::check() ? redirect()->route('app') : view('user.login');
    }

    public function login(Request $request)
    {
        $data = $request->validate(['username' => ['required', 'string'], 'password' => ['required', 'string']]);

        $user = User::where('username', ltrim($data['username'], '@'))
            ->whereHas('roles', fn ($q) => $q->whereIn('roles.id', Role::NON_STAFF))
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return back()->withErrors(['username' => 'Foydalanuvchi nomi yoki parol noto‘g‘ri.'])->onlyInput('username', 'remember');
        }

        if ($user->max_attempts < 1) {
            return back()->withErrors(['username' => 'Sizning imkoniyatlaringiz tugagan. Administratorga murojaat qiling.'])->onlyInput('username', 'remember');
        }

        if ($user->is_student && $user->groups()->doesntExist()) {
            return back()->withErrors(['username' => 'Siz hali guruhga biriktirilmagansiz. Administratorga murojaat qiling.'])->onlyInput('username', 'remember');
        }

        $pendingChatId = $request->session()->pull(TelegramAuthController::SESSION_PENDING);

        Auth::login($user, $request->boolean('remember') || (bool) $pendingChatId);
        $request->session()->regenerate();

        if ($pendingChatId) {
            if (! User::where('chat_id', $pendingChatId)->where('id', '!=', $user->id)->exists()) {
                $user->forceFill(['chat_id' => $pendingChatId])->save();
            }
            $request->session()->put(TelegramAuthController::SESSION_FLAG, true);
        } else {
            $user->forceFill(['session_id' => $request->session()->getId()])->save();
        }

        return redirect()->route('app');
    }

    public function logout(Request $request)
    {
        if (! $request->session()->get(TelegramAuthController::SESSION_FLAG)) {
            $request->user()?->forceFill(['session_id' => null])->save();
        }
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }
}
