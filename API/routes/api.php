<?php

use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ImageUploadController;
use App\Http\Controllers\Api\RiskCalculationController;
// use App\Http\Controllers\Api\SocialiteController;
use App\Http\Controllers\InspectionController;
use App\Http\Controllers\ProposalController;
use App\Http\Controllers\RiskCalculatorController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

/*
|--------------------------------------------------------------------------
| API Version 1 Routes
|--------------------------------------------------------------------------
|
| All API routes are versioned. The v1 prefix is the current stable version.
| Legacy routes (without version prefix) are maintained for backward compatibility.
|
*/

// Versioned API (v1) - Recommended
Route::prefix('v1')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user', function (Illuminate\Http\Request $request) {
            return $request->user();
        });
        Route::get('/clients', [ClientController::class, 'index']);
        Route::post('/clients', [ClientController::class, 'store']);
        Route::get('/client-types', [ClientController::class, 'getClientTypes']);
        Route::post('/inspections', [InspectionController::class, 'store']);
        Route::post('/export-all-inspections', [RiskCalculationController::class, 'exportAll']);
        Route::post('/export-single-inspection', [RiskCalculationController::class, 'exportSingle']);
        Route::post('/logout', [AuthController::class, 'logout']);

        Route::post('/detect-pest', [ImageUploadController::class, 'detectPest']);
        Route::post('/locate-pest', [ImageUploadController::class, 'detectAndLocatePest']);
        Route::post('/upload-inspection-image', [ImageUploadController::class, 'store']);

        Route::post('/generate-propose', [ProposalController::class, 'generate']);
    });
});

// Legacy routes (backward compatibility - deprecated, will be removed in future)
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Illuminate\Http\Request $request) {
        return $request->user();
    });
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::get('/client-types', [ClientController::class, 'getClientTypes']);
    Route::post('/inspections', [InspectionController::class, 'store']);
    Route::post('/export-all-inspections', [RiskCalculationController::class, 'exportAll']);
    Route::post('/export-single-inspection', [RiskCalculationController::class, 'exportSingle']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::post('/detect-pest', [ImageUploadController::class, 'detectPest']);
    Route::post('/locate-pest', [ImageUploadController::class, 'detectAndLocatePest']);
    Route::post('/upload-inspection-image', [ImageUploadController::class, 'store']);

    Route::post('/generate-propose', [ProposalController::class, 'generate']);
});