<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Personnel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PersonnelAuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $personnel = Personnel::where('username', $data['username'])->first();

        if (! $personnel || ! Hash::check($data['password'], $personnel->password)) {
            throw ValidationException::withMessages([
                'username' => ['These credentials do not match our records.'],
            ]);
        }

        if ($personnel->status !== 'Active') {
            throw ValidationException::withMessages([
                'username' => ['This account is inactive. Please contact the school.'],
            ]);
        }

        $token = $personnel->createToken('tmc-care-personnel-app')->plainTextToken;

        AuditLog::record($personnel->name, 'Logged in (staff app)', $personnel->id_number, $request->ip());

        return response()->json([
            'token' => $token,
            'personnel' => $this->format($personnel),
        ]);
    }

    public function logout(Request $request)
    {
        $this->ensurePersonnelToken($request);
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        $this->ensurePersonnelToken($request);
        return response()->json($this->format($request->user()));
    }

    private function ensurePersonnelToken(Request $request): void
    {
        if (! $request->user() instanceof Personnel) {
            abort(403, 'This endpoint is for the staff app only.');
        }
    }

    private function format(Personnel $p): array
    {
        return [
            'id' => $p->id_number,
            'username' => $p->username,
            'name' => $p->name,
            'email' => $p->email,
            'phone' => $p->phone,
            'staffType' => $p->staff_type,
            'department' => $p->department,
            'status' => $p->status,
        ];
    }
}
