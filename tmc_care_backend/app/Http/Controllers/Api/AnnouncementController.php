<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index()
    {
        return response()->json(
            Announcement::orderByDesc('pinned')->latest()->get()->map(fn ($a) => $this->format($a))
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string'],
            'audience' => ['sometimes', 'string'],
        ]);

        $seq = Announcement::count() + 15;
        $a = Announcement::create([
            'code' => 'AN-' . str_pad((string) $seq, 3, '0', STR_PAD_LEFT),
            'title' => $data['title'],
            'audience' => $data['audience'] ?? 'All Students',
            'posted_by' => $request->user()?->name ?? 'Admin',
            'pinned' => false,
        ]);

        AuditLog::record($request->user()?->name ?? 'Admin', "Sent announcement to {$a->audience}", $a->code);

        return response()->json($this->format($a), 201);
    }

    public function destroy(Announcement $announcement)
    {
        $announcement->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function format(Announcement $a): array
    {
        return [
            'id' => $a->code, 'title' => $a->title, 'audience' => $a->audience,
            'postedBy' => $a->posted_by, 'date' => $a->created_at->format('M d, Y'), 'pinned' => $a->pinned,
        ];
    }
}
