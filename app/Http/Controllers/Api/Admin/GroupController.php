<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Requests\Admin\GroupRequest;
use App\Models\Group;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;

class GroupController extends ApiController
{
    public function index(Request $request)
    {
        $this->can('access_group');

        return Group::withCount('students')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('description', 'like', "%{$s}%")))
            ->latest('id')
            ->paginate(15);
    }

    public function search(Request $request)
    {
        return Group::select('id', 'name')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->latest('id')->limit(10)->get();
    }

    public function store(GroupRequest $request)
    {
        $this->can('create_group');
        $group = Group::create($request->safe()->only('name', 'description'));
        $group->students()->sync($request->input('students', []));

        return $this->ok('Saqlandi.', ['id' => $group->id]);
    }

    public function show(Group $group)
    {
        $this->can('show_group');

        return $group->only('id', 'name', 'description', 'created_at')
            + ['students' => $group->students()->get(['users.id', 'name', 'phone', 'users.created_at'])];
    }

    public function update(GroupRequest $request, Group $group)
    {
        $this->can('update_group');
        $group->update($request->safe()->only('name', 'description'));

        return $this->ok('Saqlandi.');
    }

    public function destroy(Group $group)
    {
        $this->can('delete_group');
        $group->delete();

        return $this->ok('O‘chirildi.');
    }

    public function students(Request $request, Group $group)
    {
        $this->can('update_group');

        return $group->students()
            ->select('users.id', 'name', 'phone', 'username', 'chat_id')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('username', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")
                ->orWhere('chat_id', 'like', "%{$s}%")))
            ->orderBy('name')
            ->paginate(15);
    }

    public function addStudents(Request $request, Group $group)
    {
        $this->can('update_group');
        $ids = $request->validate(['ids' => ['required', 'array', 'min:1'], 'ids.*' => ['integer']])['ids'];
        $ids = User::withRole(Role::STUDENT)->whereIn('id', $ids)->pluck('id')->all();
        $group->students()->syncWithoutDetaching($ids);

        return $this->ok(count($ids).' ta student qo‘shildi.');
    }

    public function removeStudent(Group $group, int $user)
    {
        $this->can('update_group');
        $group->students()->detach($user);

        return $this->ok('Chiqarildi.');
    }
}
