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
        $person = User::create($request->validated());
        $person->roles()->sync([$this->role]);

        return $this->ok('Saqlandi.', ['id' => $person->id]);
    }

    public function show(int $id)
    {
        $this->can("show_{$this->key}");

        return $this->find($id)->only('id', 'name', 'phone', 'phone_formatted', 'username', 'chat_id', 'max_attempts', 'initials', 'created_at', 'updated_at');
    }

    public function update(PersonRequest $request, int $id)
    {
        $this->can("update_{$this->key}");
        $this->find($id)->update(array_filter($request->validated(), fn ($v, $k) => $k !== 'password' || $v, ARRAY_FILTER_USE_BOTH));

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
