<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Settings > "Weekly digest": every Monday morning.
Schedule::command('tmc:weekly-digest')->weeklyOn(1, '08:00');
