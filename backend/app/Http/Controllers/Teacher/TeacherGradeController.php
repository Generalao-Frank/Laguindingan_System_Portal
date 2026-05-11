<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\Grade;
use App\Models\Enrollment;
use App\Models\Subject;
use App\Models\Quarter;
use App\Models\TeacherAssignment;

class TeacherGradeController extends Controller
{
    /**
     * Get all students with their current grades for a specific subject and quarter
     */
    public function getStudentsForGrading(Request $request)
    {
        $teacher = Auth::user()->teacher;
        
        $validator = Validator::make($request->all(), [
            'subject_id' => 'required|exists:subjects,id',
            'quarter_id' => 'required|exists:quarters,id',
            'section_id' => 'required|exists:sections,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Verify that the teacher is assigned to this subject and section
        $assignment = TeacherAssignment::where('teacher_id', $teacher->id)
            ->where('subject_id', $request->subject_id)
            ->where('section_id', $request->section_id)
            ->first();

        if (!$assignment) {
            return response()->json([
                'success' => false,
                'message' => 'You are not assigned to this subject and section'
            ], 403);
        }

        // Get all active enrollments for this section
        $enrollments = Enrollment::with(['student.user', 'student'])
            ->where('section_id', $request->section_id)
            ->where('status', 'Active')
            ->get();

        $students = [];
        foreach ($enrollments as $enrollment) {
            $user = $enrollment->student->user;
            
            // Get existing grade for this subject and quarter
            $grade = Grade::where('enrollment_id', $enrollment->id)
                ->where('subject_id', $request->subject_id)
                ->where('quarter_id', $request->quarter_id)
                ->first();

            $students[] = [
                'enrollment_id' => $enrollment->id,
                'student_id' => $enrollment->student_id,
                'student_name' => $user->last_name . ', ' . $user->first_name . ' ' . $user->middle_name,
                'lrn' => $enrollment->student->lrn,
                'grade_id' => $grade ? $grade->id : null,
                'written_works' => $grade ? $grade->written_works : 0,
                'performance_tasks' => $grade ? $grade->performance_tasks : 0,
                'quarterly_assessment' => $grade ? $grade->quarterly_assessment : 0,
                'final_grade' => $grade ? $grade->final_grade : null,
                'status' => $grade ? $grade->status : 'pending',
            ];
        }

        return response()->json([
            'success' => true,
            'students' => $students,
            'subject_id' => $request->subject_id,
            'subject_name' => $assignment->subject->subject_name,
            'section_id' => $request->section_id,
            'section_name' => $assignment->section->section_name,
            'quarter_id' => $request->quarter_id,
        ]);
    }

    /**
     * Save or update grades for a student (draft - not yet submitted)
     */
    public function saveGrade(Request $request)
    {
        $teacher = Auth::user()->teacher;

        $validator = Validator::make($request->all(), [
            'enrollment_id' => 'required|exists:enrollments,id',
            'subject_id' => 'required|exists:subjects,id',
            'quarter_id' => 'required|exists:quarters,id',
            'written_works' => 'nullable|numeric|min:0|max:100',
            'performance_tasks' => 'nullable|numeric|min:0|max:100',
            'quarterly_assessment' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Calculate final grade (average of the three components)
        $written = $request->written_works ?? 0;
        $performance = $request->performance_tasks ?? 0;
        $quarterly = $request->quarterly_assessment ?? 0;
        $finalGrade = round(($written + $performance + $quarterly) / 3);

        $grade = Grade::updateOrCreate(
            [
                'enrollment_id' => $request->enrollment_id,
                'subject_id' => $request->subject_id,
                'quarter_id' => $request->quarter_id,
            ],
            [
                'written_works' => $written,
                'performance_tasks' => $performance,
                'quarterly_assessment' => $quarterly,
                'final_grade' => $finalGrade,
                'status' => 'pending', // Always pending until submitted
            ]
        );

        return response()->json([
            'success' => true,
            'grade' => $grade,
            'final_grade' => $finalGrade,
        ]);
    }

    /**
     * Submit all grades for a specific subject and quarter to admin for approval
     */
    public function submitGrades(Request $request)
    {
        $teacher = Auth::user()->teacher;

        $validator = Validator::make($request->all(), [
            'subject_id' => 'required|exists:subjects,id',
            'quarter_id' => 'required|exists:quarters,id',
            'section_id' => 'required|exists:sections,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Verify teacher assignment
        $assignment = TeacherAssignment::where('teacher_id', $teacher->id)
            ->where('subject_id', $request->subject_id)
            ->where('section_id', $request->section_id)
            ->first();

        if (!$assignment) {
            return response()->json([
                'success' => false,
                'message' => 'You are not assigned to this subject and section'
            ], 403);
        }

        // Get all enrollments for this section
        $enrollments = Enrollment::where('section_id', $request->section_id)
            ->where('status', 'Active')
            ->get();

        $submittedCount = 0;
        foreach ($enrollments as $enrollment) {
            $grade = Grade::where('enrollment_id', $enrollment->id)
                ->where('subject_id', $request->subject_id)
                ->where('quarter_id', $request->quarter_id)
                ->first();

            if ($grade && $grade->status === 'pending') {
                $grade->status = 'pending'; // Keep as pending, admin will approve
                $grade->save();
                $submittedCount++;
            }
        }

        return response()->json([
            'success' => true,
            'message' => "$submittedCount grades submitted for approval",
            'submitted_count' => $submittedCount,
        ]);
    }

    /**
     * Get submission status for a teacher's grades
     */
    public function getSubmissionStatus(Request $request)
    {
        $teacher = Auth::user()->teacher;

        $validator = Validator::make($request->all(), [
            'subject_id' => 'required|exists:subjects,id',
            'quarter_id' => 'required|exists:quarters,id',
            'section_id' => 'required|exists:sections,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $enrollments = Enrollment::where('section_id', $request->section_id)
            ->where('status', 'Active')
            ->get();

        $stats = [
            'total' => $enrollments->count(),
            'pending' => 0,
            'approved' => 0,
            'rejected' => 0,
            'not_entered' => 0,
        ];

        foreach ($enrollments as $enrollment) {
            $grade = Grade::where('enrollment_id', $enrollment->id)
                ->where('subject_id', $request->subject_id)
                ->where('quarter_id', $request->quarter_id)
                ->first();

            if (!$grade || $grade->final_grade === null) {
                $stats['not_entered']++;
            } elseif ($grade->status === 'pending') {
                $stats['pending']++;
            } elseif ($grade->status === 'approved') {
                $stats['approved']++;
            } elseif ($grade->status === 'rejected') {
                $stats['rejected']++;
            }
        }

        return response()->json([
            'success' => true,
            'stats' => $stats,
        ]);
    }

    /**
     * Get all subjects assigned to the teacher for grading
     * FIXED: Removed unique('subject_id') to show all sections (A, B, C)
     */
    public function getSubjectsForGrading()
    {
        $teacher = Auth::user()->teacher;

        $assignments = TeacherAssignment::with(['subject', 'section.gradeLevel', 'schoolYear'])
            ->where('teacher_id', $teacher->id)
            ->get()
            ->map(function($assignment) {
                return [
                    'subject_id' => $assignment->subject_id,
                    'subject_name' => $assignment->subject->subject_name,
                    'section_id' => $assignment->section_id,
                    'section_name' => $assignment->section->section_name,
                    'grade_level' => $assignment->section->gradeLevel->grade_level,
                    'grade_display' => $assignment->section->gradeLevel->grade_level == 0 ? 'Kinder' : 'Grade ' . $assignment->section->gradeLevel->grade_level,
                ];
            })
            ->values(); // <-- ITO LANG, WALANG unique()

        return response()->json([
            'success' => true,
            'assignments' => $assignments,
        ]);
    }
}