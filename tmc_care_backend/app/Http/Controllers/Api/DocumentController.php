<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        // A Guidance Counselor only sees incident documents, a Treasurer only
        // financial ones, the Super Administrator sees both.
        $q = Document::query()->whereIn('linked_type', $this->allowedTypes($request));
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
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,doc,docx'],
            'owner' => ['nullable', 'string'],
            'linked_type' => ['required', 'in:incident_report,financial_request'],
            'linked_code' => ['required', 'string'],
        ]);

        abort_unless(
            in_array($data['linked_type'], $this->allowedTypes($request), true),
            403,
            'Your role cannot upload this type of document.'
        );

        $linked = $data['linked_type'] === 'incident_report'
            ? IncidentReport::where('code', $data['linked_code'])->first()
            : FinancialRequest::where('code', $data['linked_code'])->first();

        $path = $request->file('file')->store('documents', 'public');

        $seq = (Document::max('id') ?? 0) + 1;
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
        $this->authorizeDocument($request, $document);

        $data = $request->validate([
            'status' => ['required', 'in:Verified,Pending,Rejected'],
        ]);
        $document->update($data);

        $verb = $data['status'] === 'Verified' ? 'Verified' : ($data['status'] === 'Rejected' ? 'Rejected' : 'Updated');
        AuditLog::record($request->user()?->name ?? 'System', "{$verb} document {$document->name}", $document->code);

        if (in_array($data['status'], ['Verified', 'Rejected'], true)) {
            $linked = $document->linked_type === 'incident_report'
                ? IncidentReport::find($document->linked_id)
                : FinancialRequest::find($document->linked_id);

            if ($linked?->student_id) {
                Notification::notifyStudent($linked->student_id, "Document {$data['status']}", "{$document->name} was {$data['status']} for {$document->linked_code}.", $document->linked_code);
            } elseif ($linked?->personnel_id) {
                Notification::notifyPersonnel($linked->personnel_id, "Document {$data['status']}", "{$document->name} was {$data['status']} for {$document->linked_code}.", $document->linked_code);
            }
        }

        return response()->json($this->format($document));
    }

    public function download(Request $request, Document $document)
    {
        $this->authorizeDocument($request, $document);

        if (! $document->file_path || ! Storage::disk('public')->exists($document->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }
        return Storage::disk('public')->download($document->file_path, $document->name);
    }

    public function destroy(Request $request, Document $document)
    {
        $this->authorizeDocument($request, $document);

        if ($document->file_path) {
            Storage::disk('public')->delete($document->file_path);
        }
        $document->delete();
        return response()->json(['message' => 'Deleted']);
    }

    /** Which kinds of documents the logged-in admin account may touch. */
    private function allowedTypes(Request $request): array
    {
        $user = $request->user();

        return array_values(array_filter([
            $user->canManageIncidents() ? 'incident_report' : null,
            $user->canManageFinancial() ? 'financial_request' : null,
        ]));
    }

    private function authorizeDocument(Request $request, Document $document): void
    {
        abort_unless(
            in_array($document->linked_type, $this->allowedTypes($request), true),
            403,
            'Your role cannot access this document.'
        );
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
