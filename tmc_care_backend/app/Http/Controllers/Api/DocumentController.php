<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $q = Document::query();
        if ($status = $request->query('status')) $q->where('status', $status);
        if ($search = $request->query('search')) {
            $q->where(function ($qq) use ($search) {
                $qq->where('name', 'like', "%{$search}%")
                    ->orWhere('owner', 'like', "%{$search}%")
                    ->orWhere('linked_code', 'like', "%{$search}%");
            });
        }
        return response()->json($q->orderByDesc('id')->get()->map(fn ($d) => $this->format($d)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'owner' => ['nullable', 'string'],
            'linked_type' => ['required', 'in:incident_report,financial_request'],
            'linked_code' => ['required', 'string'],
        ]);

        $linked = $data['linked_type'] === 'incident_report'
            ? IncidentReport::where('code', $data['linked_code'])->first()
            : FinancialRequest::where('code', $data['linked_code'])->first();

        $path = $request->file('file')->store('documents', 'public');

        $seq = Document::count() + 142;
        $document = Document::create([
            'code' => 'DOC-' . str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
            'name' => $request->file('file')->getClientOriginalName(),
            'owner' => $data['owner'] ?? 'Anonymous',
            'linked_type' => $data['linked_type'],
            'linked_id' => $linked?->id,
            'linked_code' => $data['linked_code'],
            'file_path' => $path,
            'size_bytes' => $request->file('file')->getSize(),
            'status' => 'Pending',
            'uploaded_at' => now(),
        ]);

        AuditLog::record($request->user()?->name ?? 'System', "Uploaded document {$document->name}", $document->code);

        return response()->json($this->format($document), 201);
    }

    public function update(Request $request, Document $document)
    {
        $data = $request->validate([
            'status' => ['required', 'in:Verified,Pending,Rejected'],
        ]);
        $document->update($data);

        $verb = $data['status'] === 'Verified' ? 'Verified' : ($data['status'] === 'Rejected' ? 'Rejected' : 'Updated');
        AuditLog::record($request->user()?->name ?? 'System', "{$verb} document {$document->name}", $document->code);

        return response()->json($this->format($document));
    }

    public function download(Document $document)
    {
        if (! $document->file_path || ! Storage::disk('public')->exists($document->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }
        return Storage::disk('public')->download($document->file_path, $document->name);
    }

    public function destroy(Document $document)
    {
        if ($document->file_path) {
            Storage::disk('public')->delete($document->file_path);
        }
        $document->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function format(Document $d): array
    {
        return [
            'id' => $d->code,
            'name' => $d->name,
            'owner' => $d->owner,
            'linkedTo' => $d->linked_code,
            'uploaded' => $d->uploaded_at?->format('M d, Y'),
            'size' => $this->humanSize($d->size_bytes),
            'status' => $d->status,
        ];
    }

    private function humanSize(int $bytes): string
    {
        if ($bytes <= 0) return '0 KB';
        if ($bytes < 1024 * 1024) return round($bytes / 1024, 0) . ' KB';
        return round($bytes / (1024 * 1024), 1) . ' MB';
    }
}
