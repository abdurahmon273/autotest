<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\GlobalSetting;
use App\Models\Role;
use App\Models\User;
use App\Support\TelegramWebApp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TelegramAuthController extends Controller
{
    public const SESSION_FLAG = 'via_telegram';

    public const SESSION_PENDING = 'tg_chat_id';

    public function show()
    {
        return view('user.tg');
    }

    public function auth(Request $request)
    {
        $initData = (string) $request->input('init_data', '');
        $tgUser = TelegramWebApp::verify($initData, (string) GlobalSetting::current()->telegram_bot_token);

        if (! $tgUser) {
            return response()->json(['message' => 'Telegram ma’lumotini tekshirib bo‘lmadi.'], 422);
        }

        $chatId = (string) $tgUser['id'];

        $user = User::where('chat_id', $chatId)
            ->whereHas('roles', fn ($q) => $q->whereIn('roles.id', Role::NON_STAFF))
            ->first();

        if (! $user) {
            $request->session()->put(self::SESSION_PENDING, $chatId);

            return ['redirect' => route('login')];
        }

        Auth::login($user, true);
        $request->session()->regenerate();
        $request->session()->put(self::SESSION_FLAG, true);

        return ['redirect' => route('app')];
    }
}
