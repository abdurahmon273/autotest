<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class StudentSeeder extends Seeder
{
    public function run(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $student = User::create([
                'name' => fake()->name(),
                'phone' => fake()->unique()->numerify('9########'),
                'password' => 'student123',
            ]);
            $student->roles()->sync([Role::STUDENT]);
        }
    }
}
