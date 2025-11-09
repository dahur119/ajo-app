<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserProfile extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'phone',
        'phone_verified_at',
        'avatar_url',
        'date_of_birth',
        'address_line1',
        'address_line2',
        'city',
        'state',
        'country',
        'postal_code',
        'next_of_kin_name',
        'next_of_kin_phone',
        'kyc_status',
        'preferences',
    ];

    protected $casts = [
        'phone_verified_at' => 'datetime',
        'date_of_birth' => 'date',
        'preferences' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}