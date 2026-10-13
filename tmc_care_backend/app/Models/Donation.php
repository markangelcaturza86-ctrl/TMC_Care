<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Donation extends Model
{
    protected $fillable = ['financial_request_id', 'donor_name', 'amount', 'received_on', 'recorded_by', 'notes',
        'department_id', 'status', 'remittance_id'];

    protected $casts = [
        'amount' => 'decimal:2',
        'received_on' => 'date',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function financialRequest()
    {
        return $this->belongsTo(FinancialRequest::class);
    }
}
