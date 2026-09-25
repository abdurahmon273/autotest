<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Group;
use App\Models\Role;
use Illuminate\Http\Request;

class StudentController extends PersonController
{
    protected int $role = Role::STUDENT;
    protected string $key = 'student';

    public function pick(Request $request)
    {
        $this->can('access_student');

        return \App\Models\User::withRole(Role::STUDENT)
            ->whereIn('id', (array) $request->input('ids', []))
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'username', 'chat_id']);
    }

    public function search(Request $request)
    {
        $this->can('access_student');

        $excluded = $request->group_id
            ? Group::findOrFail($request->group_id)->students()->pluck('users.id')
            : collect($request->input('exclude', []));

        return \App\Models\User::withRole(Role::STUDENT)
            ->select('id', 'name', 'phone', 'username')
            ->whereNotIn('id', $excluded)
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('username', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")
                ->orWhere('chat_id', 'like', "%{$s}%")))
            ->orderBy('name')
            ->paginate(20);
    }
}
