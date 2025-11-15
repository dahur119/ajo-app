<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::get('/test', function () { 
    Illuminate\Support\Facades\Log::info('API test route hit');
    return response()->json(['message' => 'API test successful']); 
});

// Health and readiness with correlation echo
Route::get('/health', function (Request $request) {
    $requestId = $request->header('x-request-id') ?: (string) \Illuminate\Support\Str::uuid();
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toIso8601String(),
        'requestId' => $requestId,
    ])->header('x-request-id', $requestId);
});

Route::get('/ready', function (Request $request) {
    $requestId = $request->header('x-request-id') ?: (string) \Illuminate\Support\Str::uuid();
    return response()->json([
        'ready' => true,
        'timestamp' => now()->toIso8601String(),
        'requestId' => $requestId,
    ])->header('x-request-id', $requestId);
});

// Auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/login/send-otp', [AuthController::class, 'sendLoginOtp'])->middleware('throttle:otp-send');
Route::post('/login/verify-otp', [AuthController::class, 'verifyLoginOtp'])->middleware('throttle:otp-verify');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:otp-send');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:otp-verify');
Route::post('/email/verify', [AuthController::class, 'verifyEmail'])->middleware('throttle:otp-verify');

// Protected routes (require verified email)
Route::middleware(['auth:api', App\Http\Middleware\EnsureEmailIsVerified::class])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [\App\Http\Controllers\ProfileController::class, 'me']);
    Route::patch('/me', [\App\Http\Controllers\ProfileController::class, 'update']);
});