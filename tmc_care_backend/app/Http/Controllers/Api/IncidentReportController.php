<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\IncidentReport;
use App\Models\Notification;
use App\Models\Student;
use Illuminate\Http\Request;

class IncidentReportController extends Controller
{
    public function index(Request $request)
    {
        $q = IncidentReport::query();
        if ($status = $request->query('status')) $q->where('status', $status);
        if ($priority = $request->query('priority')) $q->where('priority', $priority);
        if ($search = $request->query('search')) {
            $q->where(function ($qq) use ($search) {
                $qq->where('code', 'like', "%{$search}%")
                    ->orWhere('type', 'like', "%{$search}%")
                    ->orWhere('reported_by', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        $reports = $q->orderByDesc('id')->get();

        // One query for every attachment instead of one query per report.
        $docs = Document::where('linked_type', 'incident_report')
            ->whereIn('linked_id', $reports->pluck('id'))
            ->orderBy('id')
            ->get()
            ->groupBy('linked_id');

        return response()->json(
            $reports->map(fn ($r) => $this->format($r, $docs->get($r->id, collect())))
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string'],
            'reported_by' => ['nullable', 'string'],
            'student_id' => ['nullable', 'exists:students,id'],
            'anonymous' => ['sometimes', 'boolean'],
            'location' => ['nullable', 'string'],
            'priority' => ['sometimes', 'in:Low,Medium,High,Critical'],
            'description' => ['nullable', 'string'],
        ]);

        $year = now()->year;
        $seq = str_pad((string) ((IncidentReport::max('id') ?? 0) + 1), 4, '0', STR_PAD_LEFT);

        $report = IncidentReport::create([
            'code' => "IR-{$year}-{$seq}",
            'type' => $data['type'],
            'reported_by' => ($data['anonymous'] ?? false) ? 'Anonymous' : ($data['reported_by'] ?? 'Anonymous'),
            'student_id' => ($data['anonymous'] ?? false) ? null : ($data['student_id'] ?? null),
            'location' => $data['location'] ?? null,
            'date_submitted' => now()->toDateString(),
            'status' => 'Submitted',
            'priority' => $data['priority'] ?? 'Medium',
            'assigned_to' => 'Unassigned',
            'description' => $data['description'] ?? null,
        ]);

        AuditLog::record($request->user()?->name ?? 'System', "Created incident report {$report->code}", $report->code);

        return response()->json($this->format($report), 201);
    }

    public function show(IncidentReport $incident_report)
    {
        return response()->json($this->format($incident_report));
    }

    public function update(Request $request, IncidentReport $incident_report)
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:Submitted,Under Review,Investigating,Resolved,Dismissed'],
            'assigned_to' => ['sometimes', 'string'],
            'priority' => ['sometimes', 'in:Low,Medium,High,Critical'],
        ]);
        $incident_report->update($data);

        if (isset($data['status'])) {
            AuditLog::record($request->user()?->name ?? 'System', "Updated incident report status to {$data['status']}", $incident_report->code);

            if ($incident_report->student_id) {
                Notification::notifyStudent($incident_report->student_id, "Incident report {$incident_report->code} updated", "Status changed to {$data['status']}.", $incident_report->code);
            } elseif ($incident_report->personnel_id) {
                Notification::notifyPersonnel($incident_report->personnel_id, "Incident report {$incident_report->code} updated", "Status changed to {$data['status']}.", $incident_report->code);
            }
        }
        if (isset($data['assigned_to'])) {
            AuditLog::record($request->user()?->name ?? 'System', "Assigned {$incident_report->code} to {$data['assigned_to']}", $incident_report->code);
        }

        return response()->json($this->format($incident_report));
    }

    public function destroy(IncidentReport $incident_report)
    {
        $incident_report->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function format(IncidentReport $r, $docs = null): array
    {
        $docs ??= Document::where('linked_type', 'incident_report')
            ->where('linked_id', $r->id)
            ->orderBy('id')
            ->get();

        return [
            'id' => $r->code,
            'type' => $r->type,
            'reportedBy' => $r->reported_by,
            'studentId' => $r->student?->student_no,
            'location' => $r->location,
            'dateSubmitted' => $r->date_submitted?->format('Y-m-d'),
            'status' => $r->status,
            'priority' => $r->priority,
            'assignedTo' => $r->assigned_to,
            'description' => $r->description,
            'incidentDate' => $r->incident_date?->toIso8601String(),
            'peopleInvolved' => $r->people_involved,
            // False for anonymous reports - there is nobody to send a message to.
            'canMessage' => (bool) ($r->student_id || $r->personnel_id),
            // Photos / files the reporter attached in the mobile app.
            // The admin panel loads each one from GET /documents/{id}/download.
            'attachments' => $docs->map(fn ($d) => [
                'id' => $d->code,
                'name' => $d->name,
                'isImage' => $this->isImage($d->file_path ?: $d->name),
                'status' => $d->status,
            ])->values(),
        ];
    }

    private function isImage(?string $name): bool
    {
        return in_array(
            strtolower(pathinfo((string) $name, PATHINFO_EXTENSION)),
            ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
            true
        );
    }
}
