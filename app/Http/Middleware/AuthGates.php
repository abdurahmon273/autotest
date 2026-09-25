<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

class AuthGates
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user) {
            $cacheKey = 'user_permissions_'.$user->id;

            $permissionsData = Cache::remember($cacheKey, now()->addMinutes(60), function () use ($user) {
                $userRoles = $user->roles()->with('permissions')->get();

                $permissions = [];
                foreach ($userRoles as $role) {
                    foreach ($role->permissions as $permission) {
                        $permissions[$permission->title][] = $role->id;
                    }
                }

                return [
                    'permissions' => $permissions,
                    'roles' => $userRoles->pluck('id')->toArray(),
                ];
            });

            $userRoleIds = $permissionsData['roles'];
            foreach ($permissionsData['permissions'] as $title => $roleIds) {
                Gate::define($title, function () use ($roleIds, $userRoleIds) {
                    return count(array_intersect($userRoleIds, $roleIds)) > 0;
                });
            }
        }

        return $next($request);
    }
}
