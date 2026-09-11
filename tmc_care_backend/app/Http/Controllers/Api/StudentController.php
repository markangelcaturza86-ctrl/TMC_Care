<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $q = Student::query();
        if ($search = $request->query('search')) {
            $q->where(function ($qq) use ($search) {
                $qq->where('name', 'like', "%{$search}%")
                    ->orWhere('student_no', 'like', "%{$search}%")
                    ->orWhere('program', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        return response()->json($q->orderByDesc('id')->get()->map(fn ($s) => $this->format($s)));
    }

        public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:students,email'],
            'program' => ['nullable', 'string'],
            'year' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        $studentNo = (2024) . '-' . (10000 + Student::count());

        $plainPassword = $data['password'] ?? Str::password(10, symbols: false);

        $student = Student::create([
            'student_no' => $studentNo,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($plainPassword),
            'program' => $data['program'] ?? null,
            'year' => $data['year'] ?? null,
            'status' => 'Active',
            'date_joined' => now()->toDateString(),
            'phone' => $data['phone'] ?? null,
        ]);

        AuditLog::record($request->user()?->name ?? 'System', "Added new student {$student->name}", $student->student_no);

        $response = $this->format($student);
        $response['generatedPassword'] = $plainPassword;

        return response()->json($response, 201);
    }

    public function show(Student $student)
    {
        $student->load(['incidentReports', 'financialRequests']);
        $data = $this->format($student);
        $data['incidentReports'] = $student->incidentReports->map(fn ($r) => [
            'id' => $r->code, 'type' => $r->type, 'status' => $r->status,
        ]);
        $data['financialRequests'] = $student->financialRequests->map(fn ($r) => [
            'id' => $r->code, 'type' => $r->type, 'status' => $r->status,
        ]);
        return response()->json($data);
    }

    public function update(Request $request, Student $student)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email'],
            'program' => ['sometimes', 'string'],
            'year' => ['sometimes', 'string'],
            'status' => ['sometimes', 'in:Active,Inactive'],
            'phone' => ['sometimes', 'string'],
        ]);
        $student->update($data);
        return response()->json($this->format($student));
    }

    public function destroy(Student $student)
    {
        $student->delete();
        return response()->json(['message' => 'Deleted']);
    }

        public function resetPassword(Request $request, Student $student)
    {
        $data = $request->validate([
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        $plainPassword = $data['password'] ?? Str::password(10, symbols: false);
        $student->update(['password' => Hash::make($plainPassword)]);

        AuditLog::record($request->user()?->name ?? 'System', "Reset app password for {$student->name}", $student->student_no);

        return response()->json([
            'message' => 'Password reset',
            'generatedPassword' => $plainPassword,
        ]);
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
            'dateJoined' => $s->date_joined?->format('Y-m-d'),
            'phone' => $s->phone,
        ];
    }
}
