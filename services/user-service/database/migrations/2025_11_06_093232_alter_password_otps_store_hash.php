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
        Schema::table('password_otps', function (Blueprint $table) {
            $table->string('otp_hash')->nullable();
            if (Schema::hasColumn('password_otps', 'otp')) {
                $table->dropColumn('otp');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('password_otps', function (Blueprint $table) {
            $table->integer('otp')->nullable();
            if (Schema::hasColumn('password_otps', 'otp_hash')) {
                $table->dropColumn('otp_hash');
            }
        });
    }
};
