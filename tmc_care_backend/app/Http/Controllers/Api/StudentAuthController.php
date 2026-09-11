<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class StudentAuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'student_no' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $student = Student::where('student_no', $data['student_no'])->first();

        if (! $student || ! $student->password || ! Hash::check($data['password'], $student->password)) {
            throw ValidationException::withMessages([
                'student_no' => ['These credentials do not match our records.'],
            ]);
        }

        if ($student->status !== 'Active') {
            throw ValidationException::withMessages([
                'student_no' => ['This account is inactive. Please contact the school.'],
            ]);
        }

        $token = $student->createToken('tmc-care-student-app')->plainTextToken;

        AuditLog::record($student->name, 'Logged in (student app)', $student->student_no, $request->ip());

        return response()->json([
            'token' => $token,
            'student' => $this->format($student),
        ]);
    }

    public function logout(Request $request)
    {
        $this->ensureStudentToken($request);
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        $this->ensureStudentToken($request);
        return response()->json($this->format($request->user()));
    }

    private function ensureStudentToken(Request $request): void
    {
        if (! $request->user() instanceof Student) {
            abort(403, 'This endpoint is for the student app only.');
        }
    }

    private function format(Student $s): array
    {
        return [
            'id' => $s->student_no,
            'name' => $s->name,
            'email' => $s->email,
            'program' => $s->program,
            'year' => $s->year,
            'status' => $s->status,
            'phone' => $s->phone,
        ];
    }
}
