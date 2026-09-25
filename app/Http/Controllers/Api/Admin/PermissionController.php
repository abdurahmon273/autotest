<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Requests\Admin\PermissionRequest;
use App\Models\Permission;
use Illuminate\Http\Request;

class PermissionController extends ApiController
{
    public function index(Request $request)
    {
        $this->can('access_permission');

        return Permission::query()
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->latest('id')
            ->paginate(20);
    }

    public function store(PermissionRequest $request)
    {
        $this->can('create_permission');
        $p = Permission::create($request->validated());

        return $this->ok('Saqlandi.', ['id' => $p->id]);
    }

    public function show(Permission $permission)
    {
        $this->can('show_permission');

        return $permission->only('id', 'title', 'type', 'created_at') + ['roles' => $permission->roles()->get(['roles.id', 'title'])];
    }

    public function update(PermissionRequest $request, Permission $permission)
    {
        $this->can('update_permission');
        $permission->update($request->validated());
        $permission->roles->each->flushUsersPermissionCache();

        return $this->ok('Saqlandi.');
    }

    public function destroy(Permission $permission)
    {
        $this->can('delete_permission');
        $permission->roles->each->flushUsersPermissionCache();
        $permission->delete();

        return $this->ok('O‘chirildi.');
    }
}
