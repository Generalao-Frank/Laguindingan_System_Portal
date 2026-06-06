<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes
|--------------------------------------------------------------------------
|
| This file is where you may define all of your Closure based console
| commands. Each Closure is bound to a command instance allowing a
| simple approach to interacting with each command's IO methods.
|
*/

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Auto-update quarter status based on current date
// Runs every hour to check and update active quarters
Schedule::command('quarters:update-status')->hourly();

// Optional: Also run at midnight to ensure correct quarter for the new day
Schedule::command('quarters:update-status')->dailyAt('00:00');

// Delete logs older than 90 days every day at 2 AM
Schedule::command('logs:clean 90')->dailyAt('02:00');

// For testing purposes only - run every minute (uncomment if needed for testing)
// Schedule::command('quarters:update-status')->everyMinute();