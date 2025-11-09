<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind('Tymon\JWTAuth\Contracts\Providers\JWT', function ($app) {
            return $app->make('Tymon\JWTAuth\Providers\JWT\Lcobucci');
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Define custom rate limiters for OTP flows
        RateLimiter::for('otp-send', function (Request $request) {
            $key = strtolower((string)$request->email) . '|' . $request->ip();
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(3)->by($key);
        });

        RateLimiter::for('otp-verify', function (Request $request) {
            $key = strtolower((string)$request->email) . '|' . $request->ip();
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(10)->by($key);
        });
    }
}
