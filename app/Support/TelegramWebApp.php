<?php

namespace App\Support;

class TelegramWebApp
{
    public const MAX_AGE = 86400;

    /** Telegram Mini App initData imzosini tekshiradi. To'g'ri bo'lsa user massivini, aks holda null qaytaradi. */
    public static function verify(string $initData, string $botToken): ?array
    {
        if ($initData === '' || $botToken === '') {
            return null;
        }

        parse_str($initData, $params);
        $hash = $params['hash'] ?? null;
        if (! $hash) {
            return null;
        }
        unset($params['hash']);

        ksort($params);
        $checkString = implode("\n", array_map(fn ($k, $v) => "{$k}={$v}", array_keys($params), $params));

        $secret = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $expected = hash_hmac('sha256', $checkString, $secret);

        if (! hash_equals($expected, $hash)) {
            return null;
        }

        if ((int) ($params['auth_date'] ?? 0) < time() - self::MAX_AGE) {
            return null;
        }

        $user = json_decode($params['user'] ?? '', true);

        return is_array($user) && isset($user['id']) ? $user : null;
    }
}
