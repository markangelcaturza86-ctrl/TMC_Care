<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\FinancialRequest;
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

        $seq = str_pad((string) (FinancialRequest::count() + 1), 4, '0', STR_PAD_LEFT);

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
        }

        return response()->json($this->format($financial_request));
    }

    public function destroy(FinancialRequest $financial_request)
    {
        $financial_request->delete();
        return response()->json(['message' => 'Deleted']);
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
            'documents' => Document::where('linked_type', 'financial_request')->where('linked_id', $r->id)->pluck('name'),
        ];
    }
}
