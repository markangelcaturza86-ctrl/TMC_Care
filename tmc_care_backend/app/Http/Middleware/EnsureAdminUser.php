<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;

class EnsureAdminUser
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->user() instanceof User) {
            abort(403, 'This endpoint is for admin accounts only.');
        }

        return $next($request);
    }
}
