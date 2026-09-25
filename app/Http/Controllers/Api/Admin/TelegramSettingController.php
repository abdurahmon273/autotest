<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\GlobalSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class TelegramSettingController extends ApiController
{
    public function show()
    {
        $this->can('access_telegram_setting');

        return ['token' => (string) GlobalSetting::current()->telegram_bot_token];
    }

    public function update(Request $request)
    {
        $this->can('access_telegram_setting');
        $token = $request->validate(['token' => ['required', 'regex:/^\d+:[A-Za-z0-9_-]+$/']], ['token.regex' => 'Token formati noto‘g‘ri.'])['token'];

        $response = Http::timeout(10)->post("https://api.telegram.org/bot{$token}/setWebhook", ['url' => route('telegram.webhook')]);
        if (! $response->ok() || ! $response->json('ok')) {
            throw ValidationException::withMessages(['token' => $response->json('description') ?? 'Telegram bilan bog‘lanib bo‘lmadi.']);
        }

        $setting = GlobalSetting::current();
        $setting->telegram_bot_token = $token;
        $setting->effective_at = now();
        $setting->save();

        return $this->ok('Saqlandi.');
    }
}
