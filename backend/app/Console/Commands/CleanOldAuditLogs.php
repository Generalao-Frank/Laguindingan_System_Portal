<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use Illuminate\Console\Command;
use Carbon\Carbon;

class CleanOldAuditLogs extends Command
{
    protected $signature = 'logs:clean {days=90}';
    protected $description = 'Delete audit logs older than specified days';

    public function handle()
    {
        $days = $this->argument('days');
        $cutoffDate = Carbon::now()->subDays($days);
        
        $deleted = ActivityLog::where('created_at', '<', $cutoffDate)->delete();
        
        $this->info("Deleted {$deleted} audit logs older than {$days} days.");
    }
}