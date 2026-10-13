<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = ['student_id', 'personnel_id', 'title', 'body', 'linked_code', 'read'];

    protected $casts = [
        'read' => 'boolean',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function personnel()
    {
        return $this->belongsTo(Personnel::class);
    }

    public static function notifyStudent(int $studentId, string $title, ?string $body = null, ?string $linkedCode = null): self
    {
        return static::create(['student_id' => $studentId, 'title' => $title, 'body' => $body, 'linked_code' => $linkedCode]);
    }

    public static function notifyPersonnel(int $personnelId, string $title, ?string $body = null, ?string $linkedCode = null): self
    {
        return static::create(['personnel_id' => $personnelId, 'title' => $title, 'body' => $body, 'linked_code' => $linkedCode]);
    }
}
