<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Personnel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class PersonnelController extends Controller
{
    public function index()
    {
        return response()->json(Personnel::orderBy('name')->get()->map(fn ($p) => $this->format($p)));
    }

    public function show(Personnel $personnel)
    {
        return response()->json($this->format($personnel));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id_number' => ['required', 'string', 'regex:/^\d{2}-\d{6}$/', 'unique:personnel,id_number'],
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string'],
            'staff_type' => ['required', Rule::in(['Teaching', 'Non-teaching'])],
            'department' => ['required_if:staff_type,Teaching', 'nullable', 'string'],
            'username' => ['required', 'string', 'max:255', 'unique:personnel,username'],
            'password' => ['required', 'string', 'min:6'],
        ], [
            'id_number.regex' => 'ID Number must be in the format 00-000000.',
            'department.required_if' => 'Please select a department for teaching staff.',
        ]);

        $personnel = Personnel::create([
            'id_number' => $data['id_number'],
            'name' => $data['name'],
            'address' => $data['address'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'staff_type' => $data['staff_type'],
            'department' => $data['staff_type'] === 'Teaching' ? $data['department'] : null,
            'username' => $data['username'],
            'password' => Hash::make($data['password']),
            'status' => 'Active',
            'date_joined' => now()->toDateString(),
        ]);

        AuditLog::record($request->user()?->name ?? 'System', "Added new personnel {$personnel->name}", $personnel->id_number);

        return response()->json($this->format($personnel), 201);
    }

    public function update(Request $request, Personnel $personnel)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string'],
            'email' => ['sometimes', 'nullable', 'email'],
            'phone' => ['sometimes', 'nullable', 'string'],
            'staff_type' => ['sometimes', Rule::in(['Teaching', 'Non-teaching'])],
            'department' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(['Active', 'Inactive'])],
        ]);

        $type = $data['staff_type'] ?? $personnel->staff_type;
        if ($type === 'Non-teaching') {
            $data['department'] = null;
        }

        $personnel->update($data);

        AuditLog::record($request->user()?->name ?? 'System', "Updated personnel {$personnel->name}", $personnel->id_number);

        return response()->json($this->format($personnel));
    }

    public function destroy(Personnel $personnel)
    {
        $personnel->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function resetPassword(Request $request, Personnel $personnel)
    {
        $data = $request->validate([
            'password' => ['required', 'string', 'min:6'],
        ]);

        $personnel->update(['password' => Hash::make($data['password'])]);

        AuditLog::record($request->user()?->name ?? 'System', "Reset app password for {$personnel->name}", $personnel->id_number);

        return response()->json(['message' => 'Password reset']);
    }

    private function format(Personnel $p): array
    {
        return [
            'id' => $p->id_number,
            'username' => $p->username,
            'name' => $p->name,
            'address' => $p->address,
            'email' => $p->email,
            'phone' => $p->phone,
            'staffType' => $p->staff_type,
            'department' => $p->department,
            'status' => $p->status,
            'dateJoined' => $p->date_joined?->format('Y-m-d'),
        ];
    }
}
