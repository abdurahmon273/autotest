<?php

use App\Http\Controllers\LandingController;
use App\Http\Controllers\User\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', LandingController::class)->name('home');

Route::get('login', [AuthController::class, 'show'])->name('login');
Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('logout', [AuthController::class, 'logout'])->name('logout');

Route::view('app/{any?}', 'user.app')->where('any', '.*')->middleware(['auth', 'single.session'])->name('app');

Route::post('telegram/webhook', fn () => response()->noContent())->name('telegram.webhook');

Route::view('/admin/{any?}', 'admin')->where('any', '.*')->name('admin');
