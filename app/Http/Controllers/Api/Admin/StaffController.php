<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Requests\Admin\StaffRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;

class StaffController extends ApiController
{
    protected function find(int $id): User
    {
        return User::staff()->findOrFail($id);
    }

    public function index(Request $request)
    {
        $this->can('access_staff');

        return User::staff()
            ->select('id', 'name', 'email', 'phone', 'username', 'chat_id', 'created_at')
            ->with('roles:id,title')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('email', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")
                ->orWhere('username', 'like', "%{$s}%")
                ->orWhere('chat_id', 'like', "%{$s}%")))
            ->when($request->role, fn ($q, $r) => $q->whereHas('roles', fn ($q) => $q->where('roles.id', $r)))
            ->latest('id')
            ->paginate(15);
    }

    public function roles()
    {
        return Role::staff()->get(['id', 'title']);
    }

    public function store(StaffRequest $request)
    {
        $this->can('create_staff');
        $user = User::create($request->safe()->except('roles'));
        $user->roles()->sync($request->roles);

        return $this->ok('Saqlandi.', ['id' => $user->id]);
    }

    public function show(int $id)
    {
        $this->can('show_staff');
        $user = $this->find($id)->load('roles.permissions:id,title');

        return $user->only('id', 'name', 'email', 'phone', 'phone_formatted', 'username', 'chat_id', 'initials', 'created_at')
            + ['roles' => $user->roles->map(fn ($r) => ['id' => $r->id, 'title' => $r->title, 'permissions' => $r->permissions->pluck('title')])];
    }

    public function update(StaffRequest $request, int $id)
    {
        $this->can('update_staff');
        $user = $this->find($id);
        $user->update(array_filter($request->safe()->except('roles'), fn ($v, $k) => $k !== 'password' || $v, ARRAY_FILTER_USE_BOTH));

        $roles = $request->roles;
        if ($user->id === auth()->id() && ! in_array(Role::ADMIN, $roles)) {
            $roles[] = Role::ADMIN;
        }
        $user->roles()->sync($roles);
        $user->flushPermissionCache();

        return $this->ok('Saqlandi.');
    }

    public function destroy(int $id)
    {
        $this->can('delete_staff');
        abort_if($id === auth()->id(), 422, 'O‘zingizni o‘chira olmaysiz.');
        $user = $this->find($id);
        $user->flushPermissionCache();
        $user->delete();

        return $this->ok('O‘chirildi.');
    }
}
