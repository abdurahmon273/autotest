<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends ApiController
{
    public function login(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string', 'min:6']]);

        $user = User::where('email', $data['email'])->whereHas('roles', fn ($q) => $q->where('roles.id', Role::ADMIN))->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Email yoki parol noto‘g‘ri.']);
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        return $this->me($request);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->ok('Chiqildi.');
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('roles.permissions:id,title');

        return response()->json([
            'user' => $user->only('id', 'name', 'email', 'phone', 'phone_formatted', 'username', 'chat_id', 'initials', 'created_at'),
            'roles' => $user->roles->map->only('id', 'title')->values(),
            'permissions' => $user->roles->flatMap->permissions->pluck('title')->unique()->values(),
        ]);
    }
}
