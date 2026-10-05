<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Question;
use App\Models\Theme;
use App\Support\Lang;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class QuestionController extends ApiController
{
    public function index(Request $request)
    {
        $this->can('access_question');

        // theme: faol mavzu id | archived_theme: arxiv mavzu id | theme = "active" — faqat faol mavzulardagi savollar (arxivsiz)
        $activeOnly = $request->theme === 'active';
        $theme = $activeOnly ? 0 : (int) $request->theme;
        $archived = (int) $request->archived_theme;

        return Question::withCount('answers')
            ->with(['themes' => fn ($q) => $q->withoutGlobalScope('active')->select('themes.id', 'icon_type', 'icon', 'status')->titled()])
            ->select('id', 'type', 'question_krill', 'question_latin', 'image')
            ->when($request->search, fn ($q, $s) => $this->applySearch($q, $s))
            ->when($activeOnly, fn ($q) => $q->whereHas('themes', fn ($q) => $q->where('themes.status', Theme::STATUS_ACTIVE)))
            ->when($theme || $archived, fn ($q) => $q->whereHas('themes', function ($q) use ($theme, $archived) {
                $q->withoutGlobalScope('active');
                if ($theme && $archived) {
                    $q->whereIn('themes.id', [$theme, $archived]);
                } elseif ($theme) {
                    $q->where('themes.id', $theme);
                } else {
                    $q->where(fn ($q) => $q->where('themes.id', $archived)->orWhere('themes.status', Theme::STATUS_ACTIVE));
                }
            }))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->latest('id')
            ->paginate(15);
    }

    /**
     * Qidiruv: so'zlarga bo'linadi, har so'z savolning krill yoki lotin matnida bo'lishi shart (tartib muhim emas).
     * Apostrof variantlari (' ‘ ’ ʻ `) LIKE da istalgan bitta belgiga mos keladi.
     */
    private function applySearch($query, string $search)
    {
        $words = preg_split('/\s+/u', trim($search), -1, PREG_SPLIT_NO_EMPTY);

        return $query->where(function ($q) use ($words) {
            foreach ($words as $word) {
                $w = str_replace(['%', '_'], ['\\%', '\\_'], $word);
                $w = preg_replace("/[\x{2018}\x{2019}\x{02BB}\x{02BC}'`]/u", '_', $w);
                $q->where(fn ($q) => $q->where('question_krill', 'like', "%{$w}%")->orWhere('question_latin', 'like', "%{$w}%"));
            }
        });
    }

    public function themes()
    {
        return Theme::select('id')->titled()->ordered()->get();
    }

    public function archivedThemes()
    {
        return Theme::withInactive()->where('themes.status', '!=', Theme::STATUS_ACTIVE)->select('id')->titled()->ordered()->get();
    }

    public function languages()
    {
        return Lang::all();
    }

    public function store(Request $request)
    {
        $this->can('create_question');

        return $this->save($request, new Question);
    }

    public function show(Question $question)
    {
        $this->can('show_question');
        $question->load(['themes' => fn ($q) => $q->select('themes.id', 'icon_type', 'icon')->titled(), 'answers' => fn ($q) => $q->select('id', 'question_id', 'text_krill', 'text_latin', 'is_correct', 'order')]);

        return $question;
    }

    public function edit(Question $question)
    {
        $this->can('update_question');
        $question->load(['themes' => fn ($q) => $q->select('themes.id', 'icon_type', 'icon')->titled(), 'answers' => fn ($q) => $q->select('id', 'question_id', 'text_krill', 'text_latin', 'is_correct', 'order')]);

        return $question;
    }

    public function update(Request $request, Question $question)
    {
        $this->can('update_question');

        return $this->save($request, $question);
    }

    public function destroy(Question $question)
    {
        $this->can('delete_question');
        if ($question->image) {
            Storage::disk('public')->delete($question->image);
        }
        $question->delete();

        return $this->ok('O‘chirildi.');
    }

    private function save(Request $request, Question $question)
    {
        $default = Lang::default();
        $other = $default === 'krill' ? 'latin' : 'krill';
        $data = $request->validate([
            'type' => ['required', 'in:0,1'],
            "question_{$default}" => ['required', 'string'],
            "question_{$other}" => ['nullable', 'string'],
            'instruction_krill' => ['nullable', 'string'],
            'instruction_latin' => ['nullable', 'string'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp,bmp,svg', 'max:4096'],
            'remove_image' => ['nullable', 'boolean'],
            'themes' => ['required', 'array', 'min:1'],
            'themes.*' => ['integer', 'exists:themes,id'],
            'answers' => ['required', 'array', 'min:2', 'max:10'],
            "answers.*.text_{$default}" => ['required', 'string'],
            "answers.*.text_{$other}" => ['nullable', 'string'],
            'answers.*.is_correct' => ['required', 'boolean'],
        ], [
            'themes.required' => 'Kamida bitta mavzu tanlang.',
            'answers.min' => 'Kamida 2 ta javob bo‘lishi kerak.',
            "answers.*.text_{$default}.required" => 'Javob matni bo‘sh bo‘lmasin.',
            "question_{$default}.required" => 'Savol matni bo‘sh bo‘lmasin.',
            'image.mimes' => 'Rasm formati qo‘llab-quvvatlanmaydi (jpg, png, gif, webp, bmp, svg).',
        ]);

        $hasImage = $request->hasFile('image') || ($question->image && ! $request->boolean('remove_image'));
        abort_if((int) $data['type'] === Question::TYPE_IMAGE && ! $hasImage, 422, 'Rasmli savol uchun rasm majburiy.');
        abort_if(! collect($data['answers'])->contains(fn ($a) => filter_var($a['is_correct'], FILTER_VALIDATE_BOOL)), 422, 'To‘g‘ri javobni belgilang.');

        DB::transaction(function () use ($request, $question, $data) {
            $old = $question->image;
            $image = $old;
            if ((int) $data['type'] === Question::TYPE_TEXT || $request->boolean('remove_image')) {
                $image = null;
            }
            if ($request->hasFile('image') && (int) $data['type'] === Question::TYPE_IMAGE) {
                $image = $request->file('image')->store('images', 'public');
            }
            if ($old && $old !== $image) {
                Storage::disk('public')->delete($old);
            }

            $question->fill([
                'type' => $data['type'],
                'question_krill' => ($data['question_krill'] ?? null) ?: null,
                'question_latin' => ($data['question_latin'] ?? null) ?: null,
                'instruction_krill' => ($data['instruction_krill'] ?? null) ?: null,
                'instruction_latin' => ($data['instruction_latin'] ?? null) ?: null,
                'image' => $image,
            ])->save();
            $question->themes()->sync($data['themes']);
            $question->answers()->delete();
            $question->answers()->createMany(collect($data['answers'])->values()->map(fn ($a, $i) => [
                'text_krill' => ($a['text_krill'] ?? null) ?: null,
                'text_latin' => ($a['text_latin'] ?? null) ?: null,
                'is_correct' => (int) filter_var($a['is_correct'], FILTER_VALIDATE_BOOL),
                'order' => $i + 1,
            ])->all());
        });

        return $this->ok('Saqlandi.', ['id' => $question->id]);
    }
}
