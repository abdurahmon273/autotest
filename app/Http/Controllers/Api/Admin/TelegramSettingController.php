<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\GlobalSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class TelegramSettingController extends ApiController
{
    public function show()
    {
        $this->can('access_telegram_setting');

        $s = GlobalSetting::current();

        return ['token' => (string) $s->telegram_bot_token, 'task_notification_time' => $s->task_notification_time ?? GlobalSetting::DEFAULT_TASK_NOTIFICATION_TIME];
    }

    public function updateNotification(Request $request)
    {
        $this->can('access_telegram_setting');
        $data = $request->validate(['task_notification_time' => ['required', 'integer', 'min:1', 'max:168']]);

        $setting = GlobalSetting::current();
        $setting->task_notification_time = $data['task_notification_time'];
        $setting->effective_at = now();
        $setting->save();

        return $this->ok('Saqlandi.');
    }

    public function update(Request $request)
    {
        $this->can('access_telegram_setting');
        $token = $request->validate(['token' => ['required', 'regex:/^\d+:[A-Za-z0-9_-]+$/']], ['token.regex' => 'Token formati noto‘g‘ri.'])['token'];

        // Token har holda saqlanadi — webhook o'rnatilmasa ham bot xabar yuborishi mumkin.
        $setting = GlobalSetting::current();
        $setting->telegram_bot_token = $token;
        $setting->effective_at = now();
        $setting->save();

        try {
            $response = Http::timeout(10)->post("https://api.telegram.org/bot{$token}/setWebhook", ['url' => route('telegram.webhook')]);
            $error = $response->ok() && $response->json('ok') ? null : ($response->json('description') ?? 'Telegram javob bermadi.');

            Http::timeout(10)->post("https://api.telegram.org/bot{$token}/setChatMenuButton", [
                'menu_button' => ['type' => 'web_app', 'text' => config('app.name'), 'web_app' => ['url' => route('tg')]],
            ]);
        } catch (\Throwable $e) {
            $error = 'Telegram bilan bog‘lanib bo‘lmadi.';
        }

        if ($error) {
            return $this->ok("Token saqlandi, lekin webhook o‘rnatilmadi: {$error}", ['webhook' => false]);
        }

        return $this->ok('Token saqlandi, webhook o‘rnatildi.', ['webhook' => true]);
    }
}
