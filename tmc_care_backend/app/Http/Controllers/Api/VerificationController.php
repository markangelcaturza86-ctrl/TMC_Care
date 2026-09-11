<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    public function pending(Request $request)
    {
        $financial = FinancialRequest::whereIn('status', ['Submitted', 'Under Verification'])->get()
            ->map(fn ($r) => [
                'id' => $r->code, 'type' => 'Financial', 'requestedBy' => $r->student_name,
                'dateSubmitted' => $r->date_submitted?->format('M d, Y'), 'status' => 'Pending',
                'documents' => $r->documents()->pluck('name'),
            ]);

        $incidents = IncidentReport::whereIn('status', ['Submitted', 'Under Review'])->get()
            ->map(fn ($r) => [
                'id' => $r->code, 'type' => 'Incident', 'requestedBy' => $r->reported_by,
                'dateSubmitted' => $r->date_submitted?->format('M d, Y'), 'status' => 'Pending',
                'documents' => $r->documents()->pluck('name'),
            ]);

        return response()->json($financial->merge($incidents)->sortByDesc('id')->values());
    }

    public function resolve(Request $request, string $id)
    {
        $data = $request->validate(['status' => ['required', 'in:Verified,Rejected']]);

        if (str_starts_with($id, 'FR-')) {
            $record = FinancialRequest::where('code', $id)->firstOrFail();
            $record->update(['status' => $data['status'] === 'Verified' ? 'Under Verification' : 'Declined']);
        } else {
            $record = IncidentReport::where('code', $id)->firstOrFail();
            $record->update(['status' => $data['status'] === 'Verified' ? 'Under Review' : 'Dismissed']);
        }

        AuditLog::record($request->user()?->name ?? 'System', "Marked {$id} as {$data['status']}", $id);

        return response()->json(['message' => 'Updated']);
    }
}
