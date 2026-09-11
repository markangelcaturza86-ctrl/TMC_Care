<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $q = AuditLog::query();
        if ($search = $request->query('search')) {
            $q->where(function ($qq) use ($search) {
                $qq->where('actor', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('target', 'like', "%{$search}%");
            });
        }
        return response()->json(
            $q->latest()->limit(200)->get()->map(fn ($l) => [
                'id' => $l->code, 'actor' => $l->actor, 'action' => $l->action,
                'target' => $l->target, 'date' => $l->created_at->format('M d, Y g:i A'), 'ip' => $l->ip,
            ])
        );
    }
}
