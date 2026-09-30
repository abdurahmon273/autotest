<?php

namespace App\Http\Requests\Admin;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('groups', 'name')->ignore($this->route('group'))],
            'description' => ['nullable', 'string', 'max:255'],
            'telegram_chat_id' => ['nullable', 'string', 'max:64', 'regex:/^-?\d+$/'],
            'students' => ['nullable', 'array'],
            'students.*' => ['integer', Rule::exists('role_user', 'user_id')->where('role_id', Role::STUDENT)],
        ];
    }

    public function messages(): array
    {
        return ['telegram_chat_id.regex' => 'Telegram guruh ID faqat raqamlardan iborat bo‘lishi kerak (masalan -1001234567890).'];
    }

    public function attributes(): array
    {
        return ['name' => 'nomi', 'description' => 'tasnif', 'telegram_chat_id' => 'Telegram guruh ID', 'students' => 'studentlar'];
    }
}
