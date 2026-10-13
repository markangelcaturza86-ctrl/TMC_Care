<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * E-mails admin accounts about new activity, honouring each account's
 * Settings > Notification Preferences ("Email notifications" must be on, plus
 * the specific toggle for the kind of alert).
 */
class AdminAlerts
{
    /**
     * @param string $kind 'incident' | 'financial' | 'document'
     */
    public static function send(string $kind, string $subject, string $body): void
    {
        $toggle = $kind === 'document' ? 'verifications' : 'newRequests';

        User::with('role')->where('status', 'Active')->get()
            ->filter(fn (User $u) => $u->wants('email') && $u->wants($toggle) && self::relevant($u, $kind))
            ->each(function (User $u) use ($subject, $body) {
                try {
                    Mail::raw($body, fn ($m) => $m->to($u->email, $u->name)->subject($subject));
                } catch (\Throwable $e) {
                    // A mail problem must never break the mobile app's request.
                    Log::warning('Admin alert e-mail failed: ' . $e->getMessage());
                }
            });
    }

    private static function relevant(User $u, string $kind): bool
    {
        return match ($kind) {
            'incident' => $u->canManageIncidents(),
            'financial' => $u->canManageFinancial(),
            default => $u->canManageIncidents() || $u->canManageFinancial(),
        };
    }
}
