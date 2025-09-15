<?php

use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ImageUploadController;
use App\Http\Controllers\Api\RiskCalculationController;
// use App\Http\Controllers\Api\SocialiteController;
use App\Http\Controllers\ProposalController;
use App\Http\Controllers\RiskCalculatorController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::get('/clients', [ClientController::class, 'index']);
    Route::get('/risk-calculations', [RiskCalculationController::class, 'index']);
    Route::post('/risk-calculations', [RiskCalculationController::class, 'store']);
    Route::post('/export-all-inspections', [RiskCalculationController::class, 'exportAll']);
    Route::post('/export-single-inspection', [RiskCalculationController::class, 'exportSingle']);
    Route::post('/calculate-risk', [RiskCalculatorController::class, 'calculate']);
    Route::post('/upload-inspection-image', [ImageUploadController::class, 'store']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::post('/detect-pest', [ImageUploadController::class, 'detectPest']);
    Route::post('/locate-pest', [ImageUploadController::class, 'detectAndLocatePest']);

    Route::post('/generate-propose', [ProposalController::class, 'generate']);
});