<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'Active') {
            throw ValidationException::withMessages([
                'email' => ['This account is inactive. Please contact the administrator.'],
            ]);
        }

        $user->forceFill(['last_active_at' => now()])->save();

        $token = $user->createToken('tmc-care-admin')->plainTextToken;

        AuditLog::record($user->name, 'Logged in', null, $request->ip());

        return response()->json([
            'token' => $token,
            'user' => $this->formatUser($user),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($this->formatUser($request->user()));
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255'],
        ]);

        $user = $request->user();
        $user->fill($data)->save();

        return response()->json($this->formatUser($user));
    }

    public function updatePreferences(Request $request)
    {
        $data = $request->validate([
            'email' => ['sometimes', 'boolean'],
            'newRequests' => ['sometimes', 'boolean'],
            'verifications' => ['sometimes', 'boolean'],
            'digest' => ['sometimes', 'boolean'],
            'darkMode' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $user->preferences = array_merge($user->settings(), $data);
        $user->save();

        return response()->json($this->formatUser($user));
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->forceFill(['password' => Hash::make($data['new_password'])])->save();

        return response()->json(['message' => 'Password updated']);
    }

    private function formatUser(User $user): array
    {
        $user->loadMissing('role', 'department');

        return [
            'id' => 'ADM-' . str_pad($user->id, 3, '0', STR_PAD_LEFT),
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role?->name ?? 'Staff',
            'department' => $user->department?->name,
            'avatarColor' => $user->avatar_color,
            'permissions' => $user->role?->permissions ?? [],
            // Which sections of the admin panel this account may open.
            'access' => $user->accessMap(),
            'preferences' => $user->settings(),
        ];
    }
}
