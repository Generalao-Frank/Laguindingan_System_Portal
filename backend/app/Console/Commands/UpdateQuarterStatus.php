<?php

namespace App\Console\Commands;

use App\Models\Quarter;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class UpdateQuarterStatus extends Command
{
    protected $signature = 'quarters:update-status';
    protected $description = 'Auto-update quarter active status based on current date';

    public function handle()
    {
        $today = Carbon::today();
        $this->info("Checking quarters for date: " . $today->toDateString());

        // Get all quarters
        $quarters = Quarter::with('schoolYear')->get();

        $updatedCount = 0;
        $activeQuarterFound = false;

        foreach ($quarters as $quarter) {
            $startDate = Carbon::parse($quarter->start_date);
            $endDate = Carbon::parse($quarter->end_date);

            // Check if today is within this quarter's date range
            $shouldBeActive = $today->between($startDate, $endDate);

            if ($shouldBeActive && !$quarter->is_active) {
                // Activate this quarter
                $quarter->is_active = true;
                $quarter->save();
                $updatedCount++;
                $activeQuarterFound = true;
                $this->info("✓ Activated: {$quarter->name} ({$quarter->start_date} to {$quarter->end_date})");
                
                // Log the activation
                Log::info("Quarter auto-activated: {$quarter->name} for school year {$quarter->schoolYear->year_start}-{$quarter->schoolYear->year_end}");
                
            } elseif (!$shouldBeActive && $quarter->is_active) {
                // Deactivate this quarter
                $quarter->is_active = false;
                $quarter->save();
                $updatedCount++;
                $this->info("✗ Deactivated: {$quarter->name} (outside date range)");
                
                // Log the deactivation
                Log::info("Quarter auto-deactivated: {$quarter->name} for school year {$quarter->schoolYear->year_start}-{$quarter->schoolYear->year_end}");
            }
        }

        // If no quarter should be active based on dates, deactivate all
        if (!$activeQuarterFound) {
            Quarter::where('is_active', true)->update(['is_active' => false]);
            $this->warn("⚠ No active quarter for today's date. All quarters deactivated.");
        }

        $this->info("Completed. Updated {$updatedCount} quarter(s).");
        
        return Command::SUCCESS;
    }
}