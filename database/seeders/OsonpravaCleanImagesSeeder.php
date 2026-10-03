<?php

namespace Database\Seeders;

use App\Models\Question;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Osonprava rasmlaridan "OsonPrava" logosi olib tashlangan nusxalarini (public/oson/) storage'dagi
 * asl rasmlar o'rniga qo'yadi. Faqat bazada savolga bog'langan rasmlar almashtiriladi.
 * Qayta ishga tushirish xavfsiz: bir xil fayl qayta yoziladi, boshqa narsa o'zgarmaydi.
 *
 *   php artisan db:seed --class=OsonpravaCleanImagesSeeder
 */
class OsonpravaCleanImagesSeeder extends Seeder
{
    private const SRC = 'oson';                 // public/oson/<fayl>.webp
    private const DEST = 'images/osonprava';    // storage/app/public/images/osonprava/<fayl>.webp

    public function run(): void
    {
        $src = public_path(self::SRC);
        if (! is_dir($src)) {
            $this->command?->error("Papka topilmadi: {$src}");

            return;
        }

        $files = array_values(array_filter(scandir($src), fn ($f) => str_ends_with(strtolower($f), '.webp')));
        $linked = Question::withTrashed()->where('image', 'like', self::DEST.'/%')->pluck('image')
            ->map(fn ($p) => basename($p))->flip();

        $replaced = $skipped = 0;
        foreach ($files as $f) {
            if (! isset($linked[$f])) {
                $skipped++;
                continue;
            }
            Storage::disk('public')->put(self::DEST.'/'.$f, file_get_contents($src.'/'.$f));
            $replaced++;
        }

        $this->command?->info("Osonprava rasmlar: {$replaced} ta almashtirildi, {$skipped} ta bazada bog'lanmagani uchun o'tkazib yuborildi (jami ".count($files)." ta fayl).");
    }
}
