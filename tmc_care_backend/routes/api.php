<?php

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EmergencyContactController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\FinancialRequestController;
use App\Http\Controllers\Api\AdminNotificationController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\IncidentMessageController;
use App\Http\Controllers\Api\IncidentReportController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\PersonnelAuthController;
use App\Http\Controllers\Api\PersonnelController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\SystemController;
use App\Http\Controllers\Api\StudentAuthController;
use App\Http\Controllers\Api\VerificationController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MobileHomeController;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

Route::post('/student/login', [StudentAuthController::class, 'login'])->middleware('throttle:6,1');
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/student/logout', [StudentAuthController::class, 'logout']);
    Route::get('/student/me', [StudentAuthController::class, 'me']);
});


// Staff (teaching / non-teaching) login, used by the Flutter app.
Route::post('/personnel/login', [PersonnelAuthController::class, 'login'])->middleware('throttle:6,1');
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/personnel/logout', [PersonnelAuthController::class, 'logout']);
    Route::get('/personnel/me', [PersonnelAuthController::class, 'me']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/my/summary', [MobileHomeController::class, 'summary']);
    Route::get('/my/incident-reports', [MobileHomeController::class, 'incidentReports']);
    Route::post('/my/incident-reports', [MobileHomeController::class, 'storeIncidentReport']);
    Route::get('/my/financial-requests', [MobileHomeController::class, 'financialRequests']);
    Route::post('/my/financial-requests', [MobileHomeController::class, 'storeFinancialRequest']);
    Route::post('/my/documents', [MobileHomeController::class, 'uploadDocument']);
    Route::get('/my/announcements', [MobileHomeController::class, 'announcements']);
    Route::get('/my/notifications', [MobileHomeController::class, 'notifications']);
    Route::post('/my/notifications/read-all', [MobileHomeController::class, 'markAllNotificationsRead']);
    Route::post('/my/notifications/{notification}/read', [MobileHomeController::class, 'markNotificationRead']);
    Route::get('/my/incident-reports/{code}/messages', [IncidentMessageController::class, 'mineIndex']);
    Route::post('/my/incident-reports/{code}/messages', [IncidentMessageController::class, 'mineStore']);
    Route::get('/my/emergency-contacts', [MobileHomeController::class, 'emergencyContacts']);
    Route::get('/my/faqs', [MobileHomeController::class, 'faqs']);
    Route::put('/my/password', [MobileHomeController::class, 'updatePassword']);
});

/*
|--------------------------------------------------------------------------
| Admin panel
|--------------------------------------------------------------------------
| Every admin account can log in, see the dashboard and edit its own profile.
| Everything else is limited by the role's permissions through the
| `access:<ability>` middleware (see App\Models\User::accessMap()):
|
|   Guidance Counselor -> incidents (+ the incident documents/photos)
|   Treasurer          -> financial (+ the financial documents)
|   Super Administrator-> everything
*/
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::put('/me/password', [AuthController::class, 'updatePassword']);
    Route::put('/me/preferences', [AuthController::class, 'updatePreferences']);

    Route::get('/system', [SystemController::class, 'show']);
    Route::put('/system', [SystemController::class, 'update']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/notifications', [AdminNotificationController::class, 'index']);

    // Incident reports -> Guidance Counselor
    Route::middleware('access:incidents')->group(function () {
        Route::get('/incident-reports/{incident_report}/messages', [IncidentMessageController::class, 'adminIndex']);
        Route::post('/incident-reports/{incident_report}/messages', [IncidentMessageController::class, 'adminStore']);
        Route::apiResource('incident-reports', IncidentReportController::class);
    });

    // Department treasurers: collect donations, hand them to the TMC Treasurer
    Route::middleware('access:collections')->group(function () {
        Route::get('/collections', [CollectionController::class, 'index']);
        Route::post('/collections/donations', [CollectionController::class, 'addDonation']);
        Route::delete('/collections/donations/{donation}', [CollectionController::class, 'deleteDonation']);
        Route::post('/collections/remittances', [CollectionController::class, 'remit']);
    });

    // Financial requests -> Treasurer
    Route::middleware('access:financial')->group(function () {
        Route::post('/financial-requests/{financial_request}/approve', [FinancialRequestController::class, 'approve']);
        Route::get('/financial-requests/{financial_request}/donations', [FinancialRequestController::class, 'donations']);
        Route::post('/financial-requests/{financial_request}/donations', [FinancialRequestController::class, 'addDonation']);
        Route::delete('/financial-requests/{financial_request}/donations/{donation}', [FinancialRequestController::class, 'deleteDonation']);
        Route::post('/financial-requests/{financial_request}/release', [FinancialRequestController::class, 'release']);
        Route::post('/remittances/{remittance}/receive', [FinancialRequestController::class, 'receiveRemittance']);
        Route::post('/remittances/{remittance}/reject', [FinancialRequestController::class, 'rejectRemittance']);
        Route::apiResource('financial-requests', FinancialRequestController::class);
    });

    // Documents + verifications (each controller filters by the account's own type)
    Route::middleware('access:records')->group(function () {
        Route::get('/documents', [DocumentController::class, 'index']);
        Route::post('/documents', [DocumentController::class, 'store']);
        Route::put('/documents/{document}', [DocumentController::class, 'update']);
        Route::get('/documents/{document}/download', [DocumentController::class, 'download']);
        Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);

        Route::get('/verifications/pending', [VerificationController::class, 'pending']);
        Route::post('/verifications/{id}/resolve', [VerificationController::class, 'resolve']);
    });

    // User management
    Route::middleware('access:users')->group(function () {
        Route::apiResource('students', StudentController::class);
        Route::put('/students/{student}/password', [StudentController::class, 'resetPassword']);

        Route::apiResource('personnel', PersonnelController::class);
        Route::put('/personnel/{personnel}/password', [PersonnelController::class, 'resetPassword']);

        Route::apiResource('admin-users', AdminUserController::class)->except(['show']);
    });

    // Communications
    Route::middleware('access:communications')->group(function () {
        Route::get('/announcements', [AnnouncementController::class, 'index']);
        Route::post('/announcements', [AnnouncementController::class, 'store']);
        Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);

        Route::get('/messages', [MessageController::class, 'index']);
        Route::post('/messages/{message}/read', [MessageController::class, 'markRead']);
        Route::post('/messages/{message}/reply', [MessageController::class, 'reply']);
    });

    // System management
    Route::middleware('access:audit')->group(function () {
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
    });

    Route::middleware('access:system')->group(function () {
        Route::apiResource('departments', DepartmentController::class)->except(['show']);
        Route::apiResource('roles', RoleController::class)->except(['show']);
        Route::apiResource('emergency-contacts', EmergencyContactController::class)->except(['show']);
        Route::apiResource('faqs', FaqController::class)->except(['show']);
    });
});
