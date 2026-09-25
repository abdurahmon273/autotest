<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Role;

class TeacherController extends PersonController
{
    protected int $role = Role::TEACHER;
    protected string $key = 'teacher';
}
