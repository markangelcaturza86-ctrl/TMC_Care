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
    private const SUPER_ADMIN = 'Super Administrator';

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
            'password' => ['required', 'string', 'min:6'],
        ]);

        abort_if(
            $data['role'] === self::SUPER_ADMIN,
            422,
            'There can only be one Super Administrator, and it already exists.'
        );

        $role = Role::firstOrCreate(['name' => $data['role']]);
        $department = $data['department'] ? Department::firstOrCreate(['name' => $data['department']]) : null;

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
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
        'email' => ['sometimes', 'email', 'unique:users,email,' . $admin_user->id],
        'role' => ['sometimes', 'string'],
        'department' => ['sometimes', 'string'],
        'status' => ['sometimes', 'in:Active,Inactive'],
        'password' => ['sometimes', 'nullable', 'string', 'min:6'],
    ]);

    $isSuper = $admin_user->isSuperAdmin();

    // Exactly one Super Administrator: nobody can be promoted to it, and it cannot be demoted or switched off.
    if (isset($data['role'])) {
        abort_if(
            $data['role'] === self::SUPER_ADMIN && ! $isSuper,
            422,
            'There can only be one Super Administrator, and it already exists.'
        );
        abort_if(
            $isSuper && $data['role'] !== self::SUPER_ADMIN,
            422,
            'The role of the Super Administrator cannot be changed.'
        );
    }
    abort_if(
        $isSuper && ($data['status'] ?? 'Active') === 'Inactive',
        422,
        'The Super Administrator account cannot be deactivated.'
    );

    if (isset($data['role'])) {
        $data['role_id'] = Role::firstOrCreate(['name' => $data['role']])->id;
        unset($data['role']);
    }
    if (isset($data['department'])) {
        $data['department_id'] = Department::firstOrCreate(['name' => $data['department']])->id;
        unset($data['department']);
    }

    if (empty($data['password'])) {
        unset($data['password']);
    } else {
        $data['password'] = Hash::make($data['password']);
    }

    $admin_user->update($data);

    AuditLog::record($request->user()?->name ?? 'System', "Updated admin account for {$admin_user->name}", 'ADM-' . str_pad((string) $admin_user->id, 3, '0', STR_PAD_LEFT));

    return response()->json($this->format($admin_user->load(['role', 'department'])));
}

    public function destroy(Request $request, User $admin_user)
    {
        abort_if($admin_user->isSuperAdmin(), 422, 'The Super Administrator account cannot be removed.');
        abort_if($admin_user->id === $request->user()?->id, 422, 'You cannot remove the account you are signed in with.');

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
