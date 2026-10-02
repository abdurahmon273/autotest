<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Middleware\EnsureUser;
use App\Http\Requests\Admin\GroupRequest;
use App\Models\Group;
use App\Models\Role;
use App\Models\User;
use App\Services\HomeworkService;
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
        $group = Group::create($request->safe()->only('name', 'description', 'telegram_chat_id'));
        $group->students()->sync($request->input('students', []));
        EnsureUser::flush($request->input('students', []));

        return $this->ok('Saqlandi.', ['id' => $group->id]);
    }

    public function show(Group $group)
    {
        $this->can('show_group');

        return $group->only('id', 'name', 'description', 'telegram_chat_id', 'created_at')
            + ['students' => $group->students()->get(['users.id', 'name', 'phone', 'users.created_at'])];
    }

    public function update(GroupRequest $request, Group $group)
    {
        $this->can('update_group');
        $group->update($request->safe()->only('name', 'description', 'telegram_chat_id'));

        return $this->ok('Saqlandi.');
    }

    public function destroy(Group $group)
    {
        $this->can('delete_group');
        EnsureUser::flush($group->students()->pluck('users.id'));
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
        EnsureUser::flush($ids);
        app(HomeworkService::class)->createForStudents($group, $ids);

        return $this->ok(count($ids).' ta student qo‘shildi.');
    }

    public function removeStudent(Group $group, int $user)
    {
        $this->can('update_group');
        $group->students()->detach($user);
        EnsureUser::flush($user);

        return $this->ok('Chiqarildi.');
    }
}
