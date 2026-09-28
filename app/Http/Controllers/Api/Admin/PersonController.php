<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Requests\Admin\PersonRequest;
use App\Models\User;
use Illuminate\Http\Request;

abstract class PersonController extends ApiController
{
    protected int $role;
    protected string $key;

    protected function find(int $id): User
    {
        return User::withRole($this->role)->findOrFail($id);
    }

    public function index(Request $request)
    {
        $this->can("access_{$this->key}");

        return User::withRole($this->role)
            ->select('id', 'name', 'phone', 'username', 'chat_id', 'max_attempts', 'created_at')
            ->with('groups:groups.id,name')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")
                ->orWhere('username', 'like', "%{$s}%")
                ->orWhere('chat_id', 'like', "%{$s}%")))
            ->latest('id')
            ->paginate(15);
    }

    public function store(PersonRequest $request)
    {
        $this->can("create_{$this->key}");
        $person = User::create($request->safe()->except('group_id'));
        $person->roles()->sync([$this->role]);
        if ($request->filled('group_id')) {
            $person->groups()->sync([$request->group_id]);
        }

        return $this->ok('Saqlandi.', ['id' => $person->id]);
    }

    public function show(int $id)
    {
        $this->can("show_{$this->key}");

        $p = $this->find($id);
        $g = $p->groups()->select('groups.id', 'name')->first();

        return $p->only('id', 'name', 'phone', 'phone_formatted', 'username', 'chat_id', 'max_attempts', 'initials', 'created_at', 'updated_at') + ['group' => $g ? ['id' => $g->id, 'name' => $g->name] : null];
    }

    public function update(PersonRequest $request, int $id)
    {
        $this->can("update_{$this->key}");
        $person = $this->find($id);
        $data = $request->safe()->except('group_id');
        $person->update(array_filter($data, fn ($v, $k) => ! in_array($k, ['password']) || $v, ARRAY_FILTER_USE_BOTH));
        if ($request->has('group_id')) {
            $request->filled('group_id') ? $person->groups()->sync([$request->group_id]) : $person->groups()->detach();
        }

        return $this->ok('Saqlandi.');
    }

    public function destroy(int $id)
    {
        $this->can("delete_{$this->key}");
        $person = $this->find($id);
        $person->flushPermissionCache();
        $person->delete();

        return $this->ok('O‘chirildi.');
    }
}
