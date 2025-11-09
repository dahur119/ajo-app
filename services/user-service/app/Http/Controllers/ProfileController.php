<?php

namespace App\Http\Controllers;

use App\Models\UserProfile;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /**
     * Return authenticated user with profile.
     */
    public function me(Request $request)
    {
        $user = $request->user()->load('profile');
        return response()->json($user, 200);
    }

    /**
     * Update authenticated user's profile.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'phone' => 'nullable|string|max:32',
            'avatar_url' => 'nullable|url|max:255',
            'date_of_birth' => 'nullable|date',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:120',
            'state' => 'nullable|string|max:120',
            'country' => 'nullable|string|max:64',
            'postal_code' => 'nullable|string|max:16',
            'next_of_kin_name' => 'nullable|string|max:255',
            'next_of_kin_phone' => 'nullable|string|max:32',
            'preferences' => 'nullable|array',
        ]);

        $profile = UserProfile::updateOrCreate(
            ['user_id' => $user->id],
            $validated
        );

        return response()->json(['profile' => $profile], 200);
    }
}