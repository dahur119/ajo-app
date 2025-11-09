<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Remove unique constraint from email
            $table->dropUnique(['email']);
            
            // Add unique constraint only for verified emails
            $table->unique(['email', 'email_verified_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Remove the composite unique constraint
            $table->dropUnique(['email', 'email_verified_at']);
            
            // Restore the original unique constraint on email
            $table->unique(['email']);
        });
    }
};
