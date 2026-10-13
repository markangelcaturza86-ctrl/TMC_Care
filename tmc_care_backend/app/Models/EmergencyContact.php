<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmergencyContact extends Model
{
    protected $fillable = ['name', 'category', 'phone', 'description', 'sort_order'];
}
