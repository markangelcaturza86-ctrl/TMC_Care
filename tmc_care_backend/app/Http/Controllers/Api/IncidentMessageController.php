<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\IncidentReport;
use App\Models\IncidentReportMessage;
use App\Models\Notification;
use App\Models\Personnel;
use App\Models\Student;
use Illuminate\Http\Request;

/**
 * Two-way conversation between the admin handling an incident report and the
 * student / staff member who submitted it.
 *
 *   Admin panel : GET/POST /incident-reports/{code}/messages
 *   Mobile app  : GET/POST /my/incident-reports/{code}/messages
 */
class IncidentMessageController extends Controller
{
    // ------------------------------------------------------------ admin side

    public function adminIndex(IncidentReport $incident_report)
    {
        // The admin has now seen everything the reporter wrote.
        IncidentReportMessage::where('incident_report_id', $incident_report->id)
            ->where('sender', 'reporter')->where('read', false)->update(['read' => true]);

        return response()->json($this->thread($incident_report));
    }

    public function adminStore(Request $request, IncidentReport $incident_report)
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:1000']]);

        if (! $incident_report->student_id && ! $incident_report->personnel_id) {
            return response()->json([
                'message' => 'This report was submitted anonymously, so there is nobody to message.',
            ], 422);
        }

        $admin = $request->user();

        $message = IncidentReportMessage::create([
            'incident_report_id' => $incident_report->id,
            'sender' => 'admin',
            'sender_name' => $admin->name ?? 'Admin',
            'body' => $data['body'],
        ]);

        $title = "Question about report {$incident_report->code}";
        $preview = mb_strimwidth($data['body'], 0, 200, '…');

        if ($incident_report->student_id) {
            Notification::notifyStudent($incident_report->student_id, $title, $preview, $incident_report->code);
        } else {
            Notification::notifyPersonnel($incident_report->personnel_id, $title, $preview, $incident_report->code);
        }

        AuditLog::record($admin->name ?? 'Admin', "Sent a message about {$incident_report->code}", $incident_report->code);

        // Reaching out to the reporter means the case is being investigated.
        $incident_report->autoAdvance(['Under Review'], 'Investigating', $admin->name ?? 'Admin');

        return response()->json($this->format($message), 201);
    }

    // ----------------------------------------------------------- mobile side

    public function mineIndex(Request $request, string $code)
    {
        $report = $this->ownReport($request, $code);

        IncidentReportMessage::where('incident_report_id', $report->id)
            ->where('sender', 'admin')->where('read', false)->update(['read' => true]);

        return response()->json($this->thread($report));
    }

    public function mineStore(Request $request, string $code)
    {
        $report = $this->ownReport($request, $code);
        $data = $request->validate(['body' => ['required', 'string', 'max:1000']]);

        $message = IncidentReportMessage::create([
            'incident_report_id' => $report->id,
            'sender' => 'reporter',
            'sender_name' => $request->user()->name,
            'body' => $data['body'],
        ]);

        return response()->json($this->format($message), 201);
    }

    // --------------------------------------------------------------- helpers

    private function ownReport(Request $request, string $code): IncidentReport
    {
        $user = $request->user();
        $report = IncidentReport::where('code', $code)->firstOrFail();

        $owns = ($user instanceof Student && $report->student_id === $user->id)
            || ($user instanceof Personnel && $report->personnel_id === $user->id);

        abort_unless($owns, 403, 'You can only open the messages of your own reports.');

        return $report;
    }

    private function thread(IncidentReport $report): array
    {
        return IncidentReportMessage::where('incident_report_id', $report->id)
            ->orderBy('id')->get()
            ->map(fn ($m) => $this->format($m))->values()->all();
    }

    private function format(IncidentReportMessage $m): array
    {
        return [
            'id' => $m->id,
            'sender' => $m->sender,          // 'admin' | 'reporter'
            'senderName' => $m->sender_name,
            'body' => $m->body,
            'createdAt' => $m->created_at?->toIso8601String(),
            'time' => $m->created_at?->format('M d, g:i A'),
        ];
    }
}
