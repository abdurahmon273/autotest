<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        Role::upsert([
            ['id' => Role::ADMIN, 'title' => 'Admin'],
            ['id' => Role::TEACHER, 'title' => 'Teacher'],
            ['id' => Role::STUDENT, 'title' => 'Student'],
        ], ['id'], ['title']);

        $map = [
            Role::ADMIN => [Permission::TYPE_ADMIN, Permission::TYPE_ALL],
            Role::TEACHER => [Permission::TYPE_TEACHER, Permission::TYPE_ALL],
            Role::STUDENT => [Permission::TYPE_STUDENT, Permission::TYPE_ALL],
        ];

        foreach ($map as $roleId => $types) {
            Role::find($roleId)->permissions()->sync(
                Permission::whereIn('type', $types)->pluck('id')
            );
        }
    }
}
