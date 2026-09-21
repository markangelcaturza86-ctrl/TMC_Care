<?php

namespace App\Http\Controllers\Api;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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
            'student_no' => ['required', 'string', 'regex:/^\d{2}-\d{6}$/', 'unique:students,student_no'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:students,email'],
            'address' => ['nullable', 'string'],
            'program' => ['nullable', 'string'],
            'year' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'username' => ['required', 'string', 'max:255', 'unique:students,username'],
            'password' => ['required', 'string', 'min:6'],
        ], [
            'student_no.regex' => 'School ID must be in the format 00-000000.',
        ]);

        $student = Student::create([
            'student_no' => $data['student_no'],
            'username' => $data['username'],
            'name' => $data['name'],
            'email' => $data['email'],
            'address' => $data['address'] ?? null,
            'password' => Hash::make($data['password']),
            'program' => $data['program'] ?? null,
            'year' => $data['year'] ?? null,
            'status' => 'Active',
            'date_joined' => now()->toDateString(),
            'phone' => $data['phone'] ?? null,
        ]);

        AuditLog::record($request->user()?->name ?? 'System', "Added new student {$student->name}", $student->student_no);

        return response()->json($this->format($student), 201);
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
        'student_no' => ['sometimes', 'string', 'regex:/^\d{2}-\d{6}$/', Rule::unique('students', 'student_no')->ignore($student->id)],
        'username' => ['sometimes', 'string', 'max:255', Rule::unique('students', 'username')->ignore($student->id)],
        'name' => ['sometimes', 'string', 'max:255'],
        'email' => ['sometimes', 'email', Rule::unique('students', 'email')->ignore($student->id)],
        'address' => ['sometimes', 'nullable', 'string'],
        'program' => ['sometimes', 'nullable', 'string'],
        'year' => ['sometimes', 'nullable', 'string'],
        'phone' => ['sometimes', 'nullable', 'string'],
        'status' => ['sometimes', 'in:Active,Inactive'],
        'password' => ['sometimes', 'nullable', 'string', 'min:6'],
    ], [
        'student_no.regex' => 'School ID must be in the format 00-000000.',
    ]);

    if (empty($data['password'])) {
        unset($data['password']);
    } else {
        $data['password'] = Hash::make($data['password']);
    }

    $student->update($data);

    AuditLog::record($request->user()?->name ?? 'System', "Updated student {$student->name}", $student->student_no);

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
            'password' => ['required', 'string', 'min:6'],
        ]);

        $student->update(['password' => Hash::make($data['password'])]);

        AuditLog::record($request->user()?->name ?? 'System', "Reset app password for {$student->name}", $student->student_no);

        return response()->json(['message' => 'Password reset']);
    }

        private function format(Student $s): array
    {
        return [
            'id' => $s->student_no,
            'username' => $s->username,
            'name' => $s->name,
            'email' => $s->email,
            'address' => $s->address,
            'program' => $s->program,
            'year' => $s->year,
            'status' => $s->status,
            'dateJoined' => $s->date_joined?->format('Y-m-d'),
            'phone' => $s->phone,
        ];
    }
}
