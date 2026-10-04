<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use App\Models\Personnel;
use App\Models\Student;
use Illuminate\Http\Request;

/**
 * Lets a logged-in student or staff member (Sanctum token from the Flutter
 * app) CREATE incident reports and financial requests.
 *
 * The admin routes (/incident-reports, /financial-requests) are protected by
 * the "admin" middleware, so the mobile app can never use them.
 */
class MobileRequestController extends Controller
{
    public function storeIncident(Request $request)
    {
        $data = $request->validate([
            'type'            => ['required', 'string', 'max:255'],
            'incident_date'   => ['nullable', 'date'],
            'location'        => ['nullable', 'string', 'max:255'],
            'description'     => ['required', 'string'],
            'people_involved' => ['nullable', 'string'],
        ]);

        $owner = $this->owner($request);

        $report = IncidentReport::create([
            'code'            => $this->nextCode('IR', IncidentReport::class),
            'type'            => $data['type'],
            'reported_by'     => $owner['name'],
            'student_id'      => $owner['student_id'],
            'personnel_id'    => $owner['personnel_id'],
            'location'        => $data['location'] ?? null,
            'date_submitted'  => now()->toDateString(),
            'incident_date'   => $data['incident_date'] ?? null,
            'status'          => 'Submitted',
            'priority'        => 'Medium',
            'assigned_to'     => 'Unassigned',
            'description'     => $data['description'],
            'people_involved' => $data['people_involved'] ?? null,
        ]);

        AuditLog::record($owner['name'], "Submitted incident report {$report->code} (mobile app)", $report->code, $request->ip());

        return response()->json([
            'id'            => $report->code,
            'type'          => 'incident',
            'title'         => $report->type,
            'status'        => $report->status,
            'dateSubmitted' => $report->date_submitted?->format('Y-m-d'),
        ], 201);
    }

    public function storeFinancial(Request $request)
    {
        $data = $request->validate([
            'type'             => ['required', 'string', 'max:255'],
            'beneficiary_name' => ['required', 'string', 'max:255'],
            'department'       => ['nullable', 'string', 'max:255'],
            'year_level'       => ['nullable', 'string', 'max:255'],
            'block_section'    => ['nullable', 'string', 'max:255'],
            'requester_name'   => ['nullable', 'string', 'max:255'],
            'relationship'     => ['nullable', 'string', 'max:255'],
            'reason'           => ['required', 'string'],
            'amount_requested' => ['required', 'numeric', 'min:0'],
            'amount_funded'    => ['nullable', 'numeric', 'min:0'],
            'contact_info'     => ['nullable', 'string', 'max:255'],
            'document_names'   => ['nullable', 'array'],
            'document_names.*' => ['string', 'max:255'],
        ]);

        $owner = $this->owner($request);

        $fr = FinancialRequest::create([
            'code'             => $this->nextCode('FR', FinancialRequest::class),
            'student_id'       => $owner['student_id'],
            'personnel_id'     => $owner['personnel_id'],
            'student_name'     => $data['beneficiary_name'],
            'program'          => $data['department'] ?? $owner['department'],
            'department'       => $data['department'] ?? null,
            'year_level'       => $data['year_level'] ?? null,
            'block_section'    => $data['block_section'] ?? null,
            'requester_name'   => $data['requester_name'] ?? $owner['name'],
            'relationship'     => $data['relationship'] ?? null,
            'type'             => $data['type'],
            'amount_requested' => $data['amount_requested'],
            'amount_funded'    => $data['amount_funded'] ?? 0,
            'contact_info'     => $data['contact_info'] ?? null,
            'date_submitted'   => now()->toDateString(),
            'status'           => 'Submitted',
            'reason'           => $data['reason'],
        ]);

        // The Flutter "Attach" buttons only pick a document NAME (e.g.
        // "Medical Certificate"), so we save each one as a Pending document
        // row linked to this request. It then shows up in the admin
        // "Attached Documents" list and on the Documents page.
        foreach ($data['document_names'] ?? [] as $docName) {
            Document::create([
                'code'        => $this->nextDocumentCode(),
                'name'        => $docName,
                'owner'       => $owner['name'],
                'linked_type' => 'financial_request',
                'linked_id'   => $fr->id,
                'linked_code' => $fr->code,
                'file_path'   => null,
                'size_bytes'  => 0,
                'status'      => 'Pending',
                'uploaded_at' => now(),
            ]);
        }

        AuditLog::record($owner['name'], "Submitted financial request {$fr->code} (mobile app)", $fr->code, $request->ip());

        return response()->json([
            'id'            => $fr->code,
            'type'          => 'financial',
            'title'         => $fr->type,
            'status'        => $fr->status,
            'dateSubmitted' => $fr->date_submitted?->format('Y-m-d'),
        ], 201);
    }

    /**
     * Upload one real file (photo/PDF) for a request the user owns.
     * Used for incident evidence.
     */
    public function uploadDocument(Request $request)
    {
        $data = $request->validate([
            'file'        => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx'],
            'linked_type' => ['required', 'in:incident_report,financial_request'],
            'linked_code' => ['required', 'string'],
        ]);

        $owner = $this->owner($request);

        $query = $data['linked_type'] === 'incident_report'
            ? IncidentReport::where('code', $data['linked_code'])
            : FinancialRequest::where('code', $data['linked_code']);

        // Users may only attach files to their OWN requests.
        $linked = $query
            ->where(function ($q) use ($owner) {
                if ($owner['student_id']) {
                    $q->where('student_id', $owner['student_id']);
                } else {
                    $q->where('personnel_id', $owner['personnel_id']);
                }
            })
            ->firstOrFail();

        $file = $request->file('file');
        $path = $file->store('documents', 'public');

        $document = Document::create([
            'code'        => $this->nextDocumentCode(),
            'name'        => $file->getClientOriginalName(),
            'owner'       => $owner['name'],
            'linked_type' => $data['linked_type'],
            'linked_id'   => $linked->id,
            'linked_code' => $linked->code,
            'file_path'   => $path,
            'size_bytes'  => $file->getSize(),
            'status'      => 'Pending',
            'uploaded_at' => now(),
        ]);

        return response()->json(['id' => $document->code, 'name' => $document->name], 201);
    }

    // ------------------------------------------------------------------

    private function owner(Request $request): array
    {
        $user = $request->user();

        if ($user instanceof Student) {
            return [
                'student_id'   => $user->id,
                'personnel_id' => null,
                'name'         => $user->name,
                'department'   => $user->program,
            ];
        }

        if ($user instanceof Personnel) {
            return [
                'student_id'   => null,
                'personnel_id' => $user->id,
                'name'         => $user->name,
                'department'   => $user->department,
            ];
        }

        abort(403, 'This endpoint is for the student/staff app only.');
    }

    private function nextCode(string $prefix, string $modelClass): string
    {
        $seq = str_pad((string) (($modelClass::max('id') ?? 0) + 1), 4, '0', STR_PAD_LEFT);

        return $prefix . '-' . now()->year . '-' . $seq;
    }

    private function nextDocumentCode(): string
    {
        return 'DOC-' . str_pad((string) ((Document::max('id') ?? 0) + 142), 4, '0', STR_PAD_LEFT);
    }
}
