<?php

namespace App\Support;

use App\Models\GlobalSetting;
use App\Models\Language;

class Lang
{
    public const KEYS = ['latin', 'krill'];

    public static function all(bool $activeOnly = false): array
    {
        $default = GlobalSetting::current()->default_language_id;

        return Language::when($activeOnly, fn ($q) => $q->where('status', 1))->orderByRaw('id = ? desc', [$default])->orderBy('id')->get()
            ->filter(fn ($l) => in_array($l->code, self::KEYS))
            ->map(fn ($l) => ['key' => $l->code, 'title' => $l->title, 'default' => $l->id === $default])
            ->values()->all();
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
