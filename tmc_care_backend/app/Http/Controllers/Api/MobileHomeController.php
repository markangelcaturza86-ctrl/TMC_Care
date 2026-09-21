<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use App\Models\Personnel;
use App\Models\Student;
use Illuminate\Http\Request;

class MobileHomeController extends Controller
{
    public function summary(Request $request)
    {
        [$incidents, $financial] = $this->myRequests($request);

        $all = $incidents->concat($financial);
        $pending = $all->whereNotIn('status', ['Approved', 'Assistance Released', 'Declined'])->count();
        $resolved = $all->whereIn('status', ['Approved', 'Assistance Released'])->count();

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

    public function financialRequests(Request $request)
    {
        [, $financial] = $this->myRequests($request);
        return response()->json($financial->values()->map(fn ($r) => $this->formatFinancial($r)));
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
        ];
    }
}
