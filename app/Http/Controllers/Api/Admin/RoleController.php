<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Requests\Admin\RoleRequest;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends ApiController
{
    public function index(Request $request)
    {
        $this->can('access_role');

        return Role::withCount(['permissions', 'users'])
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->latest('id')
            ->paginate(15);
    }

    public function permissions()
    {
        return Permission::latest('id')->get(['id', 'title', 'type']);
    }

    public function store(RoleRequest $request)
    {
        $this->can('create_role');
        $role = Role::create($request->validated());
        $role->permissions()->sync($request->input('permissions', []));

        return $this->ok('Saqlandi.', ['id' => $role->id]);
    }

    public function show(Role $role)
    {
        $this->can('show_role');

        return $role->only('id', 'title', 'created_at') + [
            'permissions' => $role->permissions()->get(['permissions.id', 'title', 'type']),
            'users' => $role->users()->get(['users.id', 'name', 'email', 'phone', 'users.created_at']),
        ];
    }

    public function update(RoleRequest $request, Role $role)
    {
        $this->can('update_role');
        $role->update($request->validated());
        $role->permissions()->sync($request->input('permissions', []));
        $role->flushUsersPermissionCache();

        return $this->ok('Saqlandi.');
    }

    public function destroy(Role $role)
    {
        $this->can('delete_role');
        abort_if(in_array($role->id, Role::SYSTEM), 422, 'Tizim rollarini o‘chirib bo‘lmaydi.');
        $role->flushUsersPermissionCache();
        $role->delete();

        return $this->ok('O‘chirildi.');
    }
}
