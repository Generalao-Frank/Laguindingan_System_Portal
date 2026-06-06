<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ArchiveOldAuditLogs extends Command
{
    protected $signature = 'logs:archive {months=12}';
    protected $description = 'Archive audit logs older than specified months';

    public function handle()
    {
        $months = $this->argument('months');
        $cutoffDate = Carbon::now()->subMonths($months);
        
        $this->info("Archiving audit logs older than {$months} months...");
        
        // Get old logs
        $oldLogs = ActivityLog::where('created_at', '<', $cutoffDate)->get();
        
        if ($oldLogs->isEmpty()) {
            $this->info("No logs to archive.");
            return;
        }
        
        // Insert to archive table
        DB::table('activity_logs_archive')->insert(
            $oldLogs->map(function($log) {
                return [
                    'id' => $log->id,
                    'user_id' => $log->user_id,
                    'student_id' => $log->student_id,
                    'action_type' => $log->action_type,
                    'table_name' => $log->table_name,
                    'record_id' => $log->record_id,
                    'old_values' => $log->old_values,
                    'new_values' => $log->new_values,
                    'description' => $log->description,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at,
                    'updated_at' => $log->updated_at,
                    'archived_at' => now(),
                ];
            })->toArray()
        );
        
        // Delete from main table
        $deleted = ActivityLog::where('created_at', '<', $cutoffDate)->delete();
        
        $this->info("Archived and deleted {$deleted} logs.");
    }
}