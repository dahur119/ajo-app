<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Config;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Ensure JWT and DB config are present during CI tests
        $defaultSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        Config::set('jwt.algo', env('JWT_ALG', 'HS256'));
        Config::set('jwt.secret', env('JWT_SECRET', $defaultSecret));
        Config::set('database.default', env('DB_CONNECTION', 'sqlite'));
        Config::set('database.connections.sqlite.database', env('DB_DATABASE', ':memory:'));
    }
}
