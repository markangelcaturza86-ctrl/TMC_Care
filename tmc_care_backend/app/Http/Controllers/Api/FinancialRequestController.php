<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\Donation;
use App\Models\Remittance;
use App\Models\FinancialRequest;
use App\Models\Notification;
use Illuminate\Http\Request;

class FinancialRequestController extends Controller
{
    public function index(Request $request)
    {
        $q = FinancialRequest::query();
        if ($status = $request->query('status')) $q->where('status', $status);
        if ($type = $request->query('type')) $q->where('type', $type);
        if ($search = $request->query('search')) {
            $q->where(function ($qq) use ($search) {
                $qq->where('code', 'like', "%{$search}%")
                    ->orWhere('student_name', 'like', "%{$search}%")
                    ->orWhere('type', 'like', "%{$search}%");
            });
        }
        return response()->json($q->orderByDesc('id')->get()->map(fn ($r) => $this->format($r)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'student_id' => ['nullable', 'exists:students,id'],
            'student_name' => ['required', 'string'],
            'program' => ['nullable', 'string'],
            'type' => ['required', 'string'],
            'amount_requested' => ['required', 'numeric', 'min:0'],
            'reason' => ['nullable', 'string'],
        ]);

        $seq = str_pad((string) ((FinancialRequest::max('id') ?? 0) + 1), 4, '0', STR_PAD_LEFT);

        $fr = FinancialRequest::create([
            'code' => 'FR-' . now()->year . "-{$seq}",
            'student_id' => $data['student_id'] ?? null,
            'student_name' => $data['student_name'],
            'program' => $data['program'] ?? null,
            'type' => $data['type'],
            'amount_requested' => $data['amount_requested'],
            'date_submitted' => now()->toDateString(),
            'status' => 'Submitted',
            'reason' => $data['reason'] ?? null,
        ]);

        AuditLog::record($request->user()?->name ?? 'System', "Submitted financial request {$fr->code}", $fr->code);

        return response()->json($this->format($fr), 201);
    }

    public function show(FinancialRequest $financial_request)
    {
        return response()->json($this->format($financial_request));
    }

