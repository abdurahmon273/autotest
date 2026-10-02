<?php

use App\Http\Controllers\Api\Admin\AuthController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\GeneralSettingController;
use App\Http\Controllers\Api\Admin\GroupController;
use App\Http\Controllers\Api\Admin\GroupResultController;
use App\Http\Controllers\Api\Admin\PermissionController;
use App\Http\Controllers\Api\Admin\ProfileController;
use App\Http\Controllers\Api\Admin\QuestionController;
use App\Http\Controllers\Api\Admin\RandomQuizController;
use App\Http\Controllers\Api\Admin\RoleController;
use App\Http\Controllers\Api\Admin\StaffController;
use App\Http\Controllers\Api\Admin\StudentController;
use App\Http\Controllers\Api\Admin\StudentReportController;
use App\Http\Controllers\Api\Admin\StudentResultController;
use App\Http\Controllers\Api\Admin\TaskController;
use App\Http\Controllers\Api\Admin\TeacherController;
use App\Http\Controllers\Api\Admin\TelegramSettingController;
use App\Http\Controllers\Api\Admin\ThemeController;
use App\Http\Controllers\Api\User\FiftyQuizController;
use App\Http\Controllers\Api\User\QuizController;
use App\Http\Controllers\Api\User\TwentyQuizController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::get('dashboard', DashboardController::class);
        Route::get('dashboard/charts', [DashboardController::class, 'charts']);

        Route::get('results/groups', [GroupResultController::class, 'index']);
        Route::get('results/groups/{id}', [GroupResultController::class, 'show']);
        Route::get('results/groups/{id}/students', [GroupResultController::class, 'students']);
        Route::get('results/groups/{id}/tasks', [GroupResultController::class, 'tasks']);
        Route::get('results/groups/{id}/themes', [GroupResultController::class, 'themes']);
        Route::get('results/report/{id}/range', [StudentReportController::class, 'range']);
        Route::get('results/report/{id}', [StudentReportController::class, 'report']);
        Route::get('results/students', [StudentResultController::class, 'index']);
        Route::get('results/filters', [StudentResultController::class, 'filters']);
        Route::get('results/students/{id}', [StudentResultController::class, 'show']);
        Route::get('results/students/{id}/homeworks', [StudentResultController::class, 'homeworks']);
        Route::get('results/students/{id}/exams', [StudentResultController::class, 'exams']);
        Route::get('results/students/{id}/trainings', [StudentResultController::class, 'trainings']);
        Route::get('results/students/{id}/themes', [StudentResultController::class, 'themes']);
        Route::get('students/manage', [StudentController::class, 'manage']);
        Route::get('students/groups', [StudentController::class, 'groups']);
        Route::put('students/{id}/attempts', [StudentController::class, 'attempts']);
        Route::get('students/search', [StudentController::class, 'search']);
        Route::get('students/pick', [StudentController::class, 'pick']);
        Route::apiResource('teachers', TeacherController::class);
        Route::apiResource('students', StudentController::class);

        Route::get('groups/search', [GroupController::class, 'search']);
        Route::get('groups/{group}/students', [GroupController::class, 'students']);
        Route::post('groups/{group}/students', [GroupController::class, 'addStudents']);
        Route::delete('groups/{group}/students/{user}', [GroupController::class, 'removeStudent']);
        Route::apiResource('groups', GroupController::class);

        Route::get('questions/themes', [QuestionController::class, 'themes']);
        Route::get('questions/languages', [QuestionController::class, 'languages']);
        Route::get('questions/{question}/edit', [QuestionController::class, 'edit']);
        Route::apiResource('questions', QuestionController::class);

        Route::get('tasks/groups', [TaskController::class, 'groups']);
        Route::get('tasks/groups/{group}', [TaskController::class, 'group']);
        Route::get('tasks/themes', [TaskController::class, 'themes']);
        Route::get('tasks/{task}/homeworks', [TaskController::class, 'homeworks']);
        Route::get('tasks/{task}/pdf', [TaskController::class, 'pdf']);
        Route::post('tasks/{task}/telegram', [TaskController::class, 'telegram']);
        Route::apiResource('tasks', TaskController::class);

        Route::get('themes/search', [ThemeController::class, 'search']);
        Route::get('themes/languages', [ThemeController::class, 'languages']);
        Route::put('themes/reorder', [ThemeController::class, 'reorder']);
        Route::patch('themes/{theme}/toggle', [ThemeController::class, 'toggle']);
        Route::apiResource('themes', ThemeController::class);

        Route::get('roles/permissions', [RoleController::class, 'permissions']);
        Route::apiResource('roles', RoleController::class);
        Route::apiResource('permissions', PermissionController::class);

        Route::get('staff/roles', [StaffController::class, 'roles']);
        Route::apiResource('staff', StaffController::class);

        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::put('profile/password', [ProfileController::class, 'password']);

        Route::get('settings/telegram', [TelegramSettingController::class, 'show']);
        Route::put('settings/telegram', [TelegramSettingController::class, 'update']);

        Route::post('settings/random-quiz/generate', [RandomQuizController::class, 'generate']);
        Route::get('settings/general', [GeneralSettingController::class, 'show']);
        Route::put('settings/general', [GeneralSettingController::class, 'update']);
        Route::post('settings/quiz-image', [GeneralSettingController::class, 'uploadQuizImage']);
        Route::delete('settings/quiz-image', [GeneralSettingController::class, 'deleteQuizImage']);
        Route::post('settings/languages', [GeneralSettingController::class, 'storeLanguage']);
        Route::put('settings/languages/{language}', [GeneralSettingController::class, 'updateLanguage']);
        Route::patch('settings/languages/{language}/toggle', [GeneralSettingController::class, 'toggleLanguage']);
        Route::delete('settings/languages/{language}', [GeneralSettingController::class, 'destroyLanguage']);
    });
});

Route::prefix('user')->middleware(['auth:sanctum', 'single.session', 'user'])->group(function () {
    Route::get('me', [QuizController::class, 'me']);
    Route::get('languages', [QuizController::class, 'languages']);
    Route::put('lang', [QuizController::class, 'setLang']);
    Route::get('themes', [QuizController::class, 'themes']);
    Route::get('themes/progress', [QuizController::class, 'themesProgress']);
    Route::get('themes/{theme}', [QuizController::class, 'theme']);
    Route::get('themes/{theme}/questions', [QuizController::class, 'themeQuestions']);
    Route::get('themes/{theme}/result', [QuizController::class, 'lastThemeResult']);
    Route::post('themes/{theme}/start', [QuizController::class, 'startTheme']);
    Route::get('results/{result}', [QuizController::class, 'show']);
    Route::get('results/{result}/texts', [QuizController::class, 'texts']);
    Route::post('results/{result}/answer', [QuizController::class, 'answer']);
    Route::post('results/{result}/finish', [QuizController::class, 'finish']);
    Route::get('quiz/twenty', [TwentyQuizController::class, 'info']);
    Route::post('quiz/twenty/start', [TwentyQuizController::class, 'start']);
    Route::get('quiz/fifty', [FiftyQuizController::class, 'info']);
    Route::post('quiz/fifty/start', [FiftyQuizController::class, 'start']);
    Route::post('results/{result}/homework', [QuizController::class, 'attachHomework']);
    Route::get('homeworks', [QuizController::class, 'homeworks']);
});
