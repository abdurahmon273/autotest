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
            'phone' => User::normalizePhone($this->phone),
            'username' => ltrim((string) $this->username, '@') ?: null,
            'chat_id' => $this->chat_id ?: null,
        ]);
    }

    public function rules(): array
    {
        $person = $this->route('teacher') ?? $this->route('student');

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'digits:9', Rule::unique('users', 'phone')->ignore($person)],
            'username' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/', Rule::unique('users', 'username')->ignore($person)],
            'chat_id' => ['nullable', 'digits_between:5,20', Rule::unique('users', 'chat_id')->ignore($person)],
            'max_attempts' => ['nullable', 'integer', 'min:1', 'max:100'],
            'password' => [$person ? 'nullable' : 'required', 'string', 'min:6', 'confirmed'],
        ];
    }

    public function messages(): array
    {
        return ['phone.digits' => 'Format: 9X XXX XX XX', 'username.regex' => 'Faqat harf, raqam va _'];
    }

    public function attributes(): array
    {
        return ['name' => 'ism', 'phone' => 'telefon', 'username' => 'username', 'chat_id' => 'telegram id', 'password' => 'parol'];
    }
}
