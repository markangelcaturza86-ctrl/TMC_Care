<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmergencyContact;
use Illuminate\Http\Request;

class EmergencyContactController extends Controller
{
    public function index()
    {
        return response()->json(
            EmergencyContact::orderBy('sort_order')->orderBy('name')->get()->map(fn ($c) => $this->format($c))
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['sometimes', 'integer'],
        ]);
        $c = EmergencyContact::create($data);
        return response()->json($this->format($c), 201);
    }

    public function update(Request $request, EmergencyContact $emergency_contact)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:50'],
            'description' => ['sometimes', 'nullable', 'string'],
            'sort_order' => ['sometimes', 'integer'],
        ]);
        $emergency_contact->update($data);
        return response()->json($this->format($emergency_contact));
    }

    public function destroy(EmergencyContact $emergency_contact)
    {
        $emergency_contact->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function format(EmergencyContact $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'category' => $c->category,
            'phone' => $c->phone,
            'description' => $c->description,
            'sortOrder' => $c->sort_order,
        ];
    }
}
