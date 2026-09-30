<?php

namespace App\Http\Controllers\Api\Admin;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProfileController extends ApiController
{
    public function show(Request $request)
    {
        $this->can('access_profile');
        $user = $request->user()->load('roles.permissions:id,title');

        return $user->only('id', 'name', 'email', 'phone', 'phone_formatted', 'username', 'chat_id', 'initials', 'created_at')
            + ['roles' => $user->roles->map(fn ($r) => ['id' => $r->id, 'title' => $r->title, 'permissions' => $r->permissions->pluck('title')])];
    }

    public function update(Request $request)
    {
        $this->can('update_profile');
        $user = $request->user();
        $request->merge(['username' => ltrim((string) $request->username, '@') ?: null, 'chat_id' => $request->chat_id ?: null, 'email' => strtolower(trim((string) $request->email))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'username' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/', Rule::unique('users', 'username')->ignore($user->id)],
            'chat_id' => ['nullable', 'digits_between:5,20', Rule::unique('users', 'chat_id')->ignore($user->id)],
        ], ['username.regex' => 'Faqat harf, raqam va _', 'email.unique' => 'Bu email boshqa foydalanuvchida mavjud.'], ['email' => 'email']);

        $user->update($data);

        return $this->ok('Saqlandi.');
    }

    public function password(Request $request)
    {
        $this->can('update_profile');
        $data = $request->validate([
            'old_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:4', 'max:12', 'confirmed', 'different:old_password'],
        ], [
            'old_password.current_password' => 'Joriy parol noto‘g‘ri.',
            'password.different' => 'Yangi parol eskisidan farq qilishi kerak.',
        ]);

        $request->user()->update(['password' => $data['password']]);

        return $this->ok('Parol o‘zgartirildi.');
    }
}
