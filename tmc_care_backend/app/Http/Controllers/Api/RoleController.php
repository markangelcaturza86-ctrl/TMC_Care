<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index()
    {
        return response()->json(Role::withCount('users')->orderBy('id')->get()->map(fn ($r) => $this->format($r)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'unique:roles,name'],
            'description' => ['nullable', 'string'],
            'permissions' => ['nullable', 'array'],
        ]);
        $role = Role::create($data);
        return response()->json($this->format($role->loadCount('users')), 201);
    }

    public function update(Request $request, Role $role)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string'],
            'description' => ['sometimes', 'string'],
            'permissions' => ['sometimes', 'array'],
        ]);
        $role->update($data);
        return response()->json($this->format($role->loadCount('users')));
    }

    public function destroy(Role $role)
    {
        $role->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function format(Role $r): array
    {
        return [
            'id' => 'R-' . str_pad((string) $r->id, 2, '0', STR_PAD_LEFT),
            'name' => $r->name,
            'users' => $r->users_count ?? 0,
            'description' => $r->description,
            'permissions' => $r->permissions ?? [],
        ];
    }
}
