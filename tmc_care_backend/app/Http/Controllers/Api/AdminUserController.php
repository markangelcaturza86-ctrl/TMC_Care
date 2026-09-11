<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $q = User::with(['role', 'department']);
        if ($search = $request->query('search')) {
            $q->where(function ($qq) use ($search) {
                $qq->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%");
            });
        }
        if ($status = $request->query('status')) $q->where('status', $status);
        return response()->json($q->orderByDesc('id')->get()->map(fn ($u) => $this->format($u)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'role' => ['required', 'string'],
            'department' => ['nullable', 'string'],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        $role = Role::firstOrCreate(['name' => $data['role']]);
        $department = $data['department'] ? Department::firstOrCreate(['name' => $data['department']]) : null;

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password'] ?? 'password'),
            'role_id' => $role->id,
            'department_id' => $department?->id,
            'status' => 'Active',
            'last_active_at' => now(),
        ]);

        AuditLog::record($request->user()?->name ?? 'System', "Created new admin account for {$user->name}", 'ADM-' . str_pad((string) $user->id, 3, '0', STR_PAD_LEFT));

        return response()->json($this->format($user->load(['role', 'department'])), 201);
    }

    public function update(Request $request, User $admin_user)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email'],
            'role' => ['sometimes', 'string'],
            'department' => ['sometimes', 'string'],
            'status' => ['sometimes', 'in:Active,Inactive'],
        ]);

        if (isset($data['role'])) {
            $data['role_id'] = Role::firstOrCreate(['name' => $data['role']])->id;
            unset($data['role']);
        }
        if (isset($data['department'])) {
            $data['department_id'] = Department::firstOrCreate(['name' => $data['department']])->id;
            unset($data['department']);
        }

        $admin_user->update($data);

        return response()->json($this->format($admin_user->load(['role', 'department'])));
    }

    public function destroy(Request $request, User $admin_user)
    {
        AuditLog::record($request->user()?->name ?? 'System', "Removed admin account for {$admin_user->name}", 'ADM-' . str_pad((string) $admin_user->id, 3, '0', STR_PAD_LEFT));
        $admin_user->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function format(User $u): array
    {
        return [
            'id' => 'ADM-' . str_pad((string) $u->id, 3, '0', STR_PAD_LEFT),
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role?->name,
            'department' => $u->department?->name,
            'status' => $u->status,
            'lastActive' => $u->last_active_at?->diffForHumans() ?? 'Never',
        ];
    }
}
