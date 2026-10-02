<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\GlobalSetting;
use App\Support\Lang;
use App\Models\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class GeneralSettingController extends ApiController
{
    public function show()
    {
        $this->can('access_general_setting');
        $s = GlobalSetting::current();

        return [
            'default_language_id' => $s->default_language_id,
            'max_attempts_count' => $s->max_attempts_count ?? 3,
            'default_quiz_image_url' => GlobalSetting::defaultQuizImageUrl(),
            'twenty_quiz_time' => $s->twenty_quiz_time ?? GlobalSetting::DEFAULT_TWENTY_TIME,
            'fifty_quiz_time' => $s->fifty_quiz_time ?? GlobalSetting::DEFAULT_FIFTY_TIME,
            'quiz_wait_time' => $s->quiz_wait_time ?? GlobalSetting::DEFAULT_WAIT_TIME,
            'languages' => Language::orderBy('id')->get(['id', 'title', 'code', 'status']),
        ];
    }

    /** Rasmsiz savollar uchun standart rasmni yuklash (webp, eni 1200px gacha). */
    public function uploadQuizImage(Request $request)
    {
        $this->can('access_general_setting');
        $request->validate(['image' => ['required', 'file', 'mimes:jpg,jpeg,png,gif,webp,bmp', 'max:5120']], [], ['image' => 'rasm']);

        $s = GlobalSetting::current();
        $old = $s->default_quiz_image;
        $path = 'settings/quiz-default-'.time().'.webp';
        $img = (new ImageManager(new Driver))->read($request->file('image')->getRealPath())->scaleDown(width: 1200);
        Storage::disk('public')->put($path, (string) $img->toWebp(quality: 85));

        $s->default_quiz_image = $path;
        $s->effective_at = now();
        $s->save();
        if ($old && $old !== $path) {
            Storage::disk('public')->delete($old);
        }
        GlobalSetting::flushQuizImage();

        return $this->ok('Rasm saqlandi.', ['default_quiz_image_url' => GlobalSetting::defaultQuizImageUrl()]);
    }

    public function deleteQuizImage()
    {
        $this->can('access_general_setting');
        $s = GlobalSetting::current();
        if ($s->default_quiz_image) {
            Storage::disk('public')->delete($s->default_quiz_image);
            $s->default_quiz_image = null;
            $s->save();
        }
        GlobalSetting::flushQuizImage();

        return $this->ok('Rasm o‘chirildi.');
    }

    public function update(Request $request)
    {
        $this->can('access_general_setting');
        $data = $request->validate([
            'default_language_id' => ['nullable', 'exists:languages,id'],
            'max_attempts_count' => ['required', 'integer', 'min:1', 'max:100'],
            'twenty_quiz_time' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'fifty_quiz_time' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'quiz_wait_time' => ['sometimes', 'integer', 'min:0', 'max:60'],
        ]);

        $s = GlobalSetting::current();
        $s->fill($data);
        $s->effective_at = now();
        $s->save();

        Lang::flush();

        return $this->ok('Saqlandi.');
    }

    public function storeLanguage(Request $request)
    {
        $this->can('access_general_setting');
        $lang = Language::create($this->validated($request));

        Lang::flush();

        return $this->ok('Saqlandi.', ['id' => $lang->id]);
    }

    public function updateLanguage(Request $request, Language $language)
    {
        $this->can('access_general_setting');
        $language->update($this->validated($request, $language));

        Lang::flush();

        return $this->ok('Saqlandi.');
    }

    public function toggleLanguage(Language $language)
    {
        $this->can('access_general_setting');
        abort_if($language->status && GlobalSetting::current()->default_language_id === $language->id, 422, 'Birlamchi tilni o‘chirib bo‘lmaydi.');
        $language->update(['status' => $language->status ? 0 : 1]);

        Lang::flush();

        return $this->ok($language->status ? 'Til yoqildi.' : 'Til o‘chirildi.');
    }

    public function destroyLanguage(Language $language)
    {
        $this->can('access_general_setting');
        abort_if(GlobalSetting::current()->default_language_id === $language->id, 422, 'Birlamchi tilni o‘chirib bo‘lmaydi.');
        $language->delete();

        Lang::flush();

        return $this->ok('O‘chirildi.');
    }

    private function validated(Request $request, ?Language $language = null): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:64'],
            'code' => ['required', 'string', 'max:16', 'regex:/^[a-z0-9_]+$/', Rule::unique('languages', 'code')->ignore($language?->id)],
        ], ['code.regex' => 'Faqat kichik harf, raqam va _ (masalan: latin, krill)'], ['title' => 'nomi', 'code' => 'kodi']);
    }
}
