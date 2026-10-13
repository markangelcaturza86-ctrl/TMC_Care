<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IncidentReport extends Model
{
    protected $fillable = [
        'code', 'type', 'reported_by', 'student_id', 'personnel_id', 'location', 'date_submitted',
        'status', 'priority', 'assigned_to', 'description', 'incident_date', 'people_involved',
    ];

    protected $casts = [
        'date_submitted' => 'date',
        'incident_date' => 'datetime',
    ];

    public function getRouteKeyName(): string
    {
        return 'code';
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function personnel()
    {
        return $this->belongsTo(Personnel::class);
    }

    public function documents()
    {
        return Document::where('linked_type', 'incident_report')->where('linked_id', $this->id);
    }

    /**
     * Moves the report to $to, but ONLY if it is currently in one of the $from
     * statuses. Used for the automatic steps of the status flow:
     *
     *   Submitted -> Under Review   (counselor verifies it in Pending Verifications)
     *   Under Review -> Investigating (the assigned officer opens it / messages the reporter)
     *   Resolved / Dismissed        (always set by a person, never automatically)
     *
     * Because of the $from guard it can never skip a step or undo a Resolved case.
     * Returns true when the status actually changed.
     */
    public function autoAdvance(array $from, string $to, ?string $by = null): bool
    {
        $moved = static::where('id', $this->id)
            ->whereIn('status', $from)
            ->update(['status' => $to, 'updated_at' => now()]);

        if (! $moved) {
            return false;
        }

        $this->refresh();

        AuditLog::record($by ?? 'System', "Status automatically changed to {$to}", $this->code);

        if ($this->student_id) {
            Notification::notifyStudent($this->student_id, "Incident report {$this->code} updated", "Status changed to {$to}.", $this->code);
        } elseif ($this->personnel_id) {
            Notification::notifyPersonnel($this->personnel_id, "Incident report {$this->code} updated", "Status changed to {$to}.", $this->code);
        }

        return true;
    }
}
