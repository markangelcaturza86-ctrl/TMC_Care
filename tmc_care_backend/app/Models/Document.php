<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $fillable = [
        'code', 'name', 'owner', 'linked_type', 'linked_id', 'linked_code',
        'file_path', 'size_bytes', 'status', 'uploaded_at',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
    ];

    // The admin panel refers to documents by their code (e.g. DOC-0007).
    public function getRouteKeyName(): string
    {
        return 'code';
    }
}
