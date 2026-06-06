<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\Enrollment;
use App\Models\User;
use App\Models\TeacherAssignment;
use App\Models\StudentsInfo;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GradeController extends Controller
{
    /**
     * Get all grades (for viewing)
     */
    public function index(Request $request)
    {
        $query = Grade::with(['enrollment.student.user', 'subject', 'quarter', 'teacher.user']);
        
        if ($request->has('section_id')) {
            $enrollments = Enrollment::where('section_id', $request->section_id)->pluck('id');
            $query->whereIn('enrollment_id', $enrollments);
        }
        
        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        
        if ($request->has('quarter_id')) {
            $query->where('quarter_id', $request->quarter_id);
        }
        
        $grades = $query->get()->map(function($grade) {
            $user = $grade->enrollment->student->user;
            return [
                'id' => $grade->id,
                'student_id' => $grade->enrollment->student_id,
                'student_name' => $user->last_name . ', ' . $user->first_name . ' ' . $user->middle_name,
                'lrn' => $grade->enrollment->student->lrn,
                'subject_name' => $grade->subject->subject_name,
                'quarter_name' => $grade->quarter->name,
                'written_works' => $grade->written_works,
                'performance_tasks' => $grade->performance_tasks,
                'quarterly_assessment' => $grade->quarterly_assessment,
                'final_grade' => $grade->final_grade,
                'status' => $grade->status,
                'teacher_name' => $this->getTeacherName($grade),
            ];
        });
        
        return response()->json([
            'success' => true,
            'grades' => $grades
        ]);
    }
    
    /**
     * Batch save grades (for teacher grade encoding)
     */
    public function batchStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'grades' => 'required|array',
            'grades.*.enrollment_id' => 'required|exists:enrollments,id',
            'grades.*.subject_id' => 'required|exists:subjects,id',
            'grades.*.quarter_id' => 'required|exists:quarters,id',
            'grades.*.written_works' => 'nullable|numeric|min:0|max:100',
            'grades.*.performance_tasks' => 'nullable|numeric|min:0|max:100',
            'grades.*.quarterly_assessment' => 'nullable|numeric|min:0|max:100',
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
            foreach ($request->grades as $gradeData) {
                // Get enrollment to know section and school year
                $enrollment = Enrollment::with('section')->find($gradeData['enrollment_id']);
                
                // Find teacher assignment to get the correct teacher_id
                $assignment = null;
                if ($enrollment && $enrollment->section_id) {
                    $assignment = TeacherAssignment::where('subject_id', $gradeData['subject_id'])
                        ->where('section_id', $enrollment->section_id)
                        ->where('school_year_id', $enrollment->school_year_id)
                        ->first();
                }
                
                // Use assignment teacher_id if found, otherwise use authenticated teacher
                $teacherId = $assignment ? $assignment->teacher_id : (Auth::user()->teacher->id ?? null);
                
                Grade::updateOrCreate(
                    [
                        'enrollment_id' => $gradeData['enrollment_id'],
                        'subject_id' => $gradeData['subject_id'],
                        'quarter_id' => $gradeData['quarter_id'],
                    ],
                    [
                        'written_works' => $gradeData['written_works'] ?? 0,
                        'performance_tasks' => $gradeData['performance_tasks'] ?? 0,
                        'quarterly_assessment' => $gradeData['quarterly_assessment'] ?? 0,
                        'status' => 'pending',
                        'teacher_id' => $teacherId,
                    ]
                );
            }
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Grades saved successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to save grades: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all pending grades for admin approval
     */
    public function pendingGrades(Request $request)
    {
        $query = Grade::with([
            'enrollment.student.user',
            'enrollment.section.gradeLevel',
            'subject',
        ])->where('status', 'pending');

        // Apply filters
        if ($request->has('section_id') && $request->section_id) {
            $enrollments = Enrollment::where('section_id', $request->section_id)->pluck('id');
            $query->whereIn('enrollment_id', $enrollments);
        }

        if ($request->has('subject_id') && $request->subject_id) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('enrollment.student.user', function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('middle_name', 'like', "%{$search}%");
            })->orWhereHas('enrollment.student', function($q) use ($search) {
                $q->where('lrn', 'like', "%{$search}%");
            });
        }

        $grades = $query->orderBy('created_at', 'desc')->get();

        $result = $grades->map(function($grade) {
            $user = $grade->enrollment->student->user;
            $section = $grade->enrollment->section;
            $teacherName = $this->getTeacherName($grade);
            
            return [
                'id' => $grade->id,
                'student_id' => $grade->enrollment->student_id,
                'student_name' => $user->last_name . ', ' . $user->first_name . ' ' . $user->middle_name,
                'lrn' => $grade->enrollment->student->lrn,
                'section_id' => $section->id,
                'section_name' => $section->section_name,
                'grade_level' => $section->gradeLevel ? $section->gradeLevel->grade_level : 0,
                'subject_id' => $grade->subject_id,
                'subject_name' => $grade->subject->subject_name,
                'teacher_id' => $grade->teacher_id,
                'teacher_name' => $teacherName,
                'written_works' => $grade->written_works,
                'performance_tasks' => $grade->performance_tasks,
                'quarterly_assessment' => $grade->quarterly_assessment,
                'final_grade' => $grade->final_grade,
                'status' => $grade->status,
                'admin_remarks' => $grade->admin_remarks,
                'created_at' => $grade->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'grades' => $result
        ]);
    }

    /**
     * Approve a grade
     */
    public function approveGrade($id)
    {
        $grade = Grade::findOrFail($id);
        
        if ($grade->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Grade is already ' . $grade->status
            ], 422);
        }

        $grade->status = 'approved';
        $grade->approved_at = now();
        $grade->approved_by = Auth::id();
        $grade->save();

        return response()->json([
            'success' => true,
            'message' => 'Grade approved successfully'
        ]);
    }

    /**
     * Reject a grade
     */
    public function rejectGrade(Request $request, $id)
    {
        $grade = Grade::findOrFail($id);
        
        if ($grade->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Grade is already ' . $grade->status
            ], 422);
        }

        $request->validate([
            'remarks' => 'required|string|max:500'
        ]);

        $grade->status = 'rejected';
        $grade->admin_remarks = $request->remarks;
        $grade->save();

        return response()->json([
            'success' => true,
            'message' => 'Grade rejected successfully'
        ]);
    }

    /**
     * Get grade statistics for dashboard
     */
    public function stats()
    {
        $pending = Grade::where('status', 'pending')->count();
        $approved = Grade::where('status', 'approved')->count();
        $rejected = Grade::where('status', 'rejected')->count();
        $total = Grade::count();

        return response()->json([
            'success' => true,
            'stats' => [
                'pending' => $pending,
                'approved' => $approved,
                'rejected' => $rejected,
                'total' => $total,
                'pending_percentage' => $total > 0 ? round(($pending / $total) * 100, 1) : 0
            ]
        ]);
    }

    /**
     * Helper method to get teacher name from grade
     * Uses TeacherAssignment table as primary source
     */
    private function getTeacherName($grade)
    {
        // Method 1: If grade has teacher_id and relationship works
        if ($grade->teacher_id) {
            // Try to get from relationship first
            if ($grade->relationLoaded('teacher') && $grade->teacher && $grade->teacher->user) {
                return $grade->teacher->user->first_name . ' ' . $grade->teacher->user->last_name;
            }
            
            // If relationship not loaded, query directly
            $teacher = Teacher::with('user')->find($grade->teacher_id);
            if ($teacher && $teacher->user) {
                return $teacher->user->first_name . ' ' . $teacher->user->last_name;
            }
        }
        
        // Method 2: Find teacher via TeacherAssignment table
        $enrollment = $grade->enrollment;
        if ($enrollment && $enrollment->section_id) {
            $assignment = TeacherAssignment::with(['teacher.user'])
                ->where('subject_id', $grade->subject_id)
                ->where('section_id', $enrollment->section_id)
                ->where('school_year_id', $enrollment->school_year_id)
                ->first();
            
            if ($assignment && $assignment->teacher && $assignment->teacher->user) {
                // Auto-fix the grade record if teacher_id is missing
                if (!$grade->teacher_id) {
                    $grade->teacher_id = $assignment->teacher_id;
                    $grade->save();
                }
                return $assignment->teacher->user->first_name . ' ' . $assignment->teacher->user->last_name;
            }
        }
        
        // Method 3: Fallback - try to find any teacher assigned to this subject and section
        if ($enrollment && $enrollment->section_id) {
            $assignment = TeacherAssignment::with(['teacher.user'])
                ->where('subject_id', $grade->subject_id)
                ->where('section_id', $enrollment->section_id)
                ->first();
            
            if ($assignment && $assignment->teacher && $assignment->teacher->user) {
                return $assignment->teacher->user->first_name . ' ' . $assignment->teacher->user->last_name;
            }
        }
        
        return 'Unknown Teacher';
    }

    /**
 * Get grades for a specific student
 */
