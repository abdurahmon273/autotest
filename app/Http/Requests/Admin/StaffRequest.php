<?php

namespace App\Http\Requests\Admin;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => User::normalizePhone($this->phone),
            'email' => $this->email ?: null,
            'username' => ltrim((string) $this->username, '@') ?: null,
            'chat_id' => $this->chat_id ?: null,
            'roles' => array_map('intval', (array) $this->roles),
        ]);
    }

    public function rules(): array
    {
        $staff = $this->route('staff');
        $roles = $this->roles ?? [];
        $isAdmin = in_array(Role::ADMIN, $roles);
        $hasOther = count(array_diff($roles, [Role::ADMIN])) > 0;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [$isAdmin ? 'required' : 'nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($staff)],
            'phone' => [$hasOther ? 'required' : 'nullable', 'digits:9', Rule::unique('users', 'phone')->ignore($staff)],
            'username' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/', Rule::unique('users', 'username')->ignore($staff)],
            'chat_id' => ['nullable', 'digits_between:5,20', Rule::unique('users', 'chat_id')->ignore($staff)->whereNull('deleted_at')],
            'max_attempts' => ['nullable', 'integer', 'min:1', 'max:100'],
            'password' => [$staff ? 'nullable' : 'required', 'string', 'min:4', 'max:12', 'confirmed'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['integer', Rule::exists('roles', 'id')->whereNotIn('id', Role::NON_STAFF)],
        ];
    }

    public function messages(): array
    {
        return [
            'chat_id.unique' => 'Bu Telegram ID boshqa foydalanuvchiga biriktirilgan.',
            'phone.digits' => 'Format: 9X XXX XX XX',
            'username.regex' => 'Faqat harf, raqam va _',
            'email.required' => 'Admin uchun email majburiy.',
            'phone.required' => 'Bu rol uchun telefon majburiy.',
            'roles.required' => 'Kamida bitta rol tanlang.',
        ];
    }

    public function attributes(): array
    {
        return ['name' => 'ism', 'email' => 'email', 'phone' => 'telefon', 'username' => 'username', 'chat_id' => 'telegram id', 'password' => 'parol', 'roles' => 'rollar'];
    }
}
