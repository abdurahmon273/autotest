<?php

namespace Database\Seeders;

use App\Models\Question;
use App\Models\Theme;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Osonprava'dan olingan 1264 ta savolni 16 ta qat'iy mavzuga bo'lib seed qiladi.
 *
 * Xavfsiz rejim: mavjud savollar va javoblar O'CHIRILMAYDI.
 *  1. Mavjud barcha mavzular soft-delete qilinadi (tasks/results FK saqlanadi, ro'yxatlarda ko'rinmaydi).
 *  2. "Default" mavzusi yaratilib, mavjud barcha savollar unga biriktiriladi.
 *  3. 16 ta yangi mavzu + 1264 ta yangi savol yaratiladi.
 * Natija: 17 ta faol mavzu (16 + Default).
 *
 * Qayta ishga tushirishdan himoya: 16 ta mavzudan birortasi allaqachon faol bo'lsa seeder to'xtaydi.
 *
 *   php artisan db:seed --class=OsonpravaSeeder
 *
 * Ma'lumot: database/seeders/data/osonprava/questions.json + images/
 */
class OsonpravaSeeder extends Seeder
{
    private const IMAGE_DIR = 'images/osonprava';

    /** key => [title_latin, title_krill, icon] */
    private const THEMES = [
        'atamalar' => ['1-bob Atamalar', '1-боб Атамалар', '📘'],
        'umumiy' => ['Umumiy qoidalar', 'Умумий қоидалар', '💬'],
        'tartibga' => ['Tartibga solingan chorraha', 'Тартибга солинган чорраҳа', '🚦'],
        'ishoralar' => ['Ogohlantiruvchi ishoralar', 'Огоҳлантирувчи ишоралар', '⚠️'],
        'toxtash' => ['Toʻxtash va quvib oʻtish', 'Тўхташ ва қувиб ўтиш', '🅿️'],
        'solinmagan' => ['Chorraha tartibga solinmagan', 'Чорраҳа тартибга солинмаган', '❎'],
        'piyoda' => ['Piyoda, temiryoʻl, avtomagistral', 'Пиёда, темирйўл, автомагистрал', '🚶'],
        'shatak' => ['Shatakka olish', 'Шатакка олиш', '🚛'],
        'ogoh_imtiyoz' => ['Ogohlantiruvchi va imtiyoz', 'Огоҳлантирувчи ва имтиёз', '❌'],
        'taqiq_belgi' => ['Taqiqlovchi belgilar', 'Тақиқловчи белгилар', '⛔'],
        'axborot' => ['Axborot, servis, qoʻshimcha belgilar', 'Ахборот, сервис, қўшимча белгилар', '🚸'],
        'chiziqlar' => ['Chiziqlar', 'Чизиқлар', '🛣️'],
        'taqiq_shart' => ['Taqiqlovchi shartlar', 'Тақиқловчи шартлар', '🔧'],
        'tezliklar' => ['Tezliklar', 'Тезликлар', '🚗'],
        'buyuruvchi' => ['Buyuruvchi belgilar', 'Буюрувчи белгилар', '🔵'],
        'ong_qol' => ['Chorraha oʻng qoʻl', 'Чорраҳа ўнг қўл', '🔀'],
    ];

    public function run(): void
    {
        $titles = array_column(self::THEMES, 0);
        if (Theme::whereIn('title', $titles)->exists()) {
            $this->command?->warn('Osonprava mavzulari allaqachon mavjud. Seeder qayta ishlamadi (dublikat bo\'lmasligi uchun).');

            return;
        }

        $items = json_decode(file_get_contents(database_path('seeders/data/osonprava/questions.json')), true, 512, JSON_THROW_ON_ERROR);
        $srcImages = database_path('seeders/data/osonprava/images');

        // Rasmlarni oldindan tekshirish — tranzaksiya ichida yarmida to'xtab qolmasin
        foreach ($items as $item) {
            if ($item['photo'] && ! is_file($srcImages.'/'.$item['photo'])) {
                throw new \RuntimeException("Rasm topilmadi: {$item['photo']} (savol #{$item['id']})");
            }
        }

        $oldThemes = Theme::count();
        $oldQuestions = Question::count();

        DB::transaction(function () use ($items, $srcImages) {
            $now = now();

            // 1. Eski mavzular: soft-delete (o'chirib yuborilmaydi — tasks, results ularga bog'langan bo'lishi mumkin)
            Theme::query()->update(['deleted_at' => $now]);

            // 2. Default mavzu: mavjud barcha savollar shu yerga
            $default = Theme::create(['title' => 'Default', 'title_krill' => 'Default', 'icon_type' => Theme::ICON_TEXT, 'icon' => '📦', 'order_id' => count(self::THEMES) + 1]);
            DB::table('question_theme')->delete();
            $existing = Question::pluck('id');
            foreach ($existing->chunk(500) as $chunk) {
                DB::table('question_theme')->insert($chunk->map(fn ($qid) => ['theme_id' => $default->id, 'question_id' => $qid])->all());
            }

            // 3. Yangi 16 ta mavzu
            $themeIds = [];
            $order = 1;
            foreach (self::THEMES as $key => [$title, $krill, $icon]) {
                $themeIds[$key] = Theme::create(['title' => $title, 'title_krill' => $krill, 'icon_type' => Theme::ICON_TEXT, 'icon' => $icon, 'order_id' => $order++])->id;
            }

            // 4. Yangi savollar
            foreach ($items as $item) {
                $image = $item['photo'] ? self::IMAGE_DIR.'/'.$item['photo'] : null;
                if ($image) {
                    Storage::disk('public')->put($image, file_get_contents($srcImages.'/'.$item['photo']));
                }

                $qid = DB::table('questions')->insertGetId([
                    'type' => $image ? Question::TYPE_IMAGE : Question::TYPE_TEXT,
                    'question_latin' => $item['q_lat'],
                    'question_krill' => $item['q_kr'],
                    'image' => $image,
                    'instruction_latin' => $this->plain($item['d_lat']),
                    'instruction_krill' => $this->plain($item['d_kr']),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                DB::table('question_theme')->insert(['theme_id' => $themeIds[$item['theme']], 'question_id' => $qid]);

                $rows = [];
                foreach ($item['a_lat'] as $i => $text) {
                    $rows[] = [
                        'question_id' => $qid,
                        'text_latin' => $text,
                        'text_krill' => $item['a_kr'][$i] ?? $text,
                        'is_correct' => ($i + 1) === $item['correct'] ? 1 : 0,
                        'order' => $i + 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                DB::table('answers')->insert($rows);
            }
        });

        \App\Support\Lang::flush();
        $this->command?->info(sprintf('Osonprava: %d eski mavzu arxivlandi, %d mavjud savol "Default" ga biriktirildi, %d yangi mavzu + %d yangi savol yaratildi (faol mavzular: %d).', $oldThemes, $oldQuestions, count(self::THEMES), count($items), Theme::count()));
    }

    /** Markdown (bold, links, sarlavha) ni oddiy matnga aylantiradi. */
    private function plain(?string $md): ?string
    {
        if (! $md) {
            return null;
        }
        $t = preg_replace('/\[([^\]]+)\]\([^)]+\)/u', '$1', $md);
        $t = str_replace('**', '', $t);
        $t = preg_replace('/^#+\s*/mu', '', $t);

        return trim($t) ?: null;
    }
}