public function getStudentGrades($studentId)
{
    try {
        // Find the student's active enrollment
        $studentInfo = StudentsInfo::where('user_id', $studentId)->first();
        
        if (!$studentInfo) {
            return response()->json([
                'success' => true,
                'grades' => []
            ]);
        }
        
        $activeEnrollment = Enrollment::where('student_id', $studentInfo->id)
            ->where('status', 'Active')
            ->first();
            
        if (!$activeEnrollment) {
            return response()->json([
                'success' => true,
                'grades' => []
            ]);
        }
        
        // Get all grades for this enrollment
        $grades = Grade::where('enrollment_id', $activeEnrollment->id)
            ->with('subject')
            ->get()
            ->groupBy('subject_id')
            ->map(function($subjectGrades) {
                $subject = $subjectGrades->first()->subject;
                $gradesByQuarter = [];
                
                foreach ($subjectGrades as $grade) {
                    $quarterAvg = round(($grade->written_works + $grade->performance_tasks + $grade->quarterly_assessment) / 3, 1);
                    $gradesByQuarter['q' . $grade->quarter_id] = $quarterAvg;
                }
                
                return [
                    'subject_name' => $subject->subject_name,
                    'q1' => $gradesByQuarter['q1'] ?? null,
                    'q2' => $gradesByQuarter['q2'] ?? null,
                    'q3' => $gradesByQuarter['q3'] ?? null,
                    'q4' => $gradesByQuarter['q4'] ?? null,
                    'average' => !empty($gradesByQuarter) ? round(array_sum($gradesByQuarter) / count($gradesByQuarter), 1) : null,
                ];
            })->values();
        
        return response()->json([
            'success' => true,
            'grades' => $grades
        ]);
        
    } catch (\Exception $e) {
        Log::error('Get student grades error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch grades',
            'grades' => []
        ], 500);
    }
}
}