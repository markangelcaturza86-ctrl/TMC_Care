<?php

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\FinancialRequestController;
use App\Http\Controllers\Api\IncidentReportController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\PersonnelAuthController;
use App\Http\Controllers\Api\PersonnelController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentAuthController;
use App\Http\Controllers\Api\VerificationController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::post('/student/login', [StudentAuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/student/logout', [StudentAuthController::class, 'logout']);
    Route::get('/student/me', [StudentAuthController::class, 'me']);
});


// Staff (teaching / non-teaching) login, used by the Flutter app.
Route::post('/personnel/login', [PersonnelAuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/personnel/logout', [PersonnelAuthController::class, 'logout']);
    Route::get('/personnel/me', [PersonnelAuthController::class, 'me']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::put('/me/password', [AuthController::class, 'updatePassword']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('students', StudentController::class);
    Route::put('/students/{student}/password', [StudentController::class, 'resetPassword']);

    Route::apiResource('personnel', PersonnelController::class);
    Route::put('/personnel/{personnel}/password', [PersonnelController::class, 'resetPassword']);
    Route::apiResource('incident-reports', IncidentReportController::class);
    Route::apiResource('financial-requests', FinancialRequestController::class);

    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::put('/documents/{document}', [DocumentController::class, 'update']);
    Route::get('/documents/{document}/download', [DocumentController::class, 'download']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);

    Route::get('/verifications/pending', [VerificationController::class, 'pending']);
    Route::post('/verifications/{id}/resolve', [VerificationController::class, 'resolve']);

    Route::apiResource('departments', DepartmentController::class)->except(['show']);
    Route::apiResource('roles', RoleController::class)->except(['show']);
    Route::apiResource('admin-users', AdminUserController::class)->except(['show']);

    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::post('/announcements', [AnnouncementController::class, 'store']);
    Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);

    Route::get('/messages', [MessageController::class, 'index']);
    Route::post('/messages/{message}/read', [MessageController::class, 'markRead']);
    Route::post('/messages/{message}/reply', [MessageController::class, 'reply']);

    Route::get('/audit-logs', [AuditLogController::class, 'index']);
});
