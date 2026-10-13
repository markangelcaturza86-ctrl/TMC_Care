<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;

/**
 * Usage in routes:  ->middleware('access:incidents')
 * Abilities: incidents, financial, records, users, system, audit, communications
 * (see User::accessMap()).
 */
class EnsureAccess
{
    public function handle(Request $request, Closure $next, string $ability)
    {
        $user = $request->user();

        if (! $user instanceof User || ! ($user->accessMap()[$ability] ?? false)) {
            abort(403, 'Your role does not have access to this section.');
        }

        return $next($request);
    }
}
