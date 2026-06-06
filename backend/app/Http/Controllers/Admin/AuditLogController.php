<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AuditLogController extends Controller
{
    /**
     * Format date to show only YYYY-MM-DD (no time)
     */
    private function formatDateOnly($date)
    {
        if (!$date) return null;
        try {
            return Carbon::parse($date)->format('Y-m-d');
        } catch (\Exception $e) {
            return $date;
        }
    }

    /**
     * Format datetime to show YYYY-MM-DD HH:MM:SS
     */
    private function formatDateTime($date)
    {
        if (!$date) return null;
        try {
            return Carbon::parse($date)->format('Y-m-d H:i:s');
        } catch (\Exception $e) {
            return $date;
        }
    }

    /**
     * Format values to clean up date fields (date only, no time)
     */
    private function formatValues($values)
    {
        if (!$values) return null;
        
        $formatted = [];
        foreach ($values as $key => $value) {
            // Check if it's a date field (ends with _date) or contains date pattern
            if (str_ends_with($key, '_date') || (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}T/', $value))) {
                $formatted[$key] = $this->formatDateOnly($value);
            } else {
                $formatted[$key] = $value;
            }
        }
        return $formatted;
    }

    /**
     * Get all audit logs with filters
     */
    public function index(Request $request)
    {
        try {
            $query = ActivityLog::with(['user', 'student.user'])
                ->orderBy('created_at', 'desc');

            // Filter by action type
            if ($request->has('action_type') && $request->action_type && $request->action_type !== 'all') {
                $query->where('action_type', $request->action_type);
            }

            // Filter by user
            if ($request->has('user_id') && $request->user_id) {
                $query->where('user_id', $request->user_id);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->start_date) {
                $query->whereDate('created_at', '>=', $request->start_date);
            }
            if ($request->has('end_date') && $request->end_date) {
                $query->whereDate('created_at', '<=', $request->end_date);
            }

            // Filter by table name
            if ($request->has('table_name') && $request->table_name) {
                $query->where('table_name', $request->table_name);
            }

            $logs = $query->get();

            // Format logs for frontend
            $formattedLogs = $logs->map(function($log) {
                return [
                    'id' => $log->id,
                    'user_id' => $log->user_id,
                    'user_name' => $log->user ? $log->user->first_name . ' ' . $log->user->last_name : 'System',
                    'student_id' => $log->student_id,
                    'student_name' => $log->student && $log->student->user 
                        ? $log->student->user->last_name . ', ' . $log->student->user->first_name 
                        : null,
                    'action_type' => $log->action_type,
                    'action_label' => $this->getActionLabel($log->action_type),
                    'table_name' => $log->table_name,
                    'record_id' => $log->record_id,
                    'old_values' => $this->formatValues($log->old_values),
                    'new_values' => $this->formatValues($log->new_values),
                    'description' => $log->description,
                    'ip_address' => $log->ip_address ?? 'N/A',
                    'created_at' => $this->formatDateTime($log->created_at),
                ];
            });

            // Get statistics
            $stats = [
                'totalLogs' => $logs->count(),
                'byActionType' => $logs->groupBy('action_type')->map->count(),
                'recentActivity' => $logs->where('created_at', '>=', now()->subDays(7))->count(),
                'uniqueUsers' => $logs->unique('user_id')->count(),
            ];

            return response()->json([
                'success' => true,
                'logs' => $formattedLogs,
                'stats' => $stats,
            ]);

        } catch (\Exception $e) {
            Log::error('Audit log error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load audit logs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get audit logs for a specific user (teacher)
     */
    public function userLogs(Request $request, $userId)
    {
        try {
            $query = ActivityLog::where('user_id', $userId)
                ->with(['user', 'student.user'])
                ->orderBy('created_at', 'desc');

            // Filter by date range
            if ($request->has('start_date') && $request->start_date) {
                $query->whereDate('created_at', '>=', $request->start_date);
            }
            if ($request->has('end_date') && $request->end_date) {
                $query->whereDate('created_at', '<=', $request->end_date);
            }

            // Filter by action type
            if ($request->has('action_type') && $request->action_type && $request->action_type !== 'all') {
                $query->where('action_type', $request->action_type);
            }

            $logs = $query->get();

            $formattedLogs = $logs->map(function($log) {
                return [
                    'id' => $log->id,
                    'action_type' => $log->action_type,
                    'action_label' => $this->getActionLabel($log->action_type),
                    'table_name' => $log->table_name,
                    'record_id' => $log->record_id,
                    'description' => $log->description,
                    'ip_address' => $log->ip_address ?? 'N/A',
                    'created_at' => $this->formatDateTime($log->created_at),
                ];
            });

            return response()->json([
                'success' => true,
                'logs' => $formattedLogs,
                'total' => $logs->count(),
            ]);

        } catch (\Exception $e) {
            Log::error('User audit log error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load user logs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get activity log by ID
     */
    public function show($id)
    {
        try {
            $log = ActivityLog::with(['user', 'student.user'])->find($id);

            if (!$log) {
                return response()->json([
                    'success' => false,
                    'message' => 'Log not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'log' => [
                    'id' => $log->id,
                    'user_id' => $log->user_id,
                    'user_name' => $log->user ? $log->user->first_name . ' ' . $log->user->last_name : 'System',
                    'student_name' => $log->student && $log->student->user 
                        ? $log->student->user->last_name . ', ' . $log->student->user->first_name 
                        : null,
                    'action_type' => $log->action_type,
                    'action_label' => $this->getActionLabel($log->action_type),
                    'table_name' => $log->table_name,
                    'record_id' => $log->record_id,
                    'old_values' => $this->formatValues($log->old_values),
                    'new_values' => $this->formatValues($log->new_values),
                    'description' => $log->description,
                    'ip_address' => $log->ip_address ?? 'N/A',
                    'created_at' => $this->formatDateTime($log->created_at),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Show audit log error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load log details: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available action types for filtering
     */
    public function actionTypes()
    {
        $actionTypes = [
            ['value' => 'CREATE', 'label' => 'Create', 'icon' => 'PlusCircle', 'color' => 'green'],
            ['value' => 'UPDATE', 'label' => 'Update', 'icon' => 'Edit', 'color' => 'blue'],
            ['value' => 'DELETE', 'label' => 'Delete', 'icon' => 'Trash2', 'color' => 'red'],
            ['value' => 'LOGIN', 'label' => 'Login', 'icon' => 'LogIn', 'color' => 'indigo'],
            ['value' => 'LOGOUT', 'label' => 'Logout', 'icon' => 'LogOut', 'color' => 'gray'],
            ['value' => 'UPLOAD', 'label' => 'Upload', 'icon' => 'Upload', 'color' => 'purple'],
            ['value' => 'TRANSFER', 'label' => 'Transfer', 'icon' => 'Users', 'color' => 'amber'],
            ['value' => 'ENROLL', 'label' => 'Enroll', 'icon' => 'UserCheck', 'color' => 'emerald'],
            ['value' => 'DROP', 'label' => 'Drop', 'icon' => 'UserX', 'color' => 'rose'],
            ['value' => 'GRADE_UPDATE', 'label' => 'Grade Update', 'icon' => 'GraduationCap', 'color' => 'yellow'],
        ];

        return response()->json([
            'success' => true,
            'actionTypes' => $actionTypes
        ]);
    }

    /**
     * Helper: Get human-readable action label
     */
    private function getActionLabel($actionType)
    {
        $labels = [
            'CREATE' => 'Create',
            'UPDATE' => 'Update',
            'DELETE' => 'Delete',
            'LOGIN' => 'Login',
            'LOGOUT' => 'Logout',
            'UPLOAD' => 'Upload',
            'TRANSFER' => 'Transfer',
            'ENROLL' => 'Enroll',
            'DROP' => 'Drop',
            'GRADE_UPDATE' => 'Grade Update',
        ];
        return $labels[$actionType] ?? $actionType;
    }
}