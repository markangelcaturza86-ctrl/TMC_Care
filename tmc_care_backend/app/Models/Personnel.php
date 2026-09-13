<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;

class Personnel extends Model
{
    use HasApiTokens;

    protected $table = 'personnel';

    protected $fillable = [
        'id_number', 'name', 'address', 'email', 'phone',
        'username', 'password', 'staff_type', 'department',
        'status', 'date_joined',
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
        return 'id_number';
    }
}
