<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index()
    {
        return response()->json(Department::orderBy('name')->get()->map(fn ($d) => $this->format($d)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
            'head' => ['nullable', 'string'],
            'staff' => ['nullable', 'integer'],
            'description' => ['nullable', 'string'],
        ]);
        $d = Department::create($data);
        return response()->json($this->format($d), 201);
    }

    public function update(Request $request, Department $department)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string'],
            'head' => ['sometimes', 'string'],
            'staff' => ['sometimes', 'integer'],
            'description' => ['sometimes', 'string'],
        ]);
        $department->update($data);
        return response()->json($this->format($department));
    }

    public function destroy(Department $department)
    {
        $department->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function format(Department $d): array
    {
        return [
            'id' => 'D-' . str_pad((string) $d->id, 2, '0', STR_PAD_LEFT),
            'name' => $d->name, 'head' => $d->head, 'staff' => $d->staff, 'description' => $d->description,
        ];
    }
}
