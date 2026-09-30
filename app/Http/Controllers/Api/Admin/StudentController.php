<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Group;
use App\Models\Role;
use Illuminate\Http\Request;

class StudentController extends PersonController
{
    protected int $role = Role::STUDENT;
    protected string $key = 'student';

    /** O'quvchilar boshqaruvi ro'yxati: qidiruv, holat (faol/bloklangan), guruh filtri. */
    public function manage(Request $request)
    {
        $this->can('access_student');

        return \App\Models\User::withRole(Role::STUDENT)
            ->select('id', 'name', 'phone', 'username', 'max_attempts', 'created_at')
            ->with('groups:groups.id,name')
            ->withCount('homeworks')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('username', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")))
            ->when($request->status === 'active', fn ($q) => $q->where('max_attempts', '>', 0))
            ->when($request->status === 'blocked', fn ($q) => $q->where('max_attempts', '<=', 0))
            ->when($request->group_id, fn ($q, $g) => $q->whereHas('groups', fn ($q) => $q->where('groups.id', $g)))
            ->latest('id')
            ->paginate(15);
    }

    /** Filtr uchun guruhlar ro'yxati. */
    public function groups()
    {
        $this->can('access_student');

        return Group::orderBy('name')->get(['id', 'name']);
    }

    /** Imkoniyatlar sonini o'zgartirish / bloklash (max_attempts = 0). */
    public function attempts(Request $request, int $id)
    {
        $this->can('update_student');
        $data = $request->validate([
            'max_attempts' => ['required', 'integer', 'min:0', 'max:1000'],
            'blocked' => ['nullable', 'boolean'],
        ], [], ['max_attempts' => 'imkoniyatlar soni']);

        $student = $this->find($id);
        $student->update(['max_attempts' => $request->boolean('blocked') ? 0 : $data['max_attempts']]);

        return $this->ok($request->boolean('blocked') ? 'O‘quvchi bloklandi.' : 'Saqlandi.', ['max_attempts' => $student->max_attempts]);
    }

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
