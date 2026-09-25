<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Gate;

abstract class ApiController extends Controller
{
    protected function can(string $permission): void
    {
        abort_if(Gate::denies($permission), 403);
    }

    protected function ok(string $message, array $extra = [])
    {
        return response()->json(['message' => $message] + $extra);
    }
}
