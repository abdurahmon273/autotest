<?php

namespace App\Support;

use App\Models\GlobalSetting;
use App\Models\Language;
use Illuminate\Support\Facades\Cache;

class Lang
{
    public const KEYS = ['latin', 'krill'];

    public static function all(bool $activeOnly = false): array
    {
        // Har so'rovda 2 ta query o'rniga kesh (sozlamalar o'zgarganda flush() chaqiriladi)
        return Cache::remember('languages.'.($activeOnly ? 'active' : 'all'), 3600, function () use ($activeOnly) {
            $default = GlobalSetting::current()->default_language_id;

            return Language::when($activeOnly, fn ($q) => $q->where('status', 1))->orderByRaw('id = ? desc', [$default])->orderBy('id')->get()
                ->filter(fn ($l) => in_array($l->code, self::KEYS))
                ->map(fn ($l) => ['key' => $l->code, 'title' => $l->title, 'default' => $l->id === $default])
                ->values()->all();
        });
    }

    public static function flush(): void
    {
        Cache::forget('languages.active');
        Cache::forget('languages.all');
    }

    /** Userning tili: null bo'lsa birlamchi til yoziladi va qaytariladi. Faol bo'lmagan til tanlangan bo'lsa ham birlamchiga tushadi. */
    public static function forUser(\App\Models\User $user): string
    {
        $active = array_column(self::all(true), 'key');
        if ($user->lang && in_array($user->lang, $active)) {
            return $user->lang;
        }
        $default = self::default();
        $user->forceFill(['lang' => $default])->saveQuietly();

        return $default;
    }

    public static function default(): string
    {
        return collect(self::all())->firstWhere('default', true)['key'] ?? 'krill';
    }

    public static function pick(?string $lang, bool $activeOnly = true): string
    {
        $keys = array_column(self::all($activeOnly), 'key');

        return in_array($lang, $keys) ? $lang : self::default();
    }

    public static function other(string $lang): string
    {
        return $lang === 'latin' ? 'krill' : 'latin';
    }
}
