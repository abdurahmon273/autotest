<?php

namespace App\Http\Requests\Admin;

use App\Models\Permission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/', Rule::unique('permissions', 'title')->ignore($this->route('permission'))],
            'type' => ['required', Rule::in(array_keys(Permission::TYPE))],
        ];
    }

    public function messages(): array
    {
        return ['title.regex' => 'Faqat kichik lotin harflari, raqamlar va pastki chiziq (masalan: access_student).'];
    }

    public function attributes(): array
    {
        return ['title' => 'nomi', 'type' => 'turi'];
    }
}
