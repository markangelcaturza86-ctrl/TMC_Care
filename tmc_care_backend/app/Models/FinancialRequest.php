<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinancialRequest extends Model
{
    protected $fillable = [
        'code', 'student_id', 'personnel_id', 'student_name', 'program', 'type', 'amount_requested',
        'amount_approved', 'date_submitted', 'status', 'reason', 'details',
    ];

    protected $casts = [
        'date_submitted' => 'date',
        'amount_requested' => 'decimal:2',
        'amount_approved' => 'decimal:2',
        'details' => 'array',
    ];

    // The admin panel refers to requests by their code (e.g. FR-2026-0001), not the numeric id.
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
        return Document::where('linked_type', 'financial_request')->where('linked_id', $this->id);
    }
}
