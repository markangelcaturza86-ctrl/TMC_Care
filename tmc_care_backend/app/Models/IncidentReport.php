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
}
