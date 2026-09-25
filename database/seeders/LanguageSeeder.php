<?php

namespace Database\Seeders;

use App\Models\GlobalSetting;
use App\Models\Language;
use Illuminate\Database\Seeder;

class LanguageSeeder extends Seeder
{
    public function run(): void
    {
        $latin = Language::updateOrCreate(['code' => 'latin'], ['title' => 'Uzbek (lotin)']);
        Language::updateOrCreate(['code' => 'krill'], ['title' => 'Uzbek (krill)']);

        $setting = GlobalSetting::current();
        if (! $setting->default_language_id) {
            $setting->default_language_id = $latin->id;
            $setting->effective_at = now();
            $setting->save();
        }
    }
}
