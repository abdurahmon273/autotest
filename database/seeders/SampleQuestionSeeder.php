<?php

namespace Database\Seeders;

use App\Models\Question;
use App\Models\Theme;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class SampleQuestionSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'theme' => 'To‘xtash va quvib o‘tish',
                'image' => 'sample_1.jpeg',
                'question_latin' => 'Haydovchi ushbu joyda avtomobilni to‘xtab turish uchun qo‘yishiga ruxsat etiladimi?',
                'question_krill' => 'Ҳайдовчи ушбу жойда автомобилни тўхтаб туриш учун қўйишига рухсат этиладими?',
                'answers' => [['Ha', 'Ҳа', 1], ['Yo‘q', 'Йўқ', 0]],
            ],
            [
                'theme' => 'Chorraxa Tartibga Solinmagan',
                'image' => 'sample_2.jpeg',
                'question_latin' => 'Siz chorrahada chapga burilmoqchisiz. Ushbu vaziyatda Siz kimga yo‘l berasiz?',
                'question_krill' => 'Сиз чорраҳада чапга бурилмоқчисиз. Ушбу вазиятда Сиз кимга йўл берасиз?',
                'instruction_latin' => 'Asosiy yo‘lda ketayotgan haydovchi ikkinchi darajali yo‘ldan kelayotganlarga nisbatan imtiyozga ega.',
                'instruction_krill' => 'Асосий йўлда кетаётган ҳайдовчи иккинчи даражали йўлдан келаётганларга нисбатан имтиёзга эга.',
                'answers' => [['Faqat avtobusga', 'Фақат автобусга', 0], ['Faqat yengil avtomobilga', 'Фақат енгил автомобилга', 0], ['Hech biriga', 'Ҳеч бирига', 1]],
            ],
            [
                'theme' => 'Chiziqlar',
                'image' => null,
                'question_latin' => 'Yo‘lda “TO‘XTASH”, “STOP” yozuvi ko‘rinishdagi yo‘l chizig‘i nimani bildiradi?',
                'question_krill' => 'Йўлда “ТЎХТАШ”, “СТОП” ёзуви кўринишдаги йўл чизиғи нимани билдиради?',
                'answers' => [
                    ['Tartibga solingan chorrahada to‘xtash chizig‘iga yaqinlashayotganligi haqida ogohlantiradi', 'Тартибга солинган чорраҳада тўхташ чизиғига яқинлашаётганлиги ҳақида огоҳлантиради', 0],
                    ['To‘xtash chizig‘i va “To‘xtamasdan harakatlanish taqiqlanadi” belgisi o‘rnatilgan chorrahaga yaqinlashayotganligini bildiradi', 'Тўхташ чизиғи ва “Тўхтамасдан ҳаракатланиш тақиқланади” белгиси ўрнатилган чорраҳага яқинлашаётганлигини билдиради', 1],
                    ['“Yo‘l bering” belgisiga yaqinlashilayotganligini bildiradi', '“Йўл беринг” белгисига яқинлашилаётганлигини билдиради', 0],
                ],
            ],
        ];

        foreach ($items as $item) {
            if (Question::where('question_latin', $item['question_latin'])->exists()) {
                continue;
            }

            $image = null;
            if ($item['image']) {
                $image = 'images/'.$item['image'];
                Storage::disk('public')->put($image, file_get_contents(public_path('backup/images/'.$item['image'])));
            }

            $question = Question::create([
                'type' => $image ? Question::TYPE_IMAGE : Question::TYPE_TEXT,
                'question_latin' => $item['question_latin'],
                'question_krill' => $item['question_krill'],
                'instruction_latin' => $item['instruction_latin'] ?? null,
                'instruction_krill' => $item['instruction_krill'] ?? null,
                'image' => $image,
            ]);
            $question->themes()->sync([Theme::where('title', $item['theme'])->value('id')]);
            $question->answers()->createMany(collect($item['answers'])->map(fn ($a, $i) => [
                'text_latin' => $a[0],
                'text_krill' => $a[1],
                'is_correct' => $a[2],
                'order' => $i + 1,
            ])->all());
        }
    }
}
