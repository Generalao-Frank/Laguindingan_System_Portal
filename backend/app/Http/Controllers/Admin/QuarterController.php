<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Quarter;
use App\Models\SchoolYear;
use App\Models\Grade;
use App\Models\ActivityLog;  // ✅ IDINAGDAG
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class QuarterController extends Controller
{
  /**
 * Helper: Get current user ID safely
 */
private function getCurrentUserId(Request $request = null)
{
    try {
        // Get from request user (works for API with sanctum)
        if ($request && $request->user()) {
            return $request->user()->id;
        }
        
        // Fallback: get first admin user
        $adminUser = \App\Models\User::where('role', 'Admin')->first();
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

    public function index()
    {
        $quarters = Quarter::with('schoolYear')
            ->orderBy('school_year_id', 'desc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function($quarter) {
                $gradesCount = Grade::where('quarter_id', $quarter->id)->count();
                $studentsCount = Grade::where('quarter_id', $quarter->id)
                    ->distinct('enrollment_id')
                    ->count('enrollment_id');
                
                return [
                    'id' => $quarter->id,
                    'name' => $quarter->name,
                    'start_date' => $quarter->start_date,
                    'end_date' => $quarter->end_date,
                    'is_active' => $quarter->is_active,
                    'is_locked' => $quarter->is_locked,
                    'school_year_id' => $quarter->school_year_id,
                    'school_year' => $quarter->schoolYear ? 
                        $quarter->schoolYear->year_start . '-' . $quarter->schoolYear->year_end : 'N/A',
                    'grades_count' => $gradesCount,
                    'students_count' => $studentsCount,
                ];
            });

        return response()->json([
            'success' => true,
            'quarters' => $quarters
        ]);
    }

    public function getQuartersBySchoolYear($schoolYearId)
    {
        $schoolYear = SchoolYear::find($schoolYearId);
        
        if (!$schoolYear) {
            return response()->json([
                'success' => false,
                'message' => 'School year not found'
            ], 404);
        }

        $quarters = Quarter::where('school_year_id', $schoolYearId)
            ->orderBy('id', 'asc')
            ->get()
            ->map(function($quarter) use ($schoolYear) {
                $gradesCount = Grade::where('quarter_id', $quarter->id)->count();
                $studentsCount = Grade::where('quarter_id', $quarter->id)
                    ->distinct('enrollment_id')
                    ->count('enrollment_id');
                
                return [
                    'id' => $quarter->id,
                    'name' => $quarter->name,
                    'start_date' => $quarter->start_date,
                    'end_date' => $quarter->end_date,
                    'is_active' => $quarter->is_active,
                    'is_locked' => $quarter->is_locked,
                    'school_year_id' => $quarter->school_year_id,
                    'school_year' => $schoolYear->year_start . '-' . $schoolYear->year_end,
                    'grades_count' => $gradesCount,
                    'students_count' => $studentsCount,
                ];
            });

        return response()->json([
            'success' => true,
            'quarters' => $quarters,
            'school_year' => [
                'id' => $schoolYear->id,
                'year_start' => $schoolYear->year_start,
                'year_end' => $schoolYear->year_end,
            ]
        ]);
    }

    /**
     * Auto-update quarter statuses based on current date
     */
    public function autoUpdateStatus(Request $request)
    {
        try {
            $today = Carbon::today();
            $quarters = Quarter::with('schoolYear')->get(); // ✅ Added with('schoolYear')
            
            $updates = [];
            $activatedCount = 0;
            $deactivatedCount = 0;
            
            foreach ($quarters as $quarter) {
                $startDate = Carbon::parse($quarter->start_date);
                $endDate = Carbon::parse($quarter->end_date);
                $shouldBeActive = $today->between($startDate, $endDate);
                
                if ($shouldBeActive && !$quarter->is_active) {
                    // Save old value for logging
                    $oldValues = ['is_active' => $quarter->is_active];
                    $quarter->is_active = true;
                    $quarter->save();
                    $activatedCount++;
                    $updates[] = [
                        'quarter' => $quarter->name,
                        'action' => 'activated',
                        'school_year' => $quarter->schoolYear ? 
                            $quarter->schoolYear->year_start . '-' . $quarter->schoolYear->year_end : 'N/A'
                    ];
                    
                    // ✅ ADD ACTIVITY LOG
                    ActivityLog::create([
                        'user_id' => $this->getCurrentUserId($request),
                        'student_id' => null,
                        'action_type' => 'UPDATE',
                        'table_name' => 'quarters',
                        'record_id' => $quarter->id,
                        'old_values' => $oldValues,
                        'new_values' => ['is_active' => true],
                        'description' => 'Auto-activated quarter: ' . $quarter->name . ' (Date range: ' . $startDate->format('Y-m-d') . ' to ' . $endDate->format('Y-m-d') . ')',
                        'ip_address' => $request->ip(),
                    ]);
                    
                } elseif (!$shouldBeActive && $quarter->is_active) {
                    // Save old value for logging
                    $oldValues = ['is_active' => $quarter->is_active];
                    $quarter->is_active = false;
                    $quarter->save();
                    $deactivatedCount++;
                    $updates[] = [
                        'quarter' => $quarter->name,
                        'action' => 'deactivated',
                        'school_year' => $quarter->schoolYear ? 
                            $quarter->schoolYear->year_start . '-' . $quarter->schoolYear->year_end : 'N/A'
                    ];
                    
                    // ✅ ADD ACTIVITY LOG
                    ActivityLog::create([
                        'user_id' => $this->getCurrentUserId($request),
                        'student_id' => null,
                        'action_type' => 'UPDATE',
                        'table_name' => 'quarters',
                        'record_id' => $quarter->id,
                        'old_values' => $oldValues,
                        'new_values' => ['is_active' => false],
                        'description' => 'Auto-deactivated quarter: ' . $quarter->name . ' (Outside date range)',
                        'ip_address' => $request->ip(),
                    ]);
                }
            }
            
            // ✅ Log the auto-update summary if there were changes
            if ($activatedCount > 0 || $deactivatedCount > 0) {
                ActivityLog::create([
                    'user_id' => $this->getCurrentUserId($request),
                    'student_id' => null,
                    'action_type' => 'UPDATE',
                    'table_name' => 'quarters',
                    'record_id' => 'auto-update',
                    'old_values' => null,
                    'new_values' => [
                        'activated' => $activatedCount,
                        'deactivated' => $deactivatedCount,
                    ],
                    'description' => 'Auto-update quarters: ' . $activatedCount . ' activated, ' . $deactivatedCount . ' deactivated',
                    'ip_address' => $request->ip(),
                ]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Quarter statuses updated',
                'updates' => $updates,
                'activated_count' => $activatedCount,
                'deactivated_count' => $deactivatedCount,
                'current_active' => Quarter::where('is_active', true)->first()?->name ?? 'None'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Auto-update quarters error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update quarters: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|in:1st Quarter,2nd Quarter,3rd Quarter,4th Quarter',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_active' => 'boolean',
            'is_locked' => 'boolean',
            'school_year_id' => 'required|exists:school_years,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check for duplicate quarter name within same school year
        $existing = Quarter::where('name', $request->name)
            ->where('school_year_id', $request->school_year_id)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Quarter already exists in this school year'
            ], 422);
        }

        DB::beginTransaction();

        try {
            // If this quarter is set as active, deactivate others in the same school year
            if ($request->is_active) {
                Quarter::where('school_year_id', $request->school_year_id)
                    ->update(['is_active' => false]);
            }

            $quarter = Quarter::create([
                'name' => $request->name,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'is_active' => $request->is_active ?? false,
                'is_locked' => $request->is_locked ?? false,
                'school_year_id' => $request->school_year_id,
            ]);

            // ✅ ADD ACTIVITY LOG
            ActivityLog::create([
                'user_id' => $this->getCurrentUserId($request),
                'student_id' => null,
                'action_type' => 'CREATE',
                'table_name' => 'quarters',
                'record_id' => $quarter->id,
                'old_values' => null,
                'new_values' => [
                    'name' => $quarter->name,
                    'start_date' => $quarter->start_date,
                    'end_date' => $quarter->end_date,
                    'is_active' => $quarter->is_active,
                    'is_locked' => $quarter->is_locked,
                ],
                'description' => 'Created new quarter: ' . $quarter->name . ' for school year ID ' . $request->school_year_id,
                'ip_address' => $request->ip(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Quarter created successfully',
                'quarter' => $quarter
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create quarter: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $quarter = Quarter::find($id);
        
        if (!$quarter) {
            return response()->json([
                'success' => false,
                'message' => 'Quarter not found'
            ], 404);
        }

        // ✅ Get old values for logging
        $oldValues = [
            'name' => $quarter->name,
            'start_date' => $quarter->start_date,
            'end_date' => $quarter->end_date,
            'is_active' => $quarter->is_active,
            'is_locked' => $quarter->is_locked,
        ];

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|in:1st Quarter,2nd Quarter,3rd Quarter,4th Quarter',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_active' => 'boolean',
            'is_locked' => 'boolean',
            'school_year_id' => 'required|exists:school_years,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check for duplicate quarter name within same school year (excluding current)
        $existing = Quarter::where('name', $request->name)
            ->where('school_year_id', $request->school_year_id)
            ->where('id', '!=', $id)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Quarter already exists in this school year'
            ], 422);
        }

        DB::beginTransaction();

        try {
            // If setting this as active, deactivate others in the same school year
            if ($request->is_active && !$quarter->is_active) {
                Quarter::where('school_year_id', $request->school_year_id)
                    ->where('id', '!=', $id)
                    ->update(['is_active' => false]);
            }

            $quarter->update([
                'name' => $request->name,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'is_active' => $request->is_active ?? false,
                'is_locked' => $request->is_locked ?? false,
                'school_year_id' => $request->school_year_id,
            ]);

            // ✅ ADD ACTIVITY LOG
            ActivityLog::create([
                'user_id' => $this->getCurrentUserId($request),
                'student_id' => null,
                'action_type' => 'UPDATE',
                'table_name' => 'quarters',
                'record_id' => $id,
                'old_values' => $oldValues,
                'new_values' => [
                    'name' => $quarter->name,
                    'start_date' => $quarter->start_date,
                    'end_date' => $quarter->end_date,
                    'is_active' => $quarter->is_active,
                    'is_locked' => $quarter->is_locked,
                ],
                'description' => 'Updated quarter: ' . $quarter->name . ' (ID: ' . $id . ')',
                'ip_address' => $request->ip(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Quarter updated successfully',
                'quarter' => $quarter
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update quarter: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Request $request, $id)  // ✅ Added Request parameter
    {
        $quarter = Quarter::find($id);
        
        if (!$quarter) {
            return response()->json([
                'success' => false,
                'message' => 'Quarter not found'
            ], 404);
        }

        // Check if there are grades
        $gradesCount = Grade::where('quarter_id', $quarter->id)->count();
        
        if ($gradesCount > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete quarter with existing grade records'
            ], 400);
        }

        // ✅ Get old values for logging
        $oldValues = [
            'name' => $quarter->name,
            'start_date' => $quarter->start_date,
            'end_date' => $quarter->end_date,
            'school_year_id' => $quarter->school_year_id,
        ];

        try {
            $quarter->delete();

            // ✅ ADD ACTIVITY LOG
            ActivityLog::create([
                'user_id' => $this->getCurrentUserId($request),
                'student_id' => null,
                'action_type' => 'DELETE',
                'table_name' => 'quarters',
                'record_id' => $id,
                'old_values' => $oldValues,
                'new_values' => null,
                'description' => 'Deleted quarter: ' . $oldValues['name'] . ' (ID: ' . $id . ')',
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Quarter deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete quarter: ' . $e->getMessage()
            ], 500);
        }
    }
}