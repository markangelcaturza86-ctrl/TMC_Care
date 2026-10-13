<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use App\Models\IncidentReportMessage;
use App\Models\Remittance;
use Illuminate\Http\Request;

/**
 * Feed for the bell icon in the admin panel: new reports / requests coming in
 * from the mobile app and replies from reporters. Each account only sees what
 * its role may manage (Guidance Counselor -> incidents, Treasurer -> financial).
 */
class AdminNotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $items = collect();

        if ($user->canManageIncidents()) {
            $items = $items->concat(
                IncidentReport::latest()->limit(20)->get()->map(fn ($r) => [
                    'id' => 'incident-' . $r->id,
                    'title' => 'New incident report',
                    'detail' => "{$r->code} · {$r->type} · by {$r->reported_by}",
                    'color' => 'orange',
                    'link' => '/requests/incidents',
                    'at' => $r->created_at,
                ])
            );

            $items = $items->concat(
                IncidentReportMessage::with('report')->where('sender', 'reporter')->latest()->limit(20)->get()
                    ->filter(fn ($m) => $m->report)
                    ->map(fn ($m) => [
                        'id' => 'reply-' . $m->id,
                        'title' => "{$m->sender_name} replied about {$m->report->code}",
                        'detail' => mb_strimwidth($m->body, 0, 80, '…'),
                        'color' => 'blue',
                        'link' => '/requests/incidents',
                        'at' => $m->created_at,
                    ])
            );

            $items = $items->concat(
                Document::where('linked_type', 'incident_report')->latest()->limit(10)->get()->map(fn ($d) => [
                    'id' => 'doc-' . $d->id,
                    'title' => 'New attachment uploaded',
                    'detail' => "{$d->name} · {$d->linked_code}",
                    'color' => 'purple',
                    'link' => '/verifications/documents',
                    'at' => $d->uploaded_at ?? $d->created_at,
                ])
            );
        }

        if ($user->canManageFinancial()) {
            $items = $items->concat(
                FinancialRequest::latest()->limit(20)->get()->map(fn ($r) => [
                    'id' => 'financial-' . $r->id,
                    'title' => 'New financial assistance request',
                    'detail' => "{$r->code} · {$r->type} · {$r->student_name}",
                    'color' => 'green',
                    'link' => '/requests/financial',
                    'at' => $r->created_at,
                ])
            );

            $items = $items->concat(
                Document::where('linked_type', 'financial_request')->latest()->limit(10)->get()->map(fn ($d) => [
                    'id' => 'doc-' . $d->id,
                    'title' => 'New document uploaded',
                    'detail' => "{$d->name} · {$d->linked_code}",
                    'color' => 'purple',
                    'link' => '/verifications/documents',
                    'at' => $d->uploaded_at ?? $d->created_at,
                ])
            );
        }

        if ($user->canManageFinancial()) {
            // Cash handed over by department treasurers that waits for confirmation.
            $items = $items->concat(
                Remittance::with(['financialRequest', 'department'])->latest()->limit(15)->get()->map(fn ($r) => [
                    'id' => 'remit-' . $r->id,
                    'title' => $r->status === 'Pending'
                        ? "{$r->department?->name} handed over PHP " . number_format((float) $r->amount, 2)
                        : "Remittance {$r->code} {$r->status}",
                    'detail' => "{$r->code} · {$r->financialRequest?->code} · " . ($r->status === 'Pending' ? 'waiting for you to receive it' : $r->status),
                    'color' => 'green',
                    'link' => '/requests/financial',
                    'at' => $r->created_at,
                ])
            );
        }

        if ($user->isDepartmentTreasurer()) {
            $items = $items->concat(
                FinancialRequest::where('status', 'Approved')->latest('approved_at')->limit(10)->get()->map(fn ($r) => [
                    'id' => 'drive-' . $r->id,
                    'title' => 'Donation drive open',
                    'detail' => "{$r->code} · {$r->student_name} · {$r->type}",
                    'color' => 'orange',
                    'link' => '/collections',
                    'at' => $r->approved_at ?? $r->created_at,
                ])
            );

            $items = $items->concat(
                Remittance::with('financialRequest')->where('department_id', $user->department_id)
                    ->whereIn('status', ['Received', 'Rejected'])->latest('received_at')->limit(15)->get()
                    ->map(fn ($r) => [
                        'id' => 'myremit-' . $r->id,
                        'title' => "Your remittance {$r->code} was {$r->status}",
                        'detail' => $r->status === 'Rejected' && $r->note ? $r->note : "{$r->financialRequest?->code} · PHP " . number_format((float) $r->amount, 2),
                        'color' => $r->status === 'Received' ? 'green' : 'orange',
                        'link' => '/collections',
                        'at' => $r->received_at ?? $r->updated_at,
                    ])
            );
        }

        // Settings > Notification Preferences: documents follow "Pending
        // verifications", everything else follows "New requests".
        $wantsRequests = $user->wants('newRequests');
        $wantsVerifications = $user->wants('verifications');
        $items = $items->filter(fn ($i) => str_starts_with($i['id'], 'doc-') ? $wantsVerifications : $wantsRequests);

        return response()->json(
            $items->filter(fn ($i) => $i['at'])
                ->sortByDesc(fn ($i) => $i['at']->getTimestamp())
                ->take(30)->values()
                ->map(fn ($i) => [
                    'id' => $i['id'],
                    'title' => $i['title'],
                    'detail' => $i['detail'],
                    'color' => $i['color'],
                    'link' => $i['link'],
                    'time' => $i['at']->diffForHumans(),
                    'createdAt' => $i['at']->toIso8601String(),
                ])
        );
    }
}
