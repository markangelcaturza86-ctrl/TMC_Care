<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IncidentReport extends Model
{
    protected $fillable = [
        'code', 'type', 'reported_by', 'student_id', 'location', 'date_submitted',
        'status', 'priority', 'assigned_to', 'description',
    ];

    protected $casts = [
        'date_submitted' => 'date',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function documents()
    {
        return Document::where('linked_type', 'incident_report')->where('linked_id', $this->id);
    }
}
