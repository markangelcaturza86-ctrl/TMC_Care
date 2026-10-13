<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Donation;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use App\Models\IncidentReportMessage;
use App\Models\Personnel;
use App\Models\Remittance;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // The dashboard only shows what this account is allowed to manage:
        // Guidance Counselor -> incidents, Treasurer -> financial.
        $inc = $user->canManageIncidents();
        $fin = $user->canManageFinancial();

        // Each role gets a dashboard about its own work in the system.
        if ($user->isDepartmentTreasurer()) {
            return response()->json($this->departmentDashboard($user));
        }
        if (! $user->isSuperAdmin()) {
            if ($fin && ! $inc) return response()->json($this->treasurerDashboard());
            if ($inc && ! $fin) return response()->json($this->guidanceDashboard());
        }

        $weekAgo = now()->subWeek();

        $incidentCount = $inc ? IncidentReport::count() : 0;
        $financialCount = $fin ? FinancialRequest::count() : 0;
        $totalReports = $incidentCount + $financialCount;

        $incidentWeek = $inc ? IncidentReport::whereDate('created_at', '>=', $weekAgo)->count() : 0;
        $financialWeek = $fin ? FinancialRequest::whereDate('created_at', '>=', $weekAgo)->count() : 0;

        $pendingVerifications =
            ($inc ? IncidentReport::where('status', 'Submitted')->count() : 0)
            + ($fin ? FinancialRequest::where('status', 'Submitted')->count() : 0);

        $approvedRequests = $fin ? FinancialRequest::whereIn('status', ['Approved', 'Partially Approved'])->count() : 0;
        $assistanceReleased = $fin ? FinancialRequest::where('status', 'Assistance Released')->count() : 0;

        $weekly = collect(range(6, 0))->map(function ($daysAgo) use ($inc, $fin) {
            $date = Carbon::today()->subDays($daysAgo);
            return [
                'day' => $date->format('D'),
                'incidents' => $inc ? IncidentReport::whereDate('date_submitted', $date)->count() : 0,
                'financial' => $fin ? FinancialRequest::whereDate('date_submitted', $date)->count() : 0,
            ];
        })->values();

        $statusColors = [
            'Submitted' => '#2F6FED', 'Under Verification' => '#F59E0B', 'Additional Documents' => '#FBBF24',
            'Approved' => '#16A34A', 'Partially Approved' => '#7C3AED', 'Declined' => '#EF4444',
            'Assistance Released' => '#14B8A6',
        ];
        $requestsByStatus = $fin
            ? FinancialRequest::selectRaw('status, count(*) as value')->groupBy('status')->pluck('value', 'status')
            : collect();
        $requestsByStatusList = collect($statusColors)->map(function ($color, $name) use ($requestsByStatus) {
            return ['name' => $name, 'value' => (int) ($requestsByStatus[$name] ?? 0), 'color' => $color];
        })->values();

        $topTypes = $fin
            ? FinancialRequest::selectRaw('type, count(*) as count')
                ->groupBy('type')->orderByDesc('count')->limit(6)->get()
                ->map(fn ($r) => ['type' => $r->type, 'count' => (int) $r->count])
            : collect();

        $pendingFinancial = $fin
            ? FinancialRequest::where('status', 'Submitted')->latest('date_submitted')->limit(5)->get()->map(fn ($r) => [
                'id' => $r->code, 'type' => 'Financial', 'requestedBy' => $r->student_name,
                'dateSubmitted' => $r->date_submitted->format('M d, Y'), 'status' => 'Pending',
            ])
            : collect();

        $pendingIncidents = $inc
            ? IncidentReport::where('status', 'Submitted')->latest('date_submitted')->limit(5)->get()->map(fn ($r) => [
                'id' => $r->code, 'type' => 'Incident', 'requestedBy' => $r->reported_by,
                'dateSubmitted' => $r->date_submitted->format('M d, Y'), 'status' => 'Pending',
            ])
            : collect();

        // toBase(): an EMPTY Eloquent collection stays an Eloquent collection after map(),
        // and merging arrays into it crashes (getKey() on array) - which made the whole
        // dashboard return a 500 whenever there were no pending financial requests.
        $pendingList = $pendingFinancial->toBase()->merge($pendingIncidents->toBase())->take(5)->values();

        $latestAnnouncement = Announcement::orderByDesc('pinned')->latest()->first();

        return response()->json([
            'focus' => 'admin',
            'stats' => [
                'totalReports' => $totalReports,
                'totalReportsDelta' => '+' . ($incidentWeek + $financialWeek) . ' this week',
                'incidentReports' => $incidentCount,
                'incidentReportsDelta' => '+' . $incidentWeek . ' this week',
                'financialRequests' => $financialCount,
                'financialRequestsDelta' => '+' . $financialWeek . ' this week',
                'pendingVerifications' => $pendingVerifications,
                'approvedRequests' => $approvedRequests,
                'assistanceReleased' => $assistanceReleased,
                'totalStudents' => Student::count(),
                'totalPersonnel' => Personnel::count(),
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

    // ------------------------------------------------------------------
    // Guidance Counselor: incident reports
    // ------------------------------------------------------------------
    private function guidanceDashboard(): array
    {
        $open = ['Submitted', 'Under Review', 'Investigating'];

        $unassigned = IncidentReport::whereIn('status', $open)
            ->where(function ($q) {
                $q->whereNull('assigned_to')->orWhere('assigned_to', '')->orWhere('assigned_to', 'Unassigned');
            })->count();

        $unreadReplies = IncidentReportMessage::where('sender', 'reporter')->where('read', false)->count();

        // One row per report that has unread answers from its reporter.
        $replies = IncidentReportMessage::with('report')
            ->where('sender', 'reporter')->where('read', false)->latest()->limit(30)->get()
            ->filter(fn ($m) => $m->report)
            ->groupBy('incident_report_id')
            ->map(fn ($group) => [
                'code' => $group->first()->report->code,
                'from' => $group->first()->sender_name,
                'snippet' => mb_strimwidth($group->first()->body, 0, 90, '…'),
                'count' => $group->count(),
                'time' => $group->first()->created_at->diffForHumans(),
            ])->values()->take(6);

        $attention = IncidentReport::where('status', 'Submitted')->latest('date_submitted')->limit(6)->get()
            ->map(fn ($r) => [
                'id' => $r->code,
                'type' => $r->type,
                'reportedBy' => $r->reported_by,
                'location' => $r->location,
                'priority' => $r->priority,
                'dateSubmitted' => $r->date_submitted?->format('M d, Y'),
            ])->values();

        // Types are saved as "Category - Specific incident": group by the category.
        $byCategory = IncidentReport::pluck('type')
            ->map(fn ($t) => trim(explode(' - ', (string) $t)[0]))
            ->countBy()->sortDesc()->take(6)
            ->map(fn ($count, $name) => ['name' => $name, 'count' => $count])->values();

        $byStatus = collect(['Submitted', 'Under Review', 'Investigating', 'Resolved', 'Dismissed'])
            ->map(fn ($st) => ['name' => $st, 'count' => IncidentReport::where('status', $st)->count()])->values();

        return [
            'focus' => 'guidance',
            'stats' => [
                'toVerify' => IncidentReport::where('status', 'Submitted')->count(),
                'openCases' => IncidentReport::whereIn('status', $open)->count(),
                'unreadReplies' => $unreadReplies,
                'unassigned' => $unassigned,
                'highPriority' => IncidentReport::whereIn('status', $open)->whereIn('priority', ['High', 'Urgent', 'Critical'])->count(),
                'resolvedThisMonth' => IncidentReport::where('status', 'Resolved')
                    ->whereMonth('updated_at', now()->month)->whereYear('updated_at', now()->year)->count(),
            ],
            'needsAttention' => $attention,
            'replies' => $replies,
            'byCategory' => $byCategory,
            'byStatus' => $byStatus,
        ];
    }

    // ------------------------------------------------------------------
    // TMC Treasurer: financial requests, donation drives, cash from departments
    // ------------------------------------------------------------------
    private function treasurerDashboard(): array
    {
        $drives = FinancialRequest::where('status', 'Approved')->orderBy('drive_deadline')->get();
        $driveIds = $drives->pluck('id');

        $cash = fn (string $status) => (float) Donation::whereIn('financial_request_id', $driveIds)
            ->where('status', $status)->sum('amount');

        $driveRows = $drives->map(function ($r) {
            $unreceived = (float) Donation::where('financial_request_id', $r->id)->where('status', '!=', 'Received')->sum('amount');
            $target = (float) ($r->amount_approved ?? $r->amount_requested);

            return [
                'id' => $r->code,
                'beneficiary' => $r->student_name,
                'type' => $r->type,
                'target' => $target,
                'collected' => (float) $r->amount_collected,
                'withDepartments' => $unreceived,
                'deadline' => $r->drive_deadline?->format('M d, Y'),
                'overdue' => $r->drive_deadline ? $r->drive_deadline->lt(today()) : false,
                // Money is all in and something was collected: time to release.
                'ready' => (float) $r->amount_collected > 0 && $unreceived <= 0,
            ];
        })->values();

        $released = FinancialRequest::where('status', 'Assistance Released');

        return [
            'focus' => 'treasurer',
            'stats' => [
                'toVerify' => FinancialRequest::where('status', 'Submitted')->count(),
                'openDrives' => $drives->count(),
                'collected' => (float) $drives->sum('amount_collected'),
                'target' => (float) $drives->sum(fn ($r) => (float) ($r->amount_approved ?? $r->amount_requested)),
                'toReceive' => $cash('Remitted'),
                'pendingRemittances' => Remittance::where('status', 'Pending')->count(),
                'withDepartments' => $cash('Collected'),
                'readyToRelease' => $driveRows->where('ready', true)->count(),
                'releasedCount' => (clone $released)->count(),
                'releasedAmount' => (float) (clone $released)->sum('amount_collected'),
            ],
            'pendingRemittances' => Remittance::with(['financialRequest', 'department'])
                ->where('status', 'Pending')->latest()->limit(6)->get()->map(fn ($r) => $r->summary())->values(),
            'drives' => $driveRows,
            'awaiting' => FinancialRequest::where('status', 'Submitted')->latest('date_submitted')->limit(5)->get()
                ->map(fn ($r) => [
                    'id' => $r->code,
                    'type' => $r->type,
                    'requestedBy' => $r->student_name,
                    'amount' => (float) $r->amount_requested,
                    'dateSubmitted' => $r->date_submitted?->format('M d, Y'),
                ])->values(),
        ];
    }

    // ------------------------------------------------------------------
    // Department Treasurer: cash collected in his/her own department
    // ------------------------------------------------------------------
    private function departmentDashboard($user): array
    {
        $deptId = $user->department_id;
        $mine = fn (string $status) => (float) Donation::where('department_id', $deptId)->where('status', $status)->sum('amount');

        $drives = FinancialRequest::where('status', 'Approved')->orderBy('drive_deadline')->get()
            ->map(function ($r) use ($deptId) {
                $sum = fn (string $status) => (float) Donation::where('financial_request_id', $r->id)
                    ->where('department_id', $deptId)->where('status', $status)->sum('amount');

                return [
                    'id' => $r->code,
                    'beneficiary' => $r->student_name,
                    'type' => $r->type,
                    'target' => (float) ($r->amount_approved ?? $r->amount_requested),
                    'collected' => (float) $r->amount_collected,
                    'deadline' => $r->drive_deadline?->format('M d, Y'),
                    'held' => $sum('Collected'),
                    'pending' => $sum('Remitted'),
                ];
            })->values();

        return [
            'focus' => 'department',
            'department' => $user->department?->name,
            'stats' => [
                'held' => $mine('Collected'),
                'awaiting' => $mine('Remitted'),
                'confirmed' => $mine('Received'),
                'openDrives' => $drives->count(),
            ],
            'drives' => $drives,
            'remittances' => Remittance::with(['financialRequest', 'department'])
                ->where('department_id', $deptId)->latest()->limit(5)->get()->map(fn ($r) => $r->summary())->values(),
        ];
    }
}
