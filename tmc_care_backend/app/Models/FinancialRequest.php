<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinancialRequest extends Model
{
    protected $fillable = [
        'code', 'student_id', 'personnel_id', 'student_name', 'program', 'type', 'amount_requested',
        'amount_approved', 'date_submitted', 'status', 'reason',
        'department', 'year_level', 'block_section', 'requester_name', 'relationship',
        'contact_info', 'amount_funded',
        'amount_collected', 'drive_deadline', 'approved_by_id', 'approved_by', 'approved_at',
        'released_by_id', 'released_by', 'released_to', 'released_at', 'drive_announcement_code',
    ];

    protected $casts = [
        'date_submitted' => 'date',
        'amount_requested' => 'decimal:2',
        'amount_approved' => 'decimal:2',
        'amount_funded' => 'decimal:2',
        'amount_collected' => 'decimal:2',
        'drive_deadline' => 'date',
        'approved_at' => 'datetime',
        'released_at' => 'datetime',
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

    public function donations()
    {
        // No orderBy here: sum()/count() on this relation would fail under MySQL's
        // ONLY_FULL_GROUP_BY. Sort where the list is read.
        return $this->hasMany(Donation::class);
    }

    public function documents()
    {
        return Document::where('linked_type', 'financial_request')->where('linked_id', $this->id);
    }
}
