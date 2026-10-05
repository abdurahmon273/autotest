<?php

namespace App\Logging;

use Illuminate\Support\Facades\Http;
use Monolog\Handler\AbstractProcessingHandler;
use Monolog\Level;
use Monolog\LogRecord;
use Throwable;

/**
 * Log yozuvlarini Telegram kanaliga yuboradi.
 * Hech qachon exception tashlamaydi — log yuborishdagi xato asosiy xatoni yashirmasligi kerak.
 */
class TelegramLogHandler extends AbstractProcessingHandler
{
    private const MAX_LENGTH = 4096;

    public function __construct(
        private readonly string $token,
        private readonly string $chatId,
        int|string|Level $level = Level::Error,
        bool $bubble = true,
    ) {
        parent::__construct($level, $bubble);
    }

    protected function write(LogRecord $record): void
    {
        if ($this->token === '' || $this->chatId === '') {
            return;
        }

        try {
            $text = mb_substr($this->format($record), 0, self::MAX_LENGTH);
            $response = Http::timeout(5)->post("https://api.telegram.org/bot{$this->token}/sendMessage", [
                'chat_id' => $this->chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ]);

            if (! $response->ok() || ! $response->json('ok')) {
                Http::timeout(5)->post("https://api.telegram.org/bot{$this->token}/sendMessage", [
                    'chat_id' => $this->chatId,
                    'text' => mb_substr(strip_tags(html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8')), 0, self::MAX_LENGTH),
                    'disable_web_page_preview' => true,
                ]);
            }
        } catch (Throwable) {
            // jim o'tkazamiz
        }
    }

    private function format(LogRecord $record): string
    {
        $e = fn (?string $s) => htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $icon = match (true) {
            $record->level->value >= Level::Critical->value => '🔴',
            $record->level->value >= Level::Error->value => '🟠',
            $record->level->value >= Level::Warning->value => '🟡',
            default => '🔵',
        };

        $lines = [
            "{$icon} <b>{$e(config('app.name'))}</b> · {$e(app()->environment())} · <b>{$record->level->getName()}</b>",
            $e($record->datetime->format('Y-m-d H:i:s')),
            '',
            '<pre>'.$e(mb_substr($record->message, 0, 1500)).'</pre>',
        ];

        $ex = $record->context['exception'] ?? null;
        if ($ex instanceof Throwable) {
            $lines[] = '<b>'.$e(get_class($ex)).'</b>';
            $lines[] = $e(str_replace(base_path().'/', '', $ex->getFile())).':'.$ex->getLine();
        }

        if (app()->runningInConsole()) {
            $lines[] = '⌨️ '.$e(implode(' ', $_SERVER['argv'] ?? []));
        } elseif ($req = request()) {
            $lines[] = '🌐 '.$e($req->method().' '.$req->fullUrl());
            if ($id = $req->user()?->id) {
                $lines[] = '👤 user #'.$id;
            }
            $lines[] = '📍 '.$e($req->ip());
        }

        return implode("\n", $lines);
    }
}
