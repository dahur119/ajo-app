<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();

            // One-to-one with users, cascade on delete
            $table->foreignId('user_id')
                ->unique()
                ->constrained('users')
                ->cascadeOnDelete();

            // Contact and verification
            $table->string('phone', 32)->nullable()->unique();
            $table->timestamp('phone_verified_at')->nullable();

            // Basics
            $table->string('avatar_url')->nullable();
            $table->date('date_of_birth')->nullable();

            // Address
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country', 64)->nullable();
            $table->string('postal_code', 16)->nullable();

            // Emergency contact (thrift groups often request next of kin)
            $table->string('next_of_kin_name')->nullable();
            $table->string('next_of_kin_phone', 32)->nullable();

            // KYC state (extendable)
            $table->enum('kyc_status', ['not_started', 'pending', 'verified', 'rejected'])
                ->default('not_started');

            // Preferences (notification choices, contribution reminders, etc.)
            $table->json('preferences')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Helpful indexes
            $table->index(['country', 'state']);
            $table->index('kyc_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};