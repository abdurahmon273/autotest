<?php

namespace App\Services;

use App\Models\GlobalSetting;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class TelegramService
{
    public const MAX_LENGTH = 4096;

    public function token(): string
    {
        $token = (string) GlobalSetting::current()->telegram_bot_token;
        if ($token === '') {
            throw new RuntimeException('Telegram bot token sozlanmagan. Sozlamalar → Telegram bo‘limida token kiriting.');
        }

        return $token;
    }

    /** Bitta xabar yuborish (HTML). Xato bo'lsa RuntimeException. */
    public function send(string $chatId, string $text, array $buttons = []): void
    {
        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
        ];
        if ($buttons) {
            $payload['reply_markup'] = ['inline_keyboard' => [$buttons]];
        }

        $response = Http::timeout(15)->post("https://api.telegram.org/bot{$this->token()}/sendMessage", $payload);

        if (! $response->ok() || ! $response->json('ok')) {
            throw new RuntimeException('Telegram: '.($response->json('description') ?? 'xabar yuborilmadi.'));
        }
    }

    /**
     * Xatosiz yuborish: chat yo'q, bot bloklangan, start bosilmagan, tarmoq xatosi — hammasi jimgina false.
     * Bir studentga yuborilmasa qolganlariga ta'sir qilmaydi, log ham yozilmaydi.
     */
    public function trySend(?string $chatId, string $text, array $buttons = []): bool
    {
        if ($chatId === null || $chatId === '') {
            return false;
        }

        try {
            $this->send($chatId, $text, $buttons);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Bo'laklar ro'yxatini 4096 belgidan oshmaydigan xabarlarga yig'ib yuborish.
     * Har bo'lak butunligicha bitta xabarda qoladi (student yozuvi bo'linmaydi).
     */
    public function sendChunks(string $chatId, array $chunks): int
    {
        $messages = [];
        $current = '';
        foreach ($chunks as $chunk) {
            $candidate = $current === '' ? $chunk : $current."\n\n".$chunk;
            if (mb_strlen($candidate) > self::MAX_LENGTH && $current !== '') {
                $messages[] = $current;
                $current = $chunk;
            } else {
                $current = $candidate;
            }
        }
        if ($current !== '') {
            $messages[] = $current;
        }

        foreach ($messages as $text) {
            $this->send($chatId, mb_substr($text, 0, self::MAX_LENGTH));
        }

        return count($messages);
    }

    public static function escape(?string $text): string
    {
        return htmlspecialchars((string) $text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
