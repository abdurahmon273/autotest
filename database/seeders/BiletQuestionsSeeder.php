<?php

namespace Database\Seeders;

use App\Models\Question;
use App\Models\Theme;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BiletQuestionsSeeder extends Seeder
{
    public function run(): void
    {
        $items = json_decode(file_get_contents(database_path('seeders/data/bilets_71_100.json')), true);
        $norm = fn ($t) => mb_strtolower(str_replace(['‘', '’', '`'], "'", trim($t)));
        $themes = Theme::orderBy('id')->get()->mapWithKeys(fn ($t) => [$norm($t->title) => $t->id]);
        $fallback = $themes[$norm('Tez kunda')] ?? Theme::create(['title' => 'Tez kunda'])->id;

        DB::transaction(function () use ($items, $themes, $fallback, $norm) {
            foreach ($items as $item) {
                $image = $item['image'] ? 'images/bilet_'.$item['bilet'].'_'.$item['image'] : null;
                if (Question::where('question', $item['question'])->where('image', $image)->exists()) {
                    continue;
                }
                if ($image) {
                    Storage::disk('public')->put($image, file_get_contents(database_path('seeders/data/images/'.$item['image'])));
                }

                $question = Question::create([
                    'type' => $image ? Question::TYPE_IMAGE : Question::TYPE_TEXT,
                    'question' => $item['question'],
                    'image' => $image,
                ]);
                $question->themes()->sync([$themes[$norm($item['theme'])] ?? $fallback]);
                $question->answers()->createMany(collect($item['answers'])->map(fn ($a, $i) => [
                    'text' => $a['text'],
                    'is_correct' => $a['is_correct'],
                    'order' => $i + 1,
                ])->all());
            }
        });
    }
}
