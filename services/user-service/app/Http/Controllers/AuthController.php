<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Http\Controllers\Mail;
use App\Services\PasswordResetService;
use App\Services\EmailOtpService;
use App\Services\VerificationTokenService;
use App\Http\Requests\SendLoginOtpRequest;
use App\Http\Requests\VerifyLoginOtpRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\ResetPasswordRequest;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;
use App\Mail\VerificationEmail;

class AuthController extends Controller
{
    public function register(Request $request)

    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255',
            'password' => 'required|string|min:6|confirmed',
        ]);

        // Check if there's already a verified user with this email
        $existingVerifiedUser = User::where('email', $request->email)
            ->whereNotNull('email_verified_at')
            ->first();
            
        if ($existingVerifiedUser) {
            return response()->json(['error' => 'Email already taken.'], 422);
        }

        // Check if there's an unverified user with this email
        $existingUnverifiedUser = User::where('email', $request->email)
            ->whereNull('email_verified_at')
            ->first();
            
        if ($existingUnverifiedUser) {
            // Update the existing unverified user
            $existingUnverifiedUser->update([
                'name' => $request->name,
                'password' => Hash::make($request->password),
            ]);
            $user = $existingUnverifiedUser;
        } else {
            // Create new user
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);
        }

        $token = JWTAuth::fromUser($user);

        // Send verification OTP email
        $otpService = app(EmailOtpService::class);
        $otpService->sendVerificationOtp($user->email);

        return response()->json(compact('user', 'token'), 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->only('email', 'password');

        try {
            if (!$token = JWTAuth::attempt($credentials)) {
                return response()->json(['error' => 'invalid_credentials'], 400);
            }
        } catch (JWTException $e) {
            return response()->json(['error' => 'could_not_create_token'], 500);
        }

        return response()->json(compact('token'));
    }

    // public function me()
    // {
    //     return response()->json(auth()->user());
    // }

    public function logout()
    {
        JWTAuth::invalidate(JWTAuth::getToken());

        return response()->json(['message' => 'Successfully logged out']);
    }

    /**
     * Send login OTP to user email
     */
    public function sendLoginOtp(SendLoginOtpRequest $request, EmailOtpService $service)
    {
        $service->sendOtp($request->email);

        return response()->json(['message' => 'Login OTP sent to your email.'], 200);
    }

    // Verify OTP and issue JWT token
    public function verifyLoginOtp(VerifyLoginOtpRequest $request, EmailOtpService $service)
    {
        $user = $service->verifyOtp($request->email, $request->otp);

        if (!$user) {
            return response()->json(['error' => 'Invalid or expired OTP.'], 400);
        }

        try {
            $token = JWTAuth::fromUser($user);
        } catch (JWTException $e) {
            return response()->json(['error' => 'could_not_create_token'], 500);
        }

        return response()->json(compact('token'), 200);
    }

    // Forgot Password: Send OTP to email
    public function forgotPassword(ForgotPasswordRequest $request)
    {
        $service = new PasswordResetService();
        $service->sendOtp($request->email);

        return response()->json(['message' => 'OTP sent to your email.'], 200);
    }

    // Reset Password using OTP
    public function resetPassword(ResetPasswordRequest $request)
    {
        $service = new PasswordResetService();

        if (!$service->resetPassword($request->email, $request->otp, $request->password)) {
            return response()->json(['error' => 'Invalid or expired OTP.'], 400);
        }

        return response()->json(['message' => 'Password reset successful.'], 200);
    }

    /**
     * Verify user email using OTP
     */
    public function verifyEmail(Request $request, EmailOtpService $otpService)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|size:6'
        ]);

        $user = $otpService->verifyOtp($request->email, $request->otp);

        if (!$user) {
            return response()->json(['error' => 'Invalid or expired OTP.'], 400);
        }

        // Check if email is already verified
        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.'], 200);
        }

        // Mark email as verified
        $user->email_verified_at = now();
        $user->save();

        return response()->json(['message' => 'Email verified successfully.'], 200);
    }

    /**
     * Verify user email using token
     */
    public function verifyEmailWithToken(Request $request, VerificationTokenService $tokenService)
    {
        $request->validate([
            'token' => 'required|string'
        ]);

        $user = $tokenService->verifyToken($request->token);

        if (!$user) {
            return response()->json(['error' => 'Invalid or expired verification token.'], 400);
        }

        // Check if email is already verified
        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.'], 200);
        }

        // Mark email as verified
        $user->email_verified_at = now();
        $user->save();

        return response()->json(['message' => 'Email verified successfully.'], 200);
    }

    /**
     * Send verification email with token link
     */
    public function sendVerificationEmail(Request $request, VerificationTokenService $tokenService)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['error' => 'User not found.'], 404);
        }

        // Generate verification token
        $token = $tokenService->generateToken($user);

        // Send verification email with token link
        // This would typically use Laravel's mail system
        // For now, we'll return the token for testing
        
        return response()->json([
            'message' => 'Verification token generated.',
            'token' => $token // Return token only; do not include URL
        ], 200);
    }
}