<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\PasswordResetOtp;
use App\Models\User;
use Illuminate\Support\Facades\Hash;


class PasswordResetService
{
    public function sendOtp($email)
    {
        // Resend cooldown: prevent sending if a recent OTP exists within 60 seconds
        $existing = DB::table('password_otps')
            ->where('email', $email)
            ->first();

        if ($existing && isset($existing->created_at) && now()->diffInSeconds($existing->created_at) < 60) {
            return false;
        }

        $otp = rand(100000, 999999);
        $expiresAt = now()->addMinutes(10);

        DB::table('password_otps')->updateOrInsert(
            ['email' => $email],
            [
                'otp_hash' => Hash::make((string) $otp),
                'expires_at' => $expiresAt,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        Mail::to($email)->queue(new PasswordResetOtp($otp));

        return true;
    }

    public function resetPassword($email, $otp, $password)
    {
        $record = DB::table('password_otps')
            ->where('email', $email)
            ->where('expires_at', '>', now())
            ->first();

        if (!$record) {
            return false;
        }

        if (!isset($record->otp_hash) || !Hash::check((string) $otp, $record->otp_hash)) {
            return false;
        }

        $user = User::where('email', $email)->first();
        $user->password = Hash::make($password);
        $user->save();

        DB::table('password_otps')->where('email', $email)->delete();

        return true;
    }
}