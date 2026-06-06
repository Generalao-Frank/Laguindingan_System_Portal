<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class SettingsController extends Controller
{
    /**
     * Helper: Get current user ID safely using request
     */
    private function getCurrentUserId(Request $request = null)
    {
        try {
            // Try to get from authenticated user via sanctum
            if ($request && $request->user()) {
                return $request->user()->id;
            }
            
            // Try via Auth guard
            if (Auth::guard('sanctum')->check()) {
                return Auth::guard('sanctum')->id();
            }
            
            // Fallback: get first admin user
            $adminUser = User::where('role', 'Admin')->first();
            if ($adminUser) {
                return $adminUser->id;
            }
            
            // Ultimate fallback
            return 1;
        } catch (\Exception $e) {
            Log::warning('Failed to get user ID: ' . $e->getMessage());
            return 1;
        }
    }

    /**
     * Get all settings from cache/config
     */
    public function index(Request $request)
    {
        try {
            // General settings (from cache or defaults)
            $general = [
                'school_name' => Cache::get('setting_school_name', 'Laguindingan Central School'),
                'school_address' => Cache::get('setting_school_address', 'Laguindingan, Misamis Oriental'),
                'school_contact' => Cache::get('setting_school_contact', '09123456789'),
                'school_email' => Cache::get('setting_school_email', 'admin@laguindingan.edu.ph'),
                'principal_name' => Cache::get('setting_principal_name', 'Dr. Maria Santos'),
                'current_school_year' => Cache::get('setting_current_school_year', null),
                'current_quarter' => Cache::get('setting_current_quarter', null),
            ];

            // System settings
            $system = [
                'enable_qr_attendance' => Cache::get('setting_enable_qr_attendance', true),
                'enable_grade_approval' => Cache::get('setting_enable_grade_approval', true),
                'enable_parent_portal' => Cache::get('setting_enable_parent_portal', false),
                'enable_activity_logs' => Cache::get('setting_enable_activity_logs', true),
                'maintenance_mode' => Cache::get('setting_maintenance_mode', false),
                'auto_backup' => Cache::get('setting_auto_backup', true),
                'backup_frequency' => Cache::get('setting_backup_frequency', 'daily'),
                'max_file_size' => Cache::get('setting_max_file_size', 5),
                'allowed_file_types' => Cache::get('setting_allowed_file_types', 'jpg,png,pdf,docx,xlsx'),
                'session_timeout' => Cache::get('setting_session_timeout', 30),
            ];

            return response()->json([
                'success' => true,
                'general' => $general,
                'system' => $system,
            ]);

        } catch (\Exception $e) {
            Log::error('Settings index error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update general settings
     */
    public function updateGeneral(Request $request)
    {
        try {
            $validated = $request->validate([
                'school_name' => 'required|string|max:255',
                'school_address' => 'required|string',
                'school_contact' => 'required|string|max:15',
                'school_email' => 'required|email|max:255',
                'principal_name' => 'required|string|max:255',
                'current_school_year' => 'nullable|exists:school_years,id',
                'current_quarter' => 'nullable|exists:quarters,id',
            ]);

            // Save to cache
            foreach ($validated as $key => $value) {
                Cache::forever('setting_' . $key, $value);
            }

            // Record activity log with safe user ID
            try {
                ActivityLog::create([
                    'user_id' => $this->getCurrentUserId($request),
                    'student_id' => null,
                    'action_type' => 'UPDATE',
                    'table_name' => 'settings',
                    'record_id' => 'general',
                    'old_values' => null,
                    'new_values' => $validated,
                    'description' => 'Updated general school settings',
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Exception $logError) {
                Log::warning('Failed to create activity log: ' . $logError->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'General settings updated successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Update general settings error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update system settings
     */
    public function updateSystem(Request $request)
    {
        try {
            $validated = $request->validate([
                'enable_qr_attendance' => 'boolean',
                'enable_grade_approval' => 'boolean',
                'enable_parent_portal' => 'boolean',
                'enable_activity_logs' => 'boolean',
                'maintenance_mode' => 'boolean',
                'auto_backup' => 'boolean',
                'backup_frequency' => 'in:daily,weekly,monthly',
                'max_file_size' => 'integer|min:1|max:100',
                'allowed_file_types' => 'string',
                'session_timeout' => 'integer|min:5|max:120',
            ]);

            // Save to cache
            foreach ($validated as $key => $value) {
                Cache::forever('setting_' . $key, $value);
            }

            // Record activity log with safe user ID
            try {
                ActivityLog::create([
                    'user_id' => $this->getCurrentUserId($request),
                    'student_id' => null,
                    'action_type' => 'UPDATE',
                    'table_name' => 'settings',
                    'record_id' => 'system',
                    'old_values' => null,
                    'new_values' => $validated,
                    'description' => 'Updated system configuration settings',
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Exception $logError) {
                Log::warning('Failed to create activity log: ' . $logError->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'System settings updated successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Update system settings error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Backup database
     */
    public function backup(Request $request)
    {
        try {
            $databaseName = config('database.connections.mysql.database');
            $username = config('database.connections.mysql.username');
            $password = config('database.connections.mysql.password');
            $host = config('database.connections.mysql.host');
            
            $backupFile = storage_path('app/backups/backup_' . date('Y-m-d_H-i-s') . '.sql');
            
            // Create backup directory if not exists
            $backupDir = storage_path('app/backups');
            if (!file_exists($backupDir)) {
                mkdir($backupDir, 0755, true);
            }
            
            // Build mysqldump command
            $command = sprintf(
                'mysqldump --user=%s --password=%s --host=%s %s > %s',
                escapeshellarg($username),
                escapeshellarg($password),
                escapeshellarg($host),
                escapeshellarg($databaseName),
                escapeshellarg($backupFile)
            );
            
            exec($command, $output, $returnCode);
            
            if ($returnCode === 0 && file_exists($backupFile)) {
                // Record activity log with safe user ID
                try {
                    ActivityLog::create([
                        'user_id' => $this->getCurrentUserId($request),
                        'student_id' => null,
                        'action_type' => 'CREATE',
                        'table_name' => 'database',
                        'record_id' => 'backup',
                        'old_values' => null,
                        'new_values' => ['backup_file' => basename($backupFile)],
                        'description' => 'Created database backup',
                        'ip_address' => $request->ip(),
                    ]);
                } catch (\Exception $logError) {
                    Log::warning('Failed to create activity log: ' . $logError->getMessage());
                }
                
                return response()->download($backupFile)->deleteFileAfterSend(true);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create database backup'
            ], 500);
            
        } catch (\Exception $e) {
            Log::error('Database backup error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to backup database: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clear application cache
     */
    public function clearCache(Request $request)
    {
        try {
            // Clear Laravel caches
            Cache::flush();
            
            // Clear OPcache if available
            if (function_exists('opcache_reset')) {
                opcache_reset();
            }
            
            // Record activity log with safe user ID
            try {
                ActivityLog::create([
                    'user_id' => $this->getCurrentUserId($request),
                    'student_id' => null,
                    'action_type' => 'CREATE',
                    'table_name' => 'system',
                    'record_id' => 'cache',
                    'old_values' => null,
                    'new_values' => null,
                    'description' => 'Cleared system cache',
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Exception $logError) {
                Log::warning('Failed to create activity log: ' . $logError->getMessage());
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Cache cleared successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Clear cache error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to clear cache: ' . $e->getMessage()
            ], 500);
        }
    }
}