    public function update(Request $request, FinancialRequest $financial_request)
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:Submitted,Under Verification,Additional Documents,Approved,Partially Approved,Declined,Assistance Released'],
            'amount_approved' => ['sometimes', 'nullable', 'numeric'],
        ]);

        // Approving opens the donation drive and releasing closes it, each with
        // its own checks, so they cannot be set through this generic update.
        abort_if(
            in_array($data['status'] ?? null, ['Approved', 'Assistance Released'], true),
            422,
            'Use the Approve and Release actions for this status.'
        );

        $financial_request->update($data);

        if (isset($data['status'])) {
            $actor = $request->user()?->name ?? 'System';
            $verb = match ($data['status']) {
                'Approved', 'Partially Approved' => 'Approved',
                'Declined' => 'Declined',
                'Assistance Released' => 'Released assistance for',
                default => 'Updated',
            };
            AuditLog::record($actor, "{$verb} financial request {$financial_request->code}", $financial_request->code);

            if ($financial_request->student_id) {
                Notification::notifyStudent($financial_request->student_id, "Financial request {$financial_request->code} updated", "Status changed to {$data['status']}.", $financial_request->code);
            } elseif ($financial_request->personnel_id) {
                Notification::notifyPersonnel($financial_request->personnel_id, "Financial request {$financial_request->code} updated", "Status changed to {$data['status']}.", $financial_request->code);
            }
        }

        return response()->json($this->format($financial_request));
    }

    public function destroy(FinancialRequest $financial_request)
    {
        $financial_request->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // ------------------------------------------------------------------
    // Donation drive: approve (opens it) -> log donations -> release (closes it)
    // ------------------------------------------------------------------

    public function approve(Request $request, FinancialRequest $financial_request)
    {
        $data = $request->validate([
            'target_amount' => ['required', 'numeric', 'min:1'],
            'drive_deadline' => ['required', 'date', 'after_or_equal:today'],
        ]);

        abort_unless(
            in_array($financial_request->status, ['Submitted', 'Under Verification', 'Additional Documents'], true),
            422,
            "{$financial_request->code} can no longer be approved (status: {$financial_request->status})."
        );

        $user = $request->user();
        $deadline = \Illuminate\Support\Carbon::parse($data['drive_deadline']);

        $announcement = $this->postAnnouncement(
            $user->name ?? 'Admin',
            'Donation drive for ' . $financial_request->student_name . ' (' . $financial_request->type . '): target PHP '
                . number_format((float) $data['target_amount'], 2) . ', until ' . $deadline->format('M d, Y')
                . '. Please give your donation at the school office.',
            true
        );

        $financial_request->update([
            'status' => 'Approved',
            'amount_approved' => $data['target_amount'],
            'drive_deadline' => $deadline->toDateString(),
            'approved_by_id' => $user->id,
            'approved_by' => $user->name,
            'approved_at' => now(),
            'drive_announcement_code' => $announcement->code,
        ]);

        AuditLog::record($user->name ?? 'System', "Approved financial request {$financial_request->code} and opened the donation drive", $financial_request->code);

        $this->notifyRequester($financial_request, "Financial request {$financial_request->code} approved", 'Approved. The school opened a donation drive for your request.');

        return response()->json($this->format($financial_request));
    }

    public function donations(FinancialRequest $financial_request)
    {
        return response()->json($this->driveState($financial_request));
    }

    public function addDonation(Request $request, FinancialRequest $financial_request)
    {
        abort_unless($financial_request->status === 'Approved', 422, 'The donation drive is not open for this request.');

        $data = $request->validate([
            'donor_name' => ['nullable', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:1', 'max:10000000'],
            'received_on' => ['nullable', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:150'],
        ]);

        $donor = trim($data['donor_name'] ?? '');

        $donation = Donation::create([
            'financial_request_id' => $financial_request->id,
            'donor_name' => $donor !== '' ? $donor : 'Anonymous',
            'amount' => $data['amount'],
            'received_on' => $data['received_on'] ?? now()->toDateString(),
            'recorded_by' => $request->user()->name ?? 'Admin',
            'notes' => $data['notes'] ?? null,
            // Cash taken directly at the TMC Treasurer's office counts immediately.
            'department_id' => null,
            'status' => 'Received',
        ]);

        $this->recomputeCollected($financial_request);

        AuditLog::record(
            $request->user()->name ?? 'Admin',
            'Recorded donation of PHP ' . number_format((float) $donation->amount, 2) . " from {$donation->donor_name} for {$financial_request->code}",
            $financial_request->code
        );

        return response()->json($this->driveState($financial_request), 201);
    }

    public function deleteDonation(Request $request, FinancialRequest $financial_request, Donation $donation)
    {
        abort_unless($financial_request->status === 'Approved', 422, 'The drive is closed, so donations can no longer be removed.');
        abort_unless($donation->financial_request_id === $financial_request->id, 404);
        abort_unless(
            $donation->department_id === null,
            422,
            'This donation was collected by a department treasurer. Reject the remittance instead.'
        );

        $donation->delete();
        $this->recomputeCollected($financial_request);

        AuditLog::record(
            $request->user()->name ?? 'Admin',
            'Removed donation of PHP ' . number_format((float) $donation->amount, 2) . " from {$donation->donor_name} for {$financial_request->code}",
            $financial_request->code
        );

        return response()->json($this->driveState($financial_request));
    }

    public function release(Request $request, FinancialRequest $financial_request)
    {
        $data = $request->validate(['released_to' => ['required', 'string', 'max:100']]);
        $user = $request->user();

        abort_unless($financial_request->status === 'Approved', 422, 'Only an approved request with an open drive can be released.');

        abort_if(
            ! $financial_request->donations()->exists(),
            422,
            'Record at least one donation before releasing.'
        );

        abort_unless(
            Document::where('linked_type', 'financial_request')
                ->where('linked_id', $financial_request->id)
                ->where('status', 'Verified')->exists(),
            422,
            'At least one supporting document must be verified before release.'
        );

        $unreceived = (float) $financial_request->donations()->where('status', '!=', 'Received')->sum('amount');
        abort_if(
            $unreceived > 0,
            422,
            'PHP ' . number_format($unreceived, 2) . ' is still held by department treasurers or waiting to be received. Receive or reject those remittances first.'
        );

        abort_if(
            $financial_request->approved_by_id && (int) $financial_request->approved_by_id === (int) $user->id,
            422,
            'A different admin than the one who approved this request must release it.'
        );

        $this->recomputeCollected($financial_request);
        $collected = (float) $financial_request->amount_collected;

        $financial_request->update([
            'status' => 'Assistance Released',
            'released_by_id' => $user->id,
            'released_by' => $user->name,
            'released_to' => trim($data['released_to']),
            'released_at' => now(),
        ]);

        if ($financial_request->drive_announcement_code) {
            Announcement::where('code', $financial_request->drive_announcement_code)->update(['pinned' => false]);
        }
        $this->postAnnouncement(
            $user->name ?? 'Admin',
            'Donation drive closed for ' . $financial_request->student_name . ': PHP ' . number_format($collected, 2)
                . ' collected. Thank you for your generosity!',
            false
        );

        AuditLog::record(
            $user->name ?? 'System',
            'Released PHP ' . number_format($collected, 2) . " for {$financial_request->code} to " . trim($data['released_to']),
            $financial_request->code
        );

        $this->notifyRequester(
            $financial_request,
            "Financial request {$financial_request->code} released",
            'PHP ' . number_format($collected, 2) . ' was collected and handed over to ' . trim($data['released_to']) . '.'
        );

        return response()->json($this->format($financial_request));
    }

    private function recomputeCollected(FinancialRequest $fr): void
    {
        $fr->update(['amount_collected' => $fr->donations()->where('status', 'Received')->sum('amount')]);
    }

    private function driveState(FinancialRequest $fr): array
    {
        $fr->refresh();

        return [
            'request' => $this->format($fr),
            'donations' => $fr->donations()->with('department')->orderBy('id')->get()->map(fn ($d) => [
                'id' => $d->id,
                'donor' => $d->donor_name,
                'amount' => (float) $d->amount,
                'receivedOn' => $d->received_on?->format('Y-m-d'),
                'recordedBy' => $d->recorded_by,
                'notes' => $d->notes,
                'department' => $d->department?->name ?? 'TMC Treasurer',
                'status' => $d->status,
            ])->values(),
            'remittances' => Remittance::with(['financialRequest', 'department'])
                ->where('financial_request_id', $fr->id)->orderByDesc('id')->get()
                ->map(fn ($r) => $r->summary())->values(),
            // Cash still sitting with department treasurers (not yet confirmed).
            'unreceived' => (float) $fr->donations()->where('status', '!=', 'Received')->sum('amount'),
        ];
    }

    // ---- remittances from department treasurers ----

    public function receiveRemittance(Request $request, Remittance $remittance)
    {
        abort_unless($remittance->status === 'Pending', 422, "{$remittance->code} was already handled.");
        $user = $request->user();

        $remittance->donations()->update(['status' => 'Received']);
        $remittance->update([
            'status' => 'Received',
            'received_by_id' => $user->id,
            'received_by' => $user->name,
            'received_at' => now(),
        ]);

        $fr = $remittance->financialRequest;
        $this->recomputeCollected($fr);

        AuditLog::record(
            $user->name ?? 'Treasurer',
            'Received PHP ' . number_format((float) $remittance->amount, 2) . " from {$remittance->department?->name} ({$remittance->code}) for {$fr->code}",
            $remittance->code
        );

        return response()->json($this->driveState($fr));
    }

    public function rejectRemittance(Request $request, Remittance $remittance)
    {
        $data = $request->validate(['note' => ['required', 'string', 'max:150']]);
        abort_unless($remittance->status === 'Pending', 422, "{$remittance->code} was already handled.");
        $user = $request->user();

        // The cash goes back to the department so it can be counted again and re-sent.
        $remittance->donations()->update(['status' => 'Collected', 'remittance_id' => null]);
        $remittance->update([
            'status' => 'Rejected',
            'received_by_id' => $user->id,
            'received_by' => $user->name,
            'received_at' => now(),
            'note' => $data['note'],
        ]);

        $fr = $remittance->financialRequest;

        AuditLog::record(
            $user->name ?? 'Treasurer',
            "Rejected remittance {$remittance->code} from {$remittance->department?->name}: {$data['note']}",
            $remittance->code
        );

        return response()->json($this->driveState($fr));
    }

    private function postAnnouncement(string $by, string $title, bool $pinned): Announcement
    {
        $seq = (Announcement::max('id') ?? 0) + 1;

        return Announcement::create([
            'code' => 'AN-' . str_pad((string) $seq, 3, '0', STR_PAD_LEFT),
            'title' => $title,
            'audience' => 'All Students',
            'posted_by' => $by,
            'pinned' => $pinned,
        ]);
    }

    private function notifyRequester(FinancialRequest $fr, string $title, string $body): void
    {
        if ($fr->student_id) {
            Notification::notifyStudent($fr->student_id, $title, $body, $fr->code);
        } elseif ($fr->personnel_id) {
            Notification::notifyPersonnel($fr->personnel_id, $title, $body, $fr->code);
        }
    }

    private function format(FinancialRequest $r): array
    {
        return [
            'id' => $r->code,
            'student' => $r->student_name,
            'studentId' => $r->student?->student_no,
            'program' => $r->program,
            'type' => $r->type,
            'amountRequested' => (float) $r->amount_requested,
            'amountApproved' => $r->amount_approved !== null ? (float) $r->amount_approved : null,
            'dateSubmitted' => $r->date_submitted?->format('Y-m-d'),
            'status' => $r->status,
            'reason' => $r->reason,
            'amountFunded' => (float) $r->amount_funded,
            'department' => $r->department,
            'yearLevel' => $r->year_level,
            'blockSection' => $r->block_section,
            'requesterName' => $r->requester_name,
            'relationship' => $r->relationship,
            'contactInfo' => $r->contact_info,
            // Donation drive
            'targetAmount' => (float) ($r->amount_approved ?? $r->amount_requested),
            'amountCollected' => (float) $r->amount_collected,
            'driveDeadline' => $r->drive_deadline?->format('Y-m-d'),
            'approvedBy' => $r->approved_by,
            'approvedByYou' => $r->approved_by_id !== null && (int) $r->approved_by_id === (int) request()->user()?->id,
            'releasedAt' => $r->released_at?->format('M d, Y g:i A'),
            'releasedBy' => $r->released_by,
            'releasedTo' => $r->released_to,
            'verifiedDocuments' => Document::where('linked_type', 'financial_request')
                ->where('linked_id', $r->id)->where('status', 'Verified')->count(),
            'documents' => Document::where('linked_type', 'financial_request')->where('linked_id', $r->id)->pluck('name'),
        ];
    }
}
