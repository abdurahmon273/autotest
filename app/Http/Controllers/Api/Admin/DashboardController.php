<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Role;
use App\Models\User;

class DashboardController extends ApiController
{
    public function __invoke()
    {
        $this->can('access_dashboard');

        return response()->json([
            'stats' => [
                'teachers' => User::withRole(Role::TEACHER)->count(),
                'students' => User::withRole(Role::STUDENT)->count(),
                'newStudents' => User::withRole(Role::STUDENT)->where('created_at', '>=', now()->startOfMonth())->count(),
                'staff' => User::staff()->count(),
            ],
            'recent' => User::withRole(Role::STUDENT)->latest()->take(5)->get(['id', 'name', 'phone', 'created_at']),
        ]);
    }
}
