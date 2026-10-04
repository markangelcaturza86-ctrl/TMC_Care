<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VerificationController extends Controller
{
    /**
     * A request waits in the verification queue only while its status is "Submitted".
     * Once an admin verifies or rejects it the status changes, so it leaves the queue.
     */
    private const PENDING_STATUS = 'Submitted';

    /** GET /api/verifications/pending */
    public function pending()
    {
        $financial = FinancialRequest::with(['student', 'personnel'])
            ->where('status', self::PENDING_STATUS)
            ->get()
            ->map(fn (FinancialRequest $r) => [
                'id' => $r->code,
                'type' => 'Financial',
                'requestedBy' => $r->student?->name ?? $r->personnel?->name ?? $r->student_name ?? 'Unknown',
                'dateSubmitted' => $r->date_submitted?->format('M d, Y'),
                'createdAt' => $r->created_at?->toIso8601String(),
                'status' => 'Pending',
                'fields' => $this->fields([
                    'Assistance Type' => $r->type,
                    'Student / Beneficiary' => $r->student_name,
                    'Program' => $r->program,
                    'Amount Requested' => '₱' . number_format((float) $r->amount_requested, 2),
                    'Reason' => $r->reason,
                ], $r->details),
                'documents' => $this->documentsFor('financial_request', $r->id),
            ])
            ->all();

        $incidents = IncidentReport::with(['student', 'personnel'])
            ->where('status', self::PENDING_STATUS)
            ->get()
            ->map(fn (IncidentReport $r) => [
                'id' => $r->code,
                'type' => 'Incident',
                'requestedBy' => $r->reported_by ?: 'Anonymous',
                'dateSubmitted' => $r->date_submitted?->format('M d, Y'),
                'createdAt' => $r->created_at?->toIso8601String(),
                'status' => 'Pending',
                'fields' => $this->fields([
                    'Incident Type' => $r->type,
                    'Location' => $r->location,
                    'Priority' => $r->priority,
                    'Description' => $r->description,
                ], $r->details),
                'documents' => $this->documentsFor('incident_report', $r->id),
            ])
            ->all();

        // Plain arrays on purpose: Eloquent collections override merge() and break on non-model items.
        return response()->json(
            collect(array_merge($financial, $incidents))->sortByDesc('createdAt')->values()
        );
    }

    /** POST /api/verifications/{id}/resolve   body: { status: "Verified"|"Rejected", remarks?: string } */
    public function resolve(Request $request, string $id)
    {
        $data = $request->validate([
            'status' => ['required', 'in:Verified,Rejected'],
            'remarks' => ['nullable', 'string', 'max:150'],
        ]);

        $decision = $data['status'];
        $verified = $decision === 'Verified';

        if (str_starts_with($id, 'FR-')) {
            $record = FinancialRequest::where('code', $id)->firstOrFail();
            $linkedType = 'financial_request';
            $nextStatus = $verified ? 'Under Verification' : 'Declined';
        } elseif (str_starts_with($id, 'IR-')) {
            $record = IncidentReport::where('code', $id)->firstOrFail();
            $linkedType = 'incident_report';
            $nextStatus = $verified ? 'Under Review' : 'Dismissed';
        } else {
            abort(404, 'Unknown request ID.');
        }

        // The "where status = Submitted" inside the UPDATE makes this safe even if two
        // admins click at the same moment: only one of them can win.
        $changed = DB::transaction(function () use ($record, $nextStatus, $linkedType, $decision) {
            $changed = $record->newQuery()
                ->whereKey($record->getKey())
                ->where('status', self::PENDING_STATUS)
                ->update(['status' => $nextStatus]);

            if ($changed) {
                // The files attached to the request get the same decision.
                Document::where('linked_type', $linkedType)
                    ->where('linked_id', $record->id)
                    ->update(['status' => $decision]);
            }

            return $changed;
        });

        if (! $changed) {
            $record->refresh();

            return response()->json([
                'message' => "{$id} was already processed (current status: {$record->status}). Please refresh the list.",
            ], 409);
        }

        $remarks = trim((string) ($data['remarks'] ?? ''));
        $action = "Marked {$id} as {$decision}" . ($remarks !== '' ? ' - ' . Str::limit($remarks, 120) : '');
        AuditLog::record($request->user()?->name ?? 'System', $action, $id);

        return response()->json(['message' => 'Updated', 'id' => $id, 'status' => $nextStatus]);
    }

    /**
     * Turns label => value pairs (plus the JSON "details" column) into a list the
     * React modal can print without knowing what each field means.
     */
    private function fields(array $base, ?array $extra = null): array
    {
        foreach ($extra ?? [] as $key => $value) {
            $base[Str::headline((string) $key)] = $value;
        }

        $rows = [];
        foreach ($base as $label => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $rows[] = [
                'label' => $label,
                'value' => is_scalar($value) ? (string) $value : json_encode($value),
            ];
        }

        return $rows;
    }

    private function documentsFor(string $linkedType, int $linkedId): array
    {
        return Document::where('linked_type', $linkedType)
            ->where('linked_id', $linkedId)
            ->orderBy('id')
            ->get()
            ->map(fn (Document $d) => [
                'id' => $d->code,
                'name' => $d->name,
                'size' => $this->humanSize((int) $d->size_bytes),
                'status' => $d->status,
            ])
            ->all();
    }

    private function humanSize(int $bytes): string
    {
        if ($bytes <= 0) return '0 KB';
        if ($bytes < 1024 * 1024) return round($bytes / 1024) . ' KB';
        return round($bytes / (1024 * 1024), 1) . ' MB';
    }
}
