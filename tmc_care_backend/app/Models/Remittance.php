<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Remittance extends Model
{
    protected $fillable = [
        'code', 'financial_request_id', 'department_id', 'amount', 'status',
        'submitted_by_id', 'submitted_by', 'received_by_id', 'received_by', 'received_at', 'note',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'received_at' => 'datetime',
    ];

    public function financialRequest()
    {
        return $this->belongsTo(FinancialRequest::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function donations()
    {
        return $this->hasMany(Donation::class);
    }

    public function summary(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'requestCode' => $this->financialRequest?->code,
            'beneficiary' => $this->financialRequest?->student_name,
            'department' => $this->department?->name,
            'amount' => (float) $this->amount,
            'status' => $this->status,
            'submittedBy' => $this->submitted_by,
            'submittedAt' => $this->created_at?->format('M d, Y g:i A'),
            'receivedBy' => $this->received_by,
            'receivedAt' => $this->received_at?->format('M d, Y g:i A'),
            'note' => $this->note,
        ];
    }
}
