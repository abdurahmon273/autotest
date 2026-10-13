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

    public const SESSION_CONFIRM = 'tg_confirm_user'; // topilgan user, "Kirish" tasdig'ini kutmoqda

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

        // Avtomatik kirmaymiz: avval kim ekanini ko'rsatib, "Kirish" tasdig'ini olamiz
        $request->session()->put(self::SESSION_CONFIRM, $user->id);

        return ['user' => ['name' => $user->name, 'username' => $user->username, 'phone' => $user->phone_formatted ?? $user->phone]];
    }

    /** "Kirish" bosilganda: tasdiqlangan user bilan kirish. session_id yoziladi — bitta qurilma qoidasi web bilan bir xil. */
    public function confirm(Request $request)
    {
        $id = $request->session()->pull(self::SESSION_CONFIRM);
        $user = $id ? User::whereKey($id)->whereHas('roles', fn ($q) => $q->whereIn('roles.id', Role::NON_STAFF))->first() : null;
        if (! $user) {
            return response()->json(['message' => 'Sessiya eskirgan. Botni qayta oching.', 'redirect' => route('login')], 422);
        }

        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->put(self::SESSION_FLAG, true);
        // Web bilan bir xil: oxirgi kirgan qurilma ishlaydi, oldingisi chiqarib yuboriladi
        $user->forceFill(['session_id' => $request->session()->getId()])->save();

        return ['redirect' => route('app')];
    }

    /** "Boshqa" bosilganda: tasdiqni bekor qilib login sahifasiga. */
    public function other(Request $request)
    {
        $request->session()->forget(self::SESSION_CONFIRM);

        return ['redirect' => route('login')];
    }
}
