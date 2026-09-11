<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\IncidentReport;
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
        return response()->json($q->orderByDesc('id')->get()->map(fn ($r) => $this->format($r)));
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
        $seq = str_pad((string) (IncidentReport::count() + 1), 4, '0', STR_PAD_LEFT);

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

    private function format(IncidentReport $r): array
    {
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
        ];
    }
}
