<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\GlobalSetting;
use App\Models\Language;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GeneralSettingController extends ApiController
{
    public function show()
    {
        $this->can('access_general_setting');
        $s = GlobalSetting::current();

        return [
            'default_language_id' => $s->default_language_id,
            'max_attempts_count' => $s->max_attempts_count ?? 3,
            'languages' => Language::orderBy('id')->get(['id', 'title', 'code', 'status']),
        ];
    }

    public function update(Request $request)
    {
        $this->can('access_general_setting');
        $data = $request->validate([
            'default_language_id' => ['nullable', 'exists:languages,id'],
            'max_attempts_count' => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        $s = GlobalSetting::current();
        $s->fill($data);
        $s->effective_at = now();
        $s->save();

        return $this->ok('Saqlandi.');
    }

    public function storeLanguage(Request $request)
    {
        $this->can('access_general_setting');
        $lang = Language::create($this->validated($request));

        return $this->ok('Saqlandi.', ['id' => $lang->id]);
    }

    public function updateLanguage(Request $request, Language $language)
    {
        $this->can('access_general_setting');
        $language->update($this->validated($request, $language));

        return $this->ok('Saqlandi.');
    }

    public function toggleLanguage(Language $language)
    {
        $this->can('access_general_setting');
        abort_if($language->status && GlobalSetting::current()->default_language_id === $language->id, 422, 'Birlamchi tilni o‘chirib bo‘lmaydi.');
        $language->update(['status' => $language->status ? 0 : 1]);

        return $this->ok($language->status ? 'Til yoqildi.' : 'Til o‘chirildi.');
    }

    public function destroyLanguage(Language $language)
    {
        $this->can('access_general_setting');
        abort_if(GlobalSetting::current()->default_language_id === $language->id, 422, 'Birlamchi tilni o‘chirib bo‘lmaydi.');
        $language->delete();

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
