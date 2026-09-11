<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Document;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $totalReports = IncidentReport::count() + FinancialRequest::count();
        $incidentCount = IncidentReport::count();
        $financialCount = FinancialRequest::count();
        $pendingVerifications = IncidentReport::whereIn('status', ['Submitted', 'Under Review'])->count()
            + FinancialRequest::whereIn('status', ['Submitted', 'Under Verification'])->count()
            + Document::where('status', 'Pending')->count();
        $approvedRequests = FinancialRequest::whereIn('status', ['Approved', 'Partially Approved'])->count();
        $assistanceReleased = FinancialRequest::where('status', 'Assistance Released')->count();

        $weekly = collect(range(6, 0))->map(function ($daysAgo) {
            $date = Carbon::today()->subDays($daysAgo);
            return [
                'day' => $date->format('D'),
                'incidents' => IncidentReport::whereDate('date_submitted', $date)->count(),
                'financial' => FinancialRequest::whereDate('date_submitted', $date)->count(),
            ];
        })->values();

        $statusColors = [
            'Submitted' => '#2F6FED', 'Under Verification' => '#F59E0B', 'Additional Documents' => '#FBBF24',
            'Approved' => '#16A34A', 'Partially Approved' => '#7C3AED', 'Declined' => '#EF4444',
            'Assistance Released' => '#14B8A6',
        ];
        $requestsByStatus = FinancialRequest::selectRaw('status, count(*) as value')
            ->groupBy('status')->pluck('value', 'status');
        $requestsByStatusList = collect($statusColors)->map(function ($color, $name) use ($requestsByStatus) {
            return ['name' => $name, 'value' => (int) ($requestsByStatus[$name] ?? 0), 'color' => $color];
        })->values();

        $topTypes = FinancialRequest::selectRaw('type, count(*) as count')
            ->groupBy('type')->orderByDesc('count')->limit(6)->get()
            ->map(fn ($r) => ['type' => $r->type, 'count' => (int) $r->count]);

        $pendingList = collect()
            ->merge(FinancialRequest::whereIn('status', ['Submitted', 'Under Verification'])->latest('date_submitted')->limit(5)->get()->map(fn ($r) => [
                'id' => $r->code, 'type' => 'Financial', 'requestedBy' => $r->student_name,
                'dateSubmitted' => $r->date_submitted->format('M d, Y'), 'status' => 'Pending',
            ]))
            ->merge(IncidentReport::whereIn('status', ['Submitted', 'Under Review'])->latest('date_submitted')->limit(5)->get()->map(fn ($r) => [
                'id' => $r->code, 'type' => 'Incident', 'requestedBy' => $r->reported_by,
                'dateSubmitted' => $r->date_submitted->format('M d, Y'), 'status' => 'Pending',
            ]))
            ->take(5)->values();

        $latestAnnouncement = Announcement::orderByDesc('pinned')->latest()->first();

        return response()->json([
            'stats' => [
                'totalReports' => $totalReports,
                'totalReportsDelta' => '+' . IncidentReport::whereDate('created_at', '>=', now()->subWeek())->count() + FinancialRequest::whereDate('created_at', '>=', now()->subWeek())->count() . ' this week',
                'incidentReports' => $incidentCount,
                'incidentReportsDelta' => '+' . IncidentReport::whereDate('created_at', '>=', now()->subWeek())->count() . ' this week',
                'financialRequests' => $financialCount,
                'financialRequestsDelta' => '+' . FinancialRequest::whereDate('created_at', '>=', now()->subWeek())->count() . ' this week',
                'pendingVerifications' => $pendingVerifications,
                'approvedRequests' => $approvedRequests,
                'assistanceReleased' => $assistanceReleased,
            ],
            'weeklyReportsOverview' => $weekly,
            'requestsByStatus' => $requestsByStatusList,
            'topRequestTypes' => $topTypes,
            'pendingVerifications' => $pendingList,
            'announcement' => $latestAnnouncement ? [
                'title' => $latestAnnouncement->title,
                'date' => $latestAnnouncement->created_at->format('M d, Y'),
                'postedBy' => $latestAnnouncement->posted_by,
            ] : null,
        ]);
    }
}
