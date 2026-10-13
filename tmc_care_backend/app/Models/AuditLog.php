<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $fillable = ['code', 'actor', 'action', 'target', 'ip'];

    public static function record(string $actor, string $action, ?string $target = null, ?string $ip = null): self
    {
        $next = (static::max('id') ?? 0) + 1;
        return static::create([
            'code' => 'LOG-' . $next,
            'actor' => $actor,
            'action' => $action,
            'target' => $target,
            'ip' => $ip ?? request()->ip(),
        ]);
    }
}
