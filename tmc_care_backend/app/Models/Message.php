<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = ['code', 'from_name', 'subject', 'student_id', 'unread'];

    protected $casts = [
        'unread' => 'boolean',
    ];

    public function replies()
    {
        return $this->hasMany(MessageReply::class)->orderBy('created_at');
    }
}
