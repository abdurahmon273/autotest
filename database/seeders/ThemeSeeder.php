<?php

namespace Database\Seeders;

use App\Models\Theme;
use Illuminate\Database\Seeder;

class ThemeSeeder extends Seeder
{
    public function run(): void
    {
        $themes = [
            ['💬', 'Umumiy qoidalar', 'Умумий қоидалар'],
            ['🚦', 'Tartibga solingan chorraha', 'Тартибга солинган чорраҳа'],
            ['⚠️', 'Ogohlantiruvchi ishoralar', 'Огоҳлантирувчи ишоралар'],
            ['🅿️', 'To‘xtash va quvib o‘tish', 'Тўхташ ва қувиб ўтиш'],
            ['❎', 'Chorraxa Tartibga Solinmagan', 'Чорраҳа тартибга солинмаган'],
            ['🚶', 'Piyoda, t/yo‘l, avtomagistral', 'Пиёда, т/йўл, автомагистрал'],
            ['🚛', 'Shatakka olish', 'Шатакка олиш'],
            ['❌', 'Ogohlantiruvchi va imtiyoz', 'Огоҳлантирувчи ва имтиёз'],
            ['⛔', 'Taqiqlovchi belgilar', 'Тақиқловчи белгилар'],
            ['🚸', 'Axborot, Servis, Qo‘shimcha belgilar', 'Ахборот, сервис, қўшимча белгилар'],
            ['🛣️', 'Chiziqlar', 'Чизиқлар'],
            ['🙅‍♂️', 'Taqiqlovchi Shartlar', 'Тақиқловчи шартлар'],
            ['🩻', 'Tibbiyot', 'Тиббиёт'],
            ['🚗', 'Tezliklar', 'Тезликлар'],
            [null, 'Haydovchi majburiyatlari', 'Ҳайдовчи мажбуриятлари'],
            [null, 'Buyuruvchi Belgilar', 'Буюрувчи белгилар'],
            ['➕🚗', 'Chorraxa o‘ng qo‘l', 'Чорраҳа ўнг қўл'],
            [null, 'Sinov uchun', 'Синов учун'],
            [null, '1-bob Atamalar', '1-боб Атамалар'],
            [null, 'Tez kunda', 'Тез кунда'],
        ];

        foreach ($themes as [$icon, $title, $krill]) {
            Theme::updateOrCreate(['title' => $title], ['title_krill' => $krill, 'icon_type' => Theme::ICON_TEXT, 'icon' => $icon]);
        }
    }
}
