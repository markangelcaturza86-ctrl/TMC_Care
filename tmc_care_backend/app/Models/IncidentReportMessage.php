<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IncidentReportMessage extends Model
{
    protected $fillable = ['incident_report_id', 'sender', 'sender_name', 'body', 'read'];

    protected $casts = [
        'read' => 'boolean',
    ];

    public function report()
    {
        return $this->belongsTo(IncidentReport::class, 'incident_report_id');
    }
}
