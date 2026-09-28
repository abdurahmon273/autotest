<?php

use App\Http\Middleware\AuthGates;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureUser;
use App\Http\Middleware\SingleSession;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->alias(['admin' => EnsureAdmin::class, 'user' => EnsureUser::class, 'single.session' => SingleSession::class]);
        $middleware->api(append: [AuthGates::class]);
        $middleware->validateCsrfTokens(except: ['telegram/webhook']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
