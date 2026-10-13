<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    public function index()
    {
        return response()->json(
            Faq::orderBy('sort_order')->get()->map(fn ($f) => $this->format($f))
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'question' => ['required', 'string', 'max:500'],
            'answer' => ['required', 'string'],
            'sort_order' => ['sometimes', 'integer'],
        ]);
        $f = Faq::create($data);
        return response()->json($this->format($f), 201);
    }

    public function update(Request $request, Faq $faq)
    {
        $data = $request->validate([
            'question' => ['sometimes', 'string', 'max:500'],
            'answer' => ['sometimes', 'string'],
            'sort_order' => ['sometimes', 'integer'],
        ]);
        $faq->update($data);
        return response()->json($this->format($faq));
    }

    public function destroy(Faq $faq)
    {
        $faq->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function format(Faq $f): array
    {
        return [
            'id' => $f->id,
            'question' => $f->question,
            'answer' => $f->answer,
            'sortOrder' => $f->sort_order,
        ];
    }
}
