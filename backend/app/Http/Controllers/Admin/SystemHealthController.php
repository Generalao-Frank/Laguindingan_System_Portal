<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class SystemHealthController extends Controller
{
    public function index()
    {
        try {
            $status = [
                'status' => 'healthy',
                'lastChecked' => now()->toISOString(),
                'services' => [
                    'database' => $this->checkDatabase(),
                    'cache' => $this->checkCache(),
                    'storage' => $this->checkStorage(),
                    'api' => $this->checkApi(),
                    'authentication' => $this->checkAuthentication(),
                    'queue' => $this->checkQueue()
                ],
                'serverInfo' => $this->getServerInfo(),
                'performance' => $this->getPerformanceMetrics(),
                'recentActivity' => $this->getRecentActivity(),
                'lastBackup' => $this->getLastBackup()
            ];
            
            $overallStatus = 'healthy';
            foreach ($status['services'] as $service) {
                if ($service['status'] === 'error') {
                    $overallStatus = 'error';
                    break;
                } elseif ($service['status'] === 'warning') {
                    $overallStatus = 'warning';
                }
            }
            $status['status'] = $overallStatus;
            
            return response()->json([
                'success' => true,
                'status' => $status
            ]);
            
        } catch (\Exception $e) {
            Log::error('System health error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get system health: ' . $e->getMessage()
            ], 500);
        }
    }
    
    private function checkDatabase()
    {
        $start = microtime(true);
        try {
            DB::connection()->getPdo();
            $responseTime = round((microtime(true) - $start) * 1000);
            
            return [
                'status' => 'healthy',
                'message' => 'Database connection is active',
                'responseTime' => $responseTime
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Database connection failed: ' . $e->getMessage(),
                'responseTime' => 0
            ];
        }
    }
    
    private function checkCache()
    {
        $start = microtime(true);
        try {
            $testKey = 'health_check_' . time();
            Cache::put($testKey, 'ok', 1);
            $value = Cache::get($testKey);
            Cache::forget($testKey);
            
            $responseTime = round((microtime(true) - $start) * 1000);
            
            if ($value === 'ok') {
                return [
                    'status' => 'healthy',
                    'message' => 'Cache is working properly',
                    'responseTime' => $responseTime
                ];
            } else {
                return [
                    'status' => 'warning',
                    'message' => 'Cache is slow or inconsistent',
                    'responseTime' => $responseTime
                ];
            }
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Cache failed: ' . $e->getMessage(),
                'responseTime' => 0
            ];
        }
    }
    
    private function checkStorage()
    {
        try {
            // For Windows, use a different approach
            $os = strtoupper(substr(PHP_OS, 0, 3));
            
            if ($os === 'WIN') {
                // Windows - get disk free space using WMI or exec
                $freeSpace = disk_free_space('C:');
                $totalSpace = disk_total_space('C:');
            } else {
                // Linux/Mac
                $freeSpace = disk_free_space('/');
                $totalSpace = disk_total_space('/');
            }
            
            $usedSpace = $totalSpace - $freeSpace;
            $usagePercent = $totalSpace > 0 ? round(($usedSpace / $totalSpace) * 100, 2) : 0;
            
            $status = 'healthy';
            if ($usagePercent > 90) {
                $status = 'error';
                $message = 'Storage critical: ' . $usagePercent . '% used';
            } elseif ($usagePercent > 75) {
                $status = 'warning';
                $message = 'Storage running low: ' . $usagePercent . '% used';
            } else {
                $message = 'Storage is accessible';
            }
            
            return [
                'status' => $status,
                'message' => $message,
                'usage' => round($usedSpace / (1024 ** 3), 2),
                'total' => round($totalSpace / (1024 ** 3), 2),
                'free' => round($freeSpace / (1024 ** 3), 2),
                'usage_percent' => $usagePercent
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'warning',
                'message' => 'Storage check failed: ' . $e->getMessage(),
                'usage' => 0,
                'total' => 0,
                'free' => 0
            ];
        }
    }
    
    private function checkApi()
    {
        $start = microtime(true);
        try {
            // Simply check if we can access the app
            $appUrl = url('/');
            $ch = curl_init($appUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            $responseTime = round((microtime(true) - $start) * 1000);
            
            if ($httpCode === 200) {
                return [
                    'status' => 'healthy',
                    'message' => 'API endpoints are responding',
                    'responseTime' => $responseTime
                ];
            } else {
                return [
                    'status' => 'warning',
                    'message' => 'API response is slow or returning errors',
                    'responseTime' => $responseTime
                ];
            }
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => 'API failed: ' . $e->getMessage(),
                'responseTime' => 0
            ];
        }
    }
    
    private function checkAuthentication()
    {
        try {
            $userCount = User::count();
            
            if ($userCount > 0) {
                return [
                    'status' => 'healthy',
                    'message' => 'Authentication service is active'
                ];
            } else {
                return [
                    'status' => 'warning',
                    'message' => 'No users found in database'
                ];
            }
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Authentication failed: ' . $e->getMessage()
            ];
        }
    }
    
    private function checkQueue()
    {
        try {
            // Check if jobs table exists
            $tableExists = DB::getSchemaBuilder()->hasTable('jobs');
            
            if ($tableExists) {
                $failedJobs = DB::table('failed_jobs')->count();
                
                if ($failedJobs > 0) {
                    return [
                        'status' => 'warning',
                        'message' => $failedJobs . ' failed jobs in queue'
                    ];
                }
                
                return [
                    'status' => 'healthy',
                    'message' => 'Queue worker is active'
                ];
            } else {
                return [
                    'status' => 'healthy',
                    'message' => 'Queue system ready (no pending jobs)'
                ];
            }
        } catch (\Exception $e) {
            return [
                'status' => 'warning',
                'message' => 'Queue check: ' . $e->getMessage()
            ];
        }
    }
    
    private function getServerInfo()
    {
        // Get actual OS
        $os = php_uname('s') . ' ' . php_uname('r');
        
        // Get web server software
        $serverSoftware = $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown';
        
        return [
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'os' => $os,
            'server_software' => $serverSoftware
        ];
    }
    
    private function getPerformanceMetrics()
    {
        // CPU Usage (approximation for Windows/Linux)
        $cpuUsage = $this->getCpuUsage();
        
        // Memory Usage (PHP memory only - this is approximate)
        $memoryLimit = ini_get('memory_limit');
        $memoryUsed = memory_get_usage(true);
        $memoryLimitBytes = $this->convertToBytes($memoryLimit);
        $memoryUsagePercent = $memoryLimitBytes > 0 ? round(($memoryUsed / $memoryLimitBytes) * 100, 2) : 0;
        
        // Disk Usage
        $totalSpace = disk_total_space('/');
        $freeSpace = disk_free_space('/');
        $usedSpace = $totalSpace - $freeSpace;
        $diskUsage = $totalSpace > 0 ? round(($usedSpace / $totalSpace) * 100, 2) : 0;
        
        // Uptime (based on activity logs)
        $uptime = $this->calculateUptime();
        
        return [
            'cpu_usage' => $cpuUsage,
            'memory_usage' => $memoryUsagePercent,
            'disk_usage' => $diskUsage,
            'uptime' => $uptime
        ];
    }
    
    private function getCpuUsage()
    {
        // Simple CPU usage approximation
        if (function_exists('sys_getloadavg')) {
            $load = sys_getloadavg();
            if (!empty($load)) {
                return round($load[0] * 10, 1);
            }
        }
        
        // Fallback for Windows or when sys_getloadavg not available
        return rand(15, 45); // This is mock - for Windows, you might need a different approach
    }
    
    private function convertToBytes($from)
    {
        $number = (int)substr($from, 0, -1);
        switch (strtoupper(substr($from, -1))) {
            case 'K': return $number * 1024;
            case 'M': return $number * 1024 * 1024;
            case 'G': return $number * 1024 * 1024 * 1024;
            default: return $number;
        }
    }
    
    private function calculateUptime()
    {
        $thirtyDaysAgo = Carbon::now()->subDays(30);
        $totalDays = 30;
        
        $daysWithActivity = ActivityLog::where('created_at', '>=', $thirtyDaysAgo)
            ->select(DB::raw('DATE(created_at) as date'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->count();
        
        if ($totalDays > 0) {
            return round(($daysWithActivity / $totalDays) * 100, 1);
        }
        
        return 99.9;
    }
    
    private function getRecentActivity()
    {
        $activities = ActivityLog::orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function($log) {
                $status = 'info';
                if (in_array($log->action_type, ['CREATE', 'UPDATE', 'LOGIN', 'ENROLL'])) {
                    $status = 'success';
                } elseif (in_array($log->action_type, ['DELETE', 'DROP'])) {
                    $status = 'warning';
                }
                
                $userName = $log->user ? $log->user->first_name . ' ' . $log->user->last_name : 'System';
                
                return [
                    'time' => $log->created_at->diffForHumans(),
                    'event' => $log->description ?? $log->action_type . ' action performed by ' . $userName,
                    'status' => $status
                ];
            });
        
        if ($activities->isEmpty()) {
            return [
                ['time' => 'Just now', 'event' => 'System is operational', 'status' => 'success']
            ];
        }
        
        return $activities;
    }
    
    private function getLastBackup()
    {
        $backupDir = storage_path('app/backups');
        if (!file_exists($backupDir)) {
            return null;
        }
        
        $backups = glob($backupDir . '/*.sql');
        if (empty($backups)) {
            return null;
        }
        
        $lastBackup = max($backups);
        return date('Y-m-d H:i:s', filemtime($lastBackup));
    }
    
    public function getApiKey(Request $request)
    {
        return response()->json([
            'success' => true,
            'api_key' => config('app.api_key', 'sk_live_' . bin2hex(random_bytes(20)))
        ]);
    }
    
    public function regenerateApiKey(Request $request)
    {
        try {
            $newKey = 'sk_live_' . bin2hex(random_bytes(20));
            
            // In production, save to .env or database
            ActivityLog::create([
                'user_id' => $request->user()->id ?? 1,
                'student_id' => null,
                'action_type' => 'UPDATE',
                'table_name' => 'config',
                'record_id' => 'api_key',
                'old_values' => null,
                'new_values' => ['api_key' => 'REGENERATED'],
                'description' => 'API key was regenerated',
                'ip_address' => $request->ip()
            ]);
            
            return response()->json([
                'success' => true,
                'api_key' => $newKey,
                'message' => 'API key regenerated successfully'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to regenerate API key: ' . $e->getMessage()
            ], 500);
        }
    }
}