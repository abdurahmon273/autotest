<?php

namespace App\Logging;

use Monolog\Logger;

class TelegramLogger
{
    public function __invoke(array $config): Logger
    {
        return new Logger('telegram', [new TelegramLogHandler(
            (string) ($config['token'] ?? ''),
            (string) ($config['chat_id'] ?? ''),
            $config['level'] ?? 'error',
        )]);
    }
}
