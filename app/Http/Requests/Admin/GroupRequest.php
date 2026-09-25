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
            'students' => ['nullable', 'array'],
            'students.*' => ['integer', Rule::exists('role_user', 'user_id')->where('role_id', Role::STUDENT)],
        ];
    }

    public function attributes(): array
    {
        return ['name' => 'nomi', 'description' => 'tasnif', 'students' => 'studentlar'];
    }
}
