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
            ['email' => env('SEED_ADMIN_EMAIL', 'admin@autotest.uz')],
            ['name' => 'Admin', 'username' => 'admin', 'password' => env('SEED_ADMIN_PASSWORD', 'admin123')]
        );
        $admin->roles()->sync([Role::ADMIN]);

        $teacher = User::updateOrCreate(
            ['username' => 'teacher'],
            ['name' => 'Teacher', 'phone' => '900000001', 'password' => env('SEED_TEACHER_PASSWORD', 'teacher123')]
        );
        $teacher->roles()->sync([Role::TEACHER]);

        $student = User::updateOrCreate(
            ['username' => 'student'],
            ['name' => 'Student', 'phone' => '941070524', 'password' => env('SEED_STUDENT_PASSWORD', 'student123')]
        );
        $student->roles()->sync([Role::STUDENT]);
    }
}
