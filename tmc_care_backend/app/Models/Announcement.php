<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $fillable = ['code', 'title', 'audience', 'posted_by', 'pinned'];

    protected $casts = [
        'pinned' => 'boolean',
    ];
}
