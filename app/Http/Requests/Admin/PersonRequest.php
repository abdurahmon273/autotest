<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PersonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => User::normalizePhone($this->phone) ?: null,
            'username' => ltrim((string) $this->username, '@') ?: null,
            'chat_id' => $this->chat_id ?: null,
        ]);
    }

    public function rules(): array
    {
        $person = $this->route('teacher') ?? $this->route('student');

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'digits:9', Rule::unique('users', 'phone')->ignore($person)],
            'group_id' => ['nullable', 'integer', 'exists:groups,id'],
            'username' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/', Rule::unique('users', 'username')->ignore($person)],
            'chat_id' => ['nullable', 'digits_between:5,20', Rule::unique('users', 'chat_id')->ignore($person)->whereNull('deleted_at')],
            'max_attempts' => ['nullable', 'integer', 'min:1', 'max:100'],
            'password' => [$person ? 'nullable' : 'required', 'string', 'min:4', 'max:12'],
        ];
    }

    public function messages(): array
    {
        return [
            'chat_id.unique' => 'Bu Telegram ID boshqa foydalanuvchiga biriktirilgan.','phone.digits' => 'Format: 9X XXX XX XX', 'username.regex' => 'Faqat harf, raqam va _'];
    }

    public function attributes(): array
    {
        return ['name' => 'ism', 'phone' => 'telefon', 'username' => 'username', 'chat_id' => 'telegram id', 'password' => 'parol'];
    }
}
