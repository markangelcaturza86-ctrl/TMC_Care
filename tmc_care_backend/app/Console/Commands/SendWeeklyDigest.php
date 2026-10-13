<?php

namespace App\Console\Commands;

use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendWeeklyDigest extends Command
{
    protected $signature = 'tmc:weekly-digest';
    protected $description = 'E-mail the weekly activity summary to admins who turned on "Weekly digest".';

    public function handle(): int
    {
        $since = now()->subWeek();
        $sent = 0;

        foreach (User::with('role')->where('status', 'Active')->get() as $user) {
            if (! $user->wants('email') || ! $user->wants('digest')) {
                continue;
            }

            $lines = ["Hello {$user->name},", '', 'Your TMC-Care summary for the past 7 days:', ''];

            if ($user->canManageIncidents()) {
                $lines[] = '- New incident reports: ' . IncidentReport::where('created_at', '>=', $since)->count();
                $lines[] = '- Incident reports waiting for verification: ' . IncidentReport::where('status', 'Submitted')->count();
            }
            if ($user->canManageFinancial()) {
                $lines[] = '- New financial assistance requests: ' . FinancialRequest::where('created_at', '>=', $since)->count();
                $lines[] = '- Financial requests waiting for verification: ' . FinancialRequest::where('status', 'Submitted')->count();
            }

            $body = implode("\n", $lines) . "\n\nYou can turn this email off in Settings > Notification Preferences.";

            try {
                Mail::raw($body, fn ($m) => $m->to($user->email, $user->name)->subject('TMC-Care weekly digest'));
                $sent++;
            } catch (\Throwable $e) {
                $this->warn("Could not email {$user->email}: {$e->getMessage()}");
            }
        }

        $this->info("Weekly digest sent to {$sent} account(s).");

        return self::SUCCESS;
    }
}
