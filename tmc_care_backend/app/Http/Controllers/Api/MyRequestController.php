<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use App\Models\Personnel;
use App\Models\Student;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Lets a logged-in student or staff member (mobile app) submit their own requests.
 * Everything created here starts as "Submitted", which is exactly what the admin's
 * Pending Verifications page lists.
 */
class MyRequestController extends Controller
{
    private const FILE_RULES = ['file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,doc,docx'];

    /** POST /api/my/incident-reports  (JSON or multipart/form-data) */
    public function storeIncident(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'incident_date' => ['nullable', 'string', 'max:50'],
            'people_involved' => ['nullable', 'string'],
            'files' => ['sometimes', 'array', 'max:5'],
            'files.*' => self::FILE_RULES,
        ]);

        [$studentId, $personnelId, $name] = $this->requester($request);

        $report = DB::transaction(function () use ($request, $data, $studentId, $personnelId, $name) {
            $report = IncidentReport::create([
                'code' => 'TMP-' . Str::uuid(),   // replaced below, once we know the id
                'type' => $data['type'],
                'reported_by' => $name,
                'student_id' => $studentId,
                'personnel_id' => $personnelId,
                'location' => $data['location'] ?? null,
                'date_submitted' => now()->toDateString(),
                'status' => 'Submitted',
                'priority' => 'Medium',
                'assigned_to' => 'Unassigned',
                'description' => $data['description'],
                'details' => array_filter([
                    'incident_date' => $data['incident_date'] ?? null,
                    'people_involved' => $data['people_involved'] ?? null,
                ]),
            ]);

            $report->update(['code' => sprintf('IR-%d-%04d', now()->year, $report->id)]);
            $this->storeFiles($request, 'incident_report', $report, $name);

            return $report;
        });

        AuditLog::record($name, "Submitted incident report {$report->code}", $report->code);

        return response()->json([
            'id' => $report->code,
            'type' => 'incident',
            'title' => $report->type,
            'status' => $report->status,
            'dateSubmitted' => $report->date_submitted?->format('Y-m-d'),
            'location' => $report->location,
            'description' => $report->description,
        ], 201);
    }

    /** POST /api/my/financial-requests  (JSON or multipart/form-data) */
    public function storeFinancial(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'max:255'],
            'student_name' => ['required', 'string', 'max:255'],   // the beneficiary
            'program' => ['nullable', 'string', 'max:255'],
            'year_level' => ['nullable', 'string', 'max:50'],
            'block_section' => ['nullable', 'string', 'max:50'],
            'requester_name' => ['nullable', 'string', 'max:255'],
            'relationship' => ['nullable', 'string', 'max:100'],
            'reason' => ['required', 'string'],
            'amount_requested' => ['required', 'numeric', 'min:0'],
            'amount_funded' => ['nullable', 'numeric', 'min:0'],
            'contact_info' => ['nullable', 'string', 'max:255'],
            'files' => ['sometimes', 'array', 'max:5'],
            'files.*' => self::FILE_RULES,
        ]);

        [$studentId, $personnelId, $name] = $this->requester($request);

        $fr = DB::transaction(function () use ($request, $data, $studentId, $personnelId, $name) {
            $fr = FinancialRequest::create([
                'code' => 'TMP-' . Str::uuid(),   // replaced below, once we know the id
                'student_id' => $studentId,
                'personnel_id' => $personnelId,
                'student_name' => $data['student_name'],
                'program' => $data['program'] ?? null,
                'type' => $data['type'],
                'amount_requested' => $data['amount_requested'],
                'date_submitted' => now()->toDateString(),
                'status' => 'Submitted',
                'reason' => $data['reason'],
                'details' => array_filter([
                    'requester_name' => $data['requester_name'] ?? null,
                    'relationship' => $data['relationship'] ?? null,
                    'year_level' => $data['year_level'] ?? null,
                    'block_section' => $data['block_section'] ?? null,
                    'amount_already_funded' => isset($data['amount_funded']) ? '₱' . number_format((float) $data['amount_funded'], 2) : null,
                    'contact_info' => $data['contact_info'] ?? null,
                ]),
            ]);

            $fr->update(['code' => sprintf('FR-%d-%04d', now()->year, $fr->id)]);
            $this->storeFiles($request, 'financial_request', $fr, $name);

            return $fr;
        });

        AuditLog::record($name, "Submitted financial request {$fr->code}", $fr->code);

        return response()->json([
            'id' => $fr->code,
            'type' => 'financial',
            'title' => $fr->type,
            'status' => $fr->status,
            'dateSubmitted' => $fr->date_submitted?->format('Y-m-d'),
            'beneficiary' => $fr->student_name,
            'amountRequested' => (float) $fr->amount_requested,
            'amountApproved' => null,
        ], 201);
    }

    /** @return array{0: ?int, 1: ?int, 2: string}  [student_id, personnel_id, display name] */
    private function requester(Request $request): array
    {
        $user = $request->user();

        if ($user instanceof Student) {
            return [$user->id, null, $user->name];
        }
        if ($user instanceof Personnel) {
            return [null, $user->id, $user->name];
        }

        abort(403, 'This endpoint is for the student/staff app only.');
    }

    /** Saves uploaded files (field name "files[]") as Pending documents linked to the record. */
    private function storeFiles(Request $request, string $linkedType, Model $record, string $owner): void
    {
        foreach ($request->file('files', []) as $file) {
            $document = Document::create([
                'code' => 'TMP-' . Str::uuid(),

                'owner' => $owner,
                'linked_type' => $linkedType,
                'linked_id' => $record->id,
                'linked_code' => $record->code,
                'file_path' => $file->store('documents', 'public'),
                'size_bytes' => $file->getSize(),
                'status' => 'Pending',
                'uploaded_at' => now(),
            ]);

            $document->update(['code' => 'DOC-' . str_pad((string) $document->id, 4, '0', STR_PAD_LEFT)]);
        }
    }
}
