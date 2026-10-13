<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use App\Models\Notification;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    /**
     * Requests waiting for a first look. Each item carries everything the
     * "Review" window needs: the request details (`fields`) and its documents.
     */
    public function pending(Request $request)
    {
        $user = $request->user();

        // Treasurer -> financial only, Guidance Counselor -> incidents only.
        $financial = $user->canManageFinancial()
            ? FinancialRequest::where('status', 'Submitted')->get()
                ->map(fn ($r) => [
                    'id' => $r->code,
                    'type' => 'Financial',
                    'requestedBy' => $r->student_name,
                    'dateSubmitted' => $r->date_submitted?->format('M d, Y'),
                    'status' => 'Pending',
                    'fields' => $this->financialFields($r),
                    'documents' => $this->documents($r),
                    '_sort' => $r->created_at?->getTimestamp() ?? 0,
                ])
            : collect();

        $incidents = $user->canManageIncidents()
            ? IncidentReport::where('status', 'Submitted')->get()
                ->map(fn ($r) => [
                    'id' => $r->code,
                    'type' => 'Incident',
                    'requestedBy' => $r->reported_by,
                    'dateSubmitted' => $r->date_submitted?->format('M d, Y'),
                    'status' => 'Pending',
                    'fields' => $this->incidentFields($r),
                    'documents' => $this->documents($r),
                    '_sort' => $r->created_at?->getTimestamp() ?? 0,
                ])
            : collect();

        // toBase(): an EMPTY Eloquent collection stays an Eloquent collection after map(),
        // and merging arrays into it crashes (getKey() on array).
        return response()->json(
            $financial->toBase()->concat($incidents->toBase())
                ->sortByDesc('_sort')
                ->map(function ($i) {
                    unset($i['_sort']);
                    return $i;
                })
                ->values()
        );
    }

    public function resolve(Request $request, string $id)
    {
        $data = $request->validate([
            'status' => ['required', 'in:Verified,Rejected'],
            'remarks' => ['nullable', 'string', 'max:150'],
        ]);
        $user = $request->user();

        if (str_starts_with($id, 'FR-')) {
            abort_unless($user->canManageFinancial(), 403, 'Only the Treasurer can resolve financial requests.');
            $record = FinancialRequest::where('code', $id)->firstOrFail();
            $this->ensureStillPending($record);
            $newStatus = $data['status'] === 'Verified' ? 'Under Verification' : 'Declined';
        } else {
            abort_unless($user->canManageIncidents(), 403, 'Only the Guidance Counselor can resolve incident reports.');
            $record = IncidentReport::where('code', $id)->firstOrFail();
            $this->ensureStillPending($record);
            $newStatus = $data['status'] === 'Verified' ? 'Under Review' : 'Dismissed';
        }

        $record->update(['status' => $newStatus]);

        $remarks = trim($data['remarks'] ?? '');
        AuditLog::record(
            $user->name ?? 'System',
            "Marked {$id} as {$data['status']}" . ($remarks !== '' ? " - {$remarks}" : ''),
            $id
        );

        if ($record->student_id) {
            Notification::notifyStudent($record->student_id, "{$id} update", "Status changed to {$newStatus}.", $id);
        } elseif ($record->personnel_id) {
            Notification::notifyPersonnel($record->personnel_id, "{$id} update", "Status changed to {$newStatus}.", $id);
        }

        return response()->json(['message' => 'Updated']);
    }

    // ---------------------------------------------------------------- helpers

    /** Someone else may already have handled it while this window was open. */
    private function ensureStillPending($record): void
    {
        abort_unless(
            $record->status === 'Submitted',
            422,
            "{$record->code} was already handled by someone else."
        );
    }

    private function documents($record): array
    {
        return $record->documents()->orderBy('id')->get()->map(fn ($d) => [
            'id' => $d->code,
            'name' => $d->name,
            'size' => $this->humanSize((int) $d->size_bytes),
            'status' => $d->status,
            'isImage' => in_array(
                strtolower(pathinfo((string) ($d->file_path ?: $d->name), PATHINFO_EXTENSION)),
                ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
                true
            ),
        ])->values()->all();
    }

    private function incidentFields(IncidentReport $r): array
    {
        return $this->fields([
            'Incident Type' => $r->type,
            'Location' => $r->location,
            'Date of Incident' => $r->incident_date?->format('M d, Y g:i A'),
            'Priority' => $r->priority,
            'People Involved' => $r->people_involved,
            'Description' => $r->description,
        ]);
    }

    private function financialFields(FinancialRequest $r): array
    {
        return $this->fields([
            'Type of Assistance' => $r->type,
            'Amount Requested' => '₱' . number_format((float) $r->amount_requested, 2),
            'Program' => $r->program,
            'Department' => $r->department,
            'Year Level' => $r->year_level,
            'Block / Section' => $r->block_section,
            'Requester' => $r->requester_name,
            'Relationship' => $r->relationship,
            'Contact' => $r->contact_info,
            'Reason' => $r->reason,
        ]);
    }

    /** Label => value map into the [{label, value}] list the admin panel expects. */
    private function fields(array $map): array
    {
        $out = [];
        foreach ($map as $label => $value) {
            $value = trim((string) ($value ?? ''));
            $out[] = ['label' => $label, 'value' => $value === '' ? '—' : $value];
        }
        return $out;
    }

    private function humanSize(int $bytes): string
    {
        if ($bytes <= 0) return '0 KB';
        if ($bytes < 1024 * 1024) return round($bytes / 1024, 0) . ' KB';
        return round($bytes / (1024 * 1024), 1) . ' MB';
    }
}
