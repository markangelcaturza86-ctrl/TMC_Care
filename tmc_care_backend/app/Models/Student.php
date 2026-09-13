<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;

class Student extends Model
{
    use HasApiTokens;

    protected $fillable = [
        'student_no', 'username', 'name', 'email', 'password', 'program', 'year', 'status', 'date_joined', 'phone', 'address',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'date_joined' => 'date',
        'password' => 'hashed',
    ];


    public function getRouteKeyName(): string
    {
        return 'student_no';
    }

    public function incidentReports()
    {
        return $this->hasMany(IncidentReport::class);
    }

    public function financialRequests()
    {
        return $this->hasMany(FinancialRequest::class);
    }
}
