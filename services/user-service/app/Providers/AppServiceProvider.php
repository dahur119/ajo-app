<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Config;

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
        // Local dev bootstrap: ensure sqlite database file exists and migrations are applied
        try {
            $default = Config::get('database.default');
            if ($default === 'sqlite') {
                $dbPath = database_path('database.sqlite');
                if (!file_exists($dbPath)) {
                    @touch($dbPath);
                }
                // If core tables are missing, run migrations
                if (!Schema::hasTable('users')) {
                    Artisan::call('migrate', ['--force' => true]);
                }
            }
        } catch (\Throwable $e) {
            // Ignore bootstrap DB errors in dev; registration will surface real issues
        }

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
