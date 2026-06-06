<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\StudentsInfo;
use App\Models\Section;
use App\Models\SchoolYear;
use App\Models\StudentStatusHistory;
use App\Models\User;
use App\Models\GradeLevel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EnrollmentController extends Controller
{
    // Get all enrollments with filters
    public function index(Request $request)
    {
        try {
            $query = Enrollment::with(['student.user', 'section.gradeLevel', 'schoolYear']);
            
            if ($request->has('school_year_id') && $request->school_year_id) {
                $query->where('school_year_id', $request->school_year_id);
            }
            
            if ($request->has('section_id') && $request->section_id) {
                $query->where('section_id', $request->section_id);
            }
            
            if ($request->has('student_id') && $request->student_id) {
                $query->where('student_id', $request->student_id);
            }
            
            if ($request->has('status') && $request->status && $request->status !== 'all') {
                $query->where('status', $request->status);
            }
            
            $enrollments = $query->orderBy('created_at', 'desc')->get();
            
            $result = $enrollments->map(function($enrollment) {
                $user = $enrollment->student ? $enrollment->student->user : null;
                $gradeLevel = $this->getGradeLevelFromEnrollment($enrollment);
                $gradeDisplay = $this->getGradeDisplay($gradeLevel);
                
                return [
                    'id' => $enrollment->id,
                    'student_id' => $enrollment->student_id,
                    'student_name' => $user ? $user->last_name . ', ' . $user->first_name . ' ' . $user->middle_name : 'N/A',
                    'lrn' => $enrollment->student ? $enrollment->student->lrn : 'N/A',
                    'gender' => $user ? $user->gender : 'N/A',
                    'grade_level' => $gradeLevel,
                    'grade_level_numeric' => $gradeLevel,
                    'grade_display' => $gradeDisplay,
                    'section' => $enrollment->section ? $enrollment->section->section_name : null,
                    'section_id' => $enrollment->section_id,
                    'school_year' => $enrollment->schoolYear ? $enrollment->schoolYear->year_start . '-' . $enrollment->schoolYear->year_end : null,
                    'school_year_id' => $enrollment->school_year_id,
                    'guardian' => $enrollment->student ? $enrollment->student->guardian_name : 'N/A',
                    'contact' => $enrollment->student ? $enrollment->student->guardian_contact_number : 'N/A',
                    'enrolled_date' => $enrollment->date_enrolled,
                    'status' => $enrollment->status,
                    'created_at' => $enrollment->created_at,
                ];
            });
            
            return response()->json([
                'success' => true,
                'enrollments' => $result
            ]);
            
        } catch (\Exception $e) {
            Log::error('Enrollment index error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch enrollments: ' . $e->getMessage()
            ], 500);
        }
    }

    // Get active enrollments only
    public function active(Request $request)
    {
        try {
            $query = Enrollment::with(['student.user', 'section.gradeLevel', 'schoolYear'])
                ->where('status', 'Active');
            
            if ($request->has('school_year_id') && $request->school_year_id) {
                $query->where('school_year_id', $request->school_year_id);
            }
            
            if ($request->has('section_id') && $request->section_id) {
                $query->where('section_id', $request->section_id);
            }
            
            $enrollments = $query->orderBy('created_at', 'desc')->get();
            
            $result = $enrollments->map(function($enrollment) {
                $user = $enrollment->student ? $enrollment->student->user : null;
                $gradeLevel = $this->getGradeLevelFromEnrollment($enrollment);
                $gradeDisplay = $this->getGradeDisplay($gradeLevel);
                
                // Log kung may section ngunit walang grade level (para malaman kung aling section ang may problema)
                if ($gradeLevel === null && $enrollment->section) {
                    Log::warning("Enrollment #{$enrollment->id} (student: {$user->id}) has section '{$enrollment->section->section_name}' but grade_level is null. Section ID: {$enrollment->section_id}");
                }
                
                return [
                    'id' => $enrollment->id,
                    'student_id' => $enrollment->student_id,
                    'student_name' => $user ? $user->last_name . ', ' . $user->first_name . ' ' . $user->middle_name : 'N/A',
                    'lrn' => $enrollment->student ? $enrollment->student->lrn : 'N/A',
                    'gender' => $user ? $user->gender : 'N/A',
                    'grade_level' => $gradeLevel,
                    'grade_level_numeric' => $gradeLevel,
                    'grade_display' => $gradeDisplay,
                    'section' => $enrollment->section ? $enrollment->section->section_name : null,
                    'guardian' => $enrollment->student ? $enrollment->student->guardian_name : 'N/A',
                    'contact' => $enrollment->student ? $enrollment->student->guardian_contact_number : 'N/A',
                    'enrolled_date' => $enrollment->date_enrolled,
                    'status' => $enrollment->status,
                ];
            });
            
            return response()->json([
                'success' => true,
                'enrollments' => $result
            ]);
            
        } catch (\Exception $e) {
            Log::error('Enrollment active error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active enrollments: ' . $e->getMessage()
            ], 500);
        }
    }

    // Get enrollment history for a specific student
    public function studentHistory($studentId)
    {
        try {
            $student = StudentsInfo::with('user')->find($studentId);
            
            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found'
                ], 404);
            }
            
            $enrollments = Enrollment::where('student_id', $studentId)
                ->with(['section.gradeLevel', 'schoolYear'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($enrollment) {
                    $gradeLevel = $this->getGradeLevelFromEnrollment($enrollment);
                    return [
                        'id' => $enrollment->id,
                        'school_year' => $enrollment->schoolYear ? $enrollment->schoolYear->year_start . '-' . $enrollment->schoolYear->year_end : null,
                        'grade_level' => $gradeLevel,
                        'grade_display' => $this->getGradeDisplay($gradeLevel),
                        'section' => $enrollment->section ? $enrollment->section->section_name : null,
                        'status' => $enrollment->status,
                        'date_enrolled' => $enrollment->date_enrolled,
                    ];
                });
            
            $user = $student->user;
            return response()->json([
                'success' => true,
                'student' => [
                    'id' => $student->id,
                    'name' => $user ? $user->last_name . ', ' . $user->first_name . ' ' . $user->middle_name : 'N/A',
                    'lrn' => $student->lrn,
                ],
                'enrollments' => $enrollments
            ]);
            
        } catch (\Exception $e) {
            Log::error('Enrollment studentHistory error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch student history: ' . $e->getMessage()
            ], 500);
        }
    }

    // Get enrollment statistics (hindi binago)
    public function stats(Request $request)
    {
        try {
            $query = Enrollment::query();
            
            if ($request->has('school_year_id') && $request->school_year_id) {
                $query->where('school_year_id', $request->school_year_id);
            }
            
            $totalEnrollments = $query->count();
            $activeEnrollments = (clone $query)->where('status', 'Active')->count();
            $completedEnrollments = (clone $query)->where('status', 'Completed')->count();
            $droppedEnrollments = (clone $query)->where('status', 'Dropped')->count();
            $uniqueStudents = Enrollment::when($request->has('school_year_id'), function($q) use ($request) {
                    $q->where('school_year_id', $request->school_year_id);
                })
                ->distinct('student_id')
                ->count('student_id');
            
            $enrollmentsBySchoolYear = Enrollment::with('schoolYear')
                ->get()
                ->groupBy(function($enrollment) {
                    return $enrollment->schoolYear ? $enrollment->schoolYear->year_start . '-' . $enrollment->schoolYear->year_end : 'Unknown';
                })
                ->map(function($group, $schoolYear) {
                    return [
                        'school_year' => $schoolYear,
                        'count' => $group->count(),
                        'active' => $group->where('status', 'Active')->count(),
                        'completed' => $group->where('status', 'Completed')->count(),
                        'dropped' => $group->where('status', 'Dropped')->count(),
                    ];
                })
                ->values()
                ->sortByDesc('school_year');
            
            return response()->json([
                'success' => true,
                'stats' => [
                    'totalEnrollments' => $totalEnrollments,
                    'activeEnrollments' => $activeEnrollments,
                    'completedEnrollments' => $completedEnrollments,
                    'droppedEnrollments' => $droppedEnrollments,
                    'uniqueStudents' => $uniqueStudents,
                    'bySchoolYear' => $enrollmentsBySchoolYear,
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Enrollment stats error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    // Create new enrollment (hindi binago)
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students_info,id',
            'section_id' => 'required|exists:sections,id',
            'school_year_id' => 'required|exists:school_years,id',
            'status' => 'sometimes|in:Active,Completed,Dropped',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $existingActive = Enrollment::where('student_id', $request->student_id)
            ->where('status', 'Active')
            ->first();

        if ($existingActive) {
            return response()->json([
                'success' => false,
                'message' => 'Student already has an active enrollment.'
            ], 422);
        }

        DB::beginTransaction();

        try {
            $enrollment = Enrollment::create([
                'student_id' => $request->student_id,
                'section_id' => $request->section_id,
                'school_year_id' => $request->school_year_id,
                'date_enrolled' => now(),
                'status' => $request->status ?? 'Active',
            ]);

            $section = Section::with('gradeLevel')->find($request->section_id);
            $schoolYear = SchoolYear::find($request->school_year_id);
            
            StudentStatusHistory::create([
                'student_id' => $request->student_id,
                'school_year_id' => $request->school_year_id,
                'status' => 'Enrolled',
                'effective_date' => now(),
                'remarks' => 'Enrolled in ' . ($section ? $section->section_name : 'N/A') . ' for SY ' . ($schoolYear ? $schoolYear->year_start . '-' . $schoolYear->year_end : 'N/A'),
                'changed_by' => null,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Student enrolled successfully',
                'enrollment' => $enrollment
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create enrollment: ' . $e->getMessage()
            ], 500);
        }
    }

    // Update enrollment status (hindi binago)
    public function update(Request $request, $id)
    {
        $enrollment = Enrollment::find($id);
        
        if (!$enrollment) {
            return response()->json([
                'success' => false,
                'message' => 'Enrollment not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:Active,Completed,Dropped',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();

        try {
            $oldStatus = $enrollment->status;
            $enrollment->update(['status' => $request->status]);

            if ($oldStatus !== $request->status) {
                $statusMap = [
                    'Active' => 'Enrolled',
                    'Completed' => 'Graduated',
                    'Dropped' => 'Dropped',
                ];
                
                StudentStatusHistory::create([
                    'student_id' => $enrollment->student_id,
                    'school_year_id' => $enrollment->school_year_id,
                    'status' => $statusMap[$request->status] ?? $request->status,
                    'effective_date' => now(),
                    'remarks' => $request->remarks ?? 'Status changed from ' . $oldStatus . ' to ' . $request->status,
                    'changed_by' => null,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Enrollment updated successfully',
                'enrollment' => $enrollment
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update enrollment: ' . $e->getMessage()
            ], 500);
        }
    }

    // Delete enrollment (hindi binago)
    public function destroy($id)
    {
        $enrollment = Enrollment::find($id);
        
        if (!$enrollment) {
            return response()->json([
                'success' => false,
                'message' => 'Enrollment not found'
            ], 404);
        }

        DB::beginTransaction();

        try {
            StudentStatusHistory::where('student_id', $enrollment->student_id)
                ->where('school_year_id', $enrollment->school_year_id)
                ->delete();
            $enrollment->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Enrollment deleted successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete enrollment: ' . $e->getMessage()
            ], 500);
        }
    }

    // Helper: Kunin ang grade level mula sa enrollment (kahit walang loaded relationship)
    private function getGradeLevelFromEnrollment($enrollment)
    {
        if (!$enrollment->section) {
            return null;
        }
        
        // Subukan muna ang eager-loaded relationship
        if ($enrollment->section->gradeLevel) {
            return $enrollment->section->gradeLevel->grade_level;
        }
        
        // Kung may grade_level_id ngunit hindi na-load, kunin nang direkta
        if ($enrollment->section->grade_level_id) {
            $gradeLevel = GradeLevel::find($enrollment->section->grade_level_id);
            if ($gradeLevel) {
                // I‑attach muli sa section para sa susunod
                $enrollment->section->setRelation('gradeLevel', $gradeLevel);
                return $gradeLevel->grade_level;
            } else {
                Log::warning("Section ID {$enrollment->section->id} has grade_level_id {$enrollment->section->grade_level_id} but no matching GradeLevel record.");
            }
        }
        
        return null;
    }

    // Helper: Grade display name
    private function getGradeDisplay($gradeLevel)
    {
        if ($gradeLevel === null) return 'N/A';
        if ($gradeLevel === 0) return 'Kinder';
        return 'Grade ' . $gradeLevel;
    }

    /**
 * Get enrollment report data
 */
public function enrollmentReport(Request $request)
{
    try {
        $query = Enrollment::with(['student.user', 'section.gradeLevel', 'schoolYear']);
        
        // Filter by school year
        if ($request->school_year_id) {
            $query->where('school_year_id', $request->school_year_id);
        }
        
        // Filter by date range
        if ($request->start_date && $request->end_date) {
            $query->whereBetween('created_at', [$request->start_date, $request->end_date]);
        }
        
        $enrollments = $query->get();
        
        // Summary statistics
        $summary = [
            'totalEnrollments' => $enrollments->count(),
            'activeEnrollments' => $enrollments->where('status', 'Active')->count(),
            'completedEnrollments' => $enrollments->where('status', 'Completed')->count(),
            'droppedEnrollments' => $enrollments->where('status', 'Dropped')->count(),
            'enrollmentRate' => $enrollments->count() > 0 
                ? round(($enrollments->where('status', 'Active')->count() / $enrollments->count()) * 100, 1)
                : 0
        ];
        
        // Enrollment trend by school year
        $enrollmentTrend = Enrollment::select(
                DB::raw('CONCAT(school_years.year_start, "-", school_years.year_end) as year'),
                DB::raw('count(*) as enrolled')
            )
            ->join('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
            ->groupBy('enrollments.school_year_id', 'school_years.year_start', 'school_years.year_end')
            ->orderBy('school_years.year_start', 'asc')
            ->get()
            ->toArray();
        
        // Grade level distribution
        $gradeLevelDistribution = Enrollment::join('sections', 'enrollments.section_id', '=', 'sections.id')
            ->join('grade_levels', 'sections.grade_level_id', '=', 'grade_levels.id')
            ->select('grade_levels.grade_level', DB::raw('count(*) as count'))
            ->groupBy('grade_levels.grade_level')
            ->orderBy('grade_levels.grade_level', 'asc')
            ->get()
            ->map(function($item) {
                return [
                    'grade' => $item->grade_level == 0 ? 'Kinder' : 'Grade ' . $item->grade_level,
                    'count' => $item->count,
                    'color' => $this->getGradeColor($item->grade_level)
                ];
            });
        
        // Monthly enrollments for current year
        $monthlyEnrollments = Enrollment::whereYear('created_at', now()->year)
            ->select(DB::raw('MONTH(created_at) as month'), DB::raw('count(*) as enrolled'))
            ->groupBy(DB::raw('MONTH(created_at)'))
            ->orderBy(DB::raw('MONTH(created_at)'), 'asc')
            ->get()
            ->map(function($item) {
                $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return [
                    'month' => $months[$item->month - 1],
                    'enrolled' => $item->enrolled
                ];
            });
        
        // Section distribution (top 5)
        $sectionDistribution = Enrollment::join('sections', 'enrollments.section_id', '=', 'sections.id')
            ->select('sections.section_name as section', DB::raw('count(*) as count'))
            ->groupBy('sections.id', 'sections.section_name')
            ->orderBy('count', 'desc')
            ->limit(5)
            ->get()
            ->toArray();
        
        // Recent enrollments
        $recentEnrollments = Enrollment::with(['student.user', 'section.gradeLevel'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function($enrollment) {
                $user = $enrollment->student->user;
                $gradeLevel = $enrollment->section->gradeLevel->grade_level;
                return [
                    'id' => $enrollment->id,
                    'name' => $user->last_name . ', ' . $user->first_name,
                    'lrn' => $enrollment->student->lrn,
                    'grade' => $gradeLevel == 0 ? 'Kinder' : 'Grade ' . $gradeLevel,
                    'section' => $enrollment->section->section_name,
                    'date' => $enrollment->created_at->format('Y-m-d')
                ];
            });
        
        return response()->json([
            'success' => true,
            'report' => [
                'summary' => $summary,
                'enrollmentTrend' => $enrollmentTrend,
                'gradeLevelDistribution' => $gradeLevelDistribution,
                'sectionDistribution' => $sectionDistribution,
                'monthlyEnrollments' => $monthlyEnrollments,
                'recentEnrollments' => $recentEnrollments
            ]
        ]);
        
    } catch (\Exception $e) {
        Log::error('Enrollment report error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to load enrollment report'
        ], 500);
    }
}

private function getGradeColor($grade)
{
    $colors = [
        0 => '#10B981',  // Kinder - Emerald
        1 => '#3B82F6',  // Grade 1 - Blue
        2 => '#6366F1',  // Grade 2 - Indigo
        3 => '#8B5CF6',  // Grade 3 - Purple
        4 => '#EC4899',  // Grade 4 - Pink
        5 => '#F59E0B',  // Grade 5 - Amber
        6 => '#EF4444'   // Grade 6 - Red
    ];
    return $colors[$grade] ?? '#6B7280';
}
}   