<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\LoginOtp;
use App\Models\User;

class EmailOtpService
{
    public function sendOtp(string $email): bool
    {
        $otp = rand(100000, 999999);
        $expiresAt = now()->addMinutes(10);

        DB::table('email_otps')->updateOrInsert(
            ['email' => $email],
            [
                'otp_hash' => Hash::make((string) $otp),
                'expires_at' => $expiresAt,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        Mail::to($email)->queue(new LoginOtp($otp));
        return true;
    }

    public function verifyOtp(string $email, string $otp): ?User
    {
        $record = DB::table('email_otps')
            ->where('email', $email)
            ->where('expires_at', '>', now())
            ->first();

        if (!$record) {
            return null;
        }

        if (!isset($record->otp_hash) || !Hash::check((string) $otp, $record->otp_hash)) {
            return null;
        }

        $user = User::where('email', $email)->first();

        // Invalidate OTP after successful verification
        DB::table('email_otps')->where('email', $email)->delete();

        return $user;
    }

    public function sendVerificationOtp(string $email): bool
    {
        $otp = rand(100000, 999999);
        $expiresAt = now()->addMinutes(10);

        DB::table('email_otps')->updateOrInsert(
            ['email' => $email],
            [
                'otp_hash' => Hash::make((string) $otp),
                'expires_at' => $expiresAt,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Send verification OTP email
        Mail::to($email)->queue(new \App\Mail\VerificationEmail($otp));
        return true;
    }
}