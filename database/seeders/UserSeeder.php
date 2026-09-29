<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@autotest.uz'],
            ['name' => 'Admin', 'username' => 'admin', 'password' => 'admin123']
        );
        $admin->roles()->sync([Role::ADMIN]);

        $teacher = User::updateOrCreate(
            ['username' => 'teacher'],
            ['name' => 'Teacher', 'phone' => '900000001', 'password' => 'teacher123']
        );
        $teacher->roles()->sync([Role::TEACHER]);

        $student = User::updateOrCreate(
            ['username' => 'student'],
            ['name' => 'Student', 'phone' => '941070524', 'password' => 'student123']
        );
        $student->roles()->sync([Role::STUDENT]);
    }
}
