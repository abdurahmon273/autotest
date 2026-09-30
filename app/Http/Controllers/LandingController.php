<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\Question;
use App\Models\Role;
use App\Models\User;

class LandingController extends Controller
{
    public function __invoke()
    {
        return view('landing', ['stats' => [
            'groups' => Group::count(),
            'teachers' => User::withRole(Role::TEACHER)->count(),
            'students' => User::withRole(Role::STUDENT)->count(),
            'questions' => Question::count(),
        ]]);
    }
}
