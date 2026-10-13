<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Services\AdminAlerts;
use App\Models\Document;
use App\Models\EmergencyContact;
use App\Models\Faq;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use App\Models\Notification;
use App\Models\Personnel;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class MobileHomeController extends Controller
{
    public function summary(Request $request)
    {
        [$incidents, $financial] = $this->myRequests($request);

        $all = $incidents->concat($financial);
        // "Resolved" = the request reached a successful outcome. Incident reports end at
        // "Resolved"; financial requests end at Approved / Partially Approved / Assistance Released.
        // "Declined" and "Dismissed" are closed too, so they are neither pending nor resolved.
        $resolvedStatuses = ['Resolved', 'Approved', 'Partially Approved', 'Assistance Released'];
        $closedStatuses = array_merge($resolvedStatuses, ['Declined', 'Dismissed']);

        $pending = $all->whereNotIn('status', $closedStatuses)->count();
        $resolved = $all->whereIn('status', $resolvedStatuses)->count();

        return response()->json([
            'total' => $all->count(),
            'pending' => $pending,
            'resolved' => $resolved,
        ]);
    }

    public function incidentReports(Request $request)
    {
        [$incidents] = $this->myRequests($request);
        return response()->json($incidents->values()->map(fn ($r) => $this->formatIncident($r)));
    }

    /**
     * Submit a new incident report as the logged-in student or personnel.
     * The reporter's identity is taken from the authenticated user — never from the request body —
     * so one account can never submit a report on behalf of someone else.
     */
    public function storeIncidentReport(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string'],
            'anonymous' => ['sometimes', 'boolean'],
            'location' => ['nullable', 'string'],
            'priority' => ['sometimes', 'in:Low,Medium,High,Critical'],
            'description' => ['nullable', 'string'],
            'incident_date' => ['nullable', 'date'],
            'people_involved' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $anonymous = (bool) ($data['anonymous'] ?? false);

        $year = now()->year;
        $seq = str_pad((string) ((IncidentReport::max('id') ?? 0) + 1), 4, '0', STR_PAD_LEFT);

        $report = IncidentReport::create([
            'code' => "IR-{$year}-{$seq}",
            'type' => $data['type'],
            'reported_by' => $anonymous ? 'Anonymous' : $user->name,
            'student_id' => (! $anonymous && $user instanceof Student) ? $user->id : null,
            'personnel_id' => (! $anonymous && $user instanceof Personnel) ? $user->id : null,
            'location' => $data['location'] ?? null,
            'date_submitted' => now()->toDateString(),
            'status' => 'Submitted',
            'priority' => $data['priority'] ?? 'Medium',
            'assigned_to' => 'Unassigned',
            'description' => $data['description'] ?? null,
            'incident_date' => $data['incident_date'] ?? null,
            'people_involved' => $data['people_involved'] ?? null,
        ]);

        AuditLog::record($user->name, "Submitted incident report {$report->code} (mobile app)", $report->code);

        AdminAlerts::send(
            'incident',
            "New incident report {$report->code}",
            "A new {$report->type} incident report ({$report->code}) was filed by {$report->reported_by}.\nPriority: {$report->priority}\n\nOpen the TMC-Care admin panel to review it."
        );

        return response()->json($this->formatIncident($report), 201);
    }

    public function financialRequests(Request $request)
    {
        [, $financial] = $this->myRequests($request);
        return response()->json($financial->values()->map(fn ($r) => $this->formatFinancial($r)));
    }

    /**
     * Submit a new financial assistance request as the logged-in student or personnel.
     */
    public function storeFinancialRequest(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string'],
            'amount_requested' => ['required', 'numeric', 'min:0'],
            'program' => ['nullable', 'string'],
            'reason' => ['nullable', 'string'],
            'beneficiary_name' => ['nullable', 'string'],
            'department' => ['nullable', 'string'],
            'year_level' => ['nullable', 'string'],
            'block_section' => ['nullable', 'string'],
            'requester_name' => ['nullable', 'string'],
            'relationship' => ['nullable', 'string'],
            'contact_info' => ['nullable', 'string'],
            'amount_funded' => ['nullable', 'numeric', 'min:0'],
        ]);

        $user = $request->user();
        $seq = str_pad((string) ((FinancialRequest::max('id') ?? 0) + 1), 4, '0', STR_PAD_LEFT);

        $fr = FinancialRequest::create([
            'code' => 'FR-' . now()->year . "-{$seq}",
            'student_id' => $user instanceof Student ? $user->id : null,
            'personnel_id' => $user instanceof Personnel ? $user->id : null,
            'student_name' => $data['beneficiary_name'] ?? $user->name,
            'program' => $data['program'] ?? ($user instanceof Student ? $user->program : null),
            'department' => $data['department'] ?? null,
            'year_level' => $data['year_level'] ?? null,
            'block_section' => $data['block_section'] ?? null,
            'requester_name' => $data['requester_name'] ?? null,
            'relationship' => $data['relationship'] ?? null,
            'contact_info' => $data['contact_info'] ?? null,
            'amount_funded' => $data['amount_funded'] ?? 0,
            'type' => $data['type'],
            'amount_requested' => $data['amount_requested'],
            'date_submitted' => now()->toDateString(),
            'status' => 'Submitted',
            'reason' => $data['reason'] ?? null,
        ]);

        AuditLog::record($user->name, "Submitted financial request {$fr->code} (mobile app)", $fr->code);

        AdminAlerts::send(
            'financial',
            "New financial assistance request {$fr->code}",
            "A new {$fr->type} request ({$fr->code}) was filed by {$fr->student_name}.\n\nOpen the TMC-Care admin panel to review it."
        );

        return response()->json($this->formatFinancial($fr), 201);
    }

    /**
     * Upload a supporting document for one of the user's OWN incident reports or
     * financial requests. Ownership is checked server-side — a student/personnel
     * account can never attach a file to someone else's record.
     */
    public function uploadDocument(Request $request)
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,doc,docx'],
            'linked_type' => ['required', 'in:incident_report,financial_request'],
            'linked_code' => ['required', 'string'],
        ]);

        $user = $request->user();
        $linked = $data['linked_type'] === 'incident_report'
            ? IncidentReport::where('code', $data['linked_code'])->first()
            : FinancialRequest::where('code', $data['linked_code'])->first();

        if (! $linked) {
            throw ValidationException::withMessages(['linked_code' => ['That record was not found.']]);
        }

        $owns = ($user instanceof Student && $linked->student_id === $user->id)
            || ($user instanceof Personnel && $linked->personnel_id === $user->id);

        if (! $owns) {
            abort(403, 'You can only attach documents to your own reports or requests.');
        }

        $path = $request->file('file')->store('documents', 'public');
        $seq = (Document::max('id') ?? 0) + 1;

        $document = Document::create([
            'code' => 'DOC-' . str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
            'name' => $request->file('file')->getClientOriginalName(),
            'owner' => $user->name,
            'linked_type' => $data['linked_type'],
            'linked_id' => $linked->id,
            'linked_code' => $data['linked_code'],
            'file_path' => $path,
            'size_bytes' => $request->file('file')->getSize(),
            'status' => 'Pending',
            'uploaded_at' => now(),
        ]);

        AuditLog::record($user->name, "Uploaded document {$document->name} (mobile app)", $document->code);

        AdminAlerts::send(
            'document',
            "New document uploaded: {$document->name}",
            "{$user->name} uploaded \"{$document->name}\" for {$document->linked_code}.\n\nOpen the TMC-Care admin panel to verify it."
        );

        return response()->json([
            'id' => $document->code,
            'name' => $document->name,
            'linkedTo' => $document->linked_code,
            'status' => $document->status,
            'uploaded' => $document->uploaded_at?->format('Y-m-d'),
        ], 201);
    }

    public function announcements()
    {
        return response()->json(
            Announcement::orderByDesc('pinned')->latest()->get()->map(fn ($a) => [
                'id' => $a->code,
                'title' => $a->title,
                'audience' => $a->audience,
                'pinned' => (bool) $a->pinned,
                'createdAt' => $a->created_at?->toIso8601String(),
            ])
        );
    }

    /**
     * Notifications generated automatically when an admin changes the status of
     * one of the user's own reports/requests (see the notify() calls added to
     * IncidentReportController, FinancialRequestController and VerificationController).
     */
    public function notifications(Request $request)
    {
        $user = $request->user();

        $q = $user instanceof Student
            ? Notification::where('student_id', $user->id)
            : Notification::where('personnel_id', $user->id);

        return response()->json(
            $q->latest()->limit(100)->get()->map(fn ($n) => [
                'id' => $n->id,
                'title' => $n->title,
                'body' => $n->body,
                'linkedCode' => $n->linked_code,
                'read' => (bool) $n->read,
                'createdAt' => $n->created_at?->toIso8601String(),
            ])
        );
    }

    public function markAllNotificationsRead(Request $request)
    {
        $user = $request->user();

        $q = $user instanceof Student
            ? Notification::where('student_id', $user->id)
            : Notification::where('personnel_id', $user->id);

        $q->where('read', false)->update(['read' => true]);

        return response()->json(['message' => 'All marked as read']);
    }

    public function markNotificationRead(Request $request, Notification $notification)
    {
        $user = $request->user();
        $owns = ($user instanceof Student && $notification->student_id === $user->id)
            || ($user instanceof Personnel && $notification->personnel_id === $user->id);

        if (! $owns) {
            abort(403);
        }

        $notification->update(['read' => true]);
        return response()->json(['message' => 'Marked as read']);
    }

    public function emergencyContacts()
    {
        return response()->json(
            EmergencyContact::orderBy('sort_order')->orderBy('name')->get()->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'category' => $c->category,
                'phone' => $c->phone,
                'description' => $c->description,
            ])
        );
    }

    public function faqs()
    {
        return response()->json(
            Faq::orderBy('sort_order')->get()->map(fn ($f) => [
                'id' => $f->id,
                'question' => $f->question,
                'answer' => $f->answer,
            ])
        );
    }

    /**
     * Change the logged-in student's/personnel's own password from the Settings screen.
     * This is separate from the admin-side resetPassword endpoints, which require admin auth.
     */
    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->forceFill(['password' => Hash::make($data['new_password'])])->save();

        return response()->json(['message' => 'Password updated']);
    }

    private function myRequests(Request $request): array
    {
        $user = $request->user();

        if ($user instanceof Student) {
            return [
                IncidentReport::where('student_id', $user->id)->latest()->get(),
                FinancialRequest::where('student_id', $user->id)->latest()->get(),
            ];
        }

        if ($user instanceof Personnel) {
            return [
                IncidentReport::where('personnel_id', $user->id)->latest()->get(),
                FinancialRequest::where('personnel_id', $user->id)->latest()->get(),
            ];
        }

        abort(403, 'This endpoint is for the student/staff app only.');
    }

    private function formatIncident(IncidentReport $r): array
    {
        return [
            'id' => $r->code,
            'type' => 'incident',
            'title' => $r->type,
            'status' => $r->status,
            'dateSubmitted' => $r->date_submitted?->format('Y-m-d'),
            'location' => $r->location,
            'description' => $r->description,
            'priority' => $r->priority,
            'incidentDate' => $r->incident_date?->toIso8601String(),
            'peopleInvolved' => $r->people_involved,
        ];
    }

    private function formatFinancial(FinancialRequest $r): array
    {
        return [
            'id' => $r->code,
            'type' => 'financial',
            'title' => $r->type,
            'status' => $r->status,
            'dateSubmitted' => $r->date_submitted?->format('Y-m-d'),
            'beneficiary' => $r->student_name,
            'amountRequested' => (float) $r->amount_requested,
            'amountApproved' => $r->amount_approved !== null ? (float) $r->amount_approved : null,
            // What the requester said was already funded (from the app form).
            'amountFunded' => (float) $r->amount_funded,
            'department' => $r->department,
            'yearLevel' => $r->year_level,
            'blockSection' => $r->block_section,
            'requesterName' => $r->requester_name,
            'relationship' => $r->relationship,
            'contactInfo' => $r->contact_info,
            'reason' => $r->reason,
            // School donation drive (opens when the request is approved).
            'targetAmount' => (float) ($r->amount_approved ?? $r->amount_requested),
            'amountCollected' => (float) $r->amount_collected,
            'driveDeadline' => $r->drive_deadline?->format('Y-m-d'),
            'releasedAt' => $r->released_at?->toIso8601String(),
            'releasedTo' => $r->released_to,
        ];
    }
}
