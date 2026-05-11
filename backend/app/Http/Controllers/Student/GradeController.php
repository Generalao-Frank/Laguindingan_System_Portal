<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\StudentsInfo;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\SchoolYear;
use App\Models\TeacherAssignment;
use App\Models\User;
use App\Models\Subject;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class GradeController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $student = StudentsInfo::where('user_id', $user->id)->first();
        
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        $enrollment = Enrollment::where('student_id', $student->id)
            ->where('school_year_id', $currentSchoolYear->id)
            ->first();
        
        if (!$enrollment) {
            return response()->json(['grades' => []]);
        }
        
        // Kunin ang lahat ng subjects na may grades para sa enrollment na ito
        $subjects = Subject::whereHas('grades', function($query) use ($enrollment) {
            $query->where('enrollment_id', $enrollment->id);
        })->get();
        
        $result = [];
        
        foreach ($subjects as $subject) {
            // Kunin ang lahat ng quarters para sa subject na ito
            $grades = Grade::where('enrollment_id', $enrollment->id)
                ->where('subject_id', $subject->id)
                ->get()
                ->keyBy('quarter_id'); // I-group by quarter_id
            
            // Get teacher name
            $teacherAssignment = TeacherAssignment::where('subject_id', $subject->id)
                ->where('section_id', $enrollment->section_id)
                ->where('school_year_id', $enrollment->school_year_id)
                ->first();
            
            $teacherName = 'N/A';
            if ($teacherAssignment && $teacherAssignment->teacher) {
                $teacher = User::find($teacherAssignment->teacher->user_id);
                if ($teacher) {
                    $teacherName = $teacher->first_name . ' ' . $teacher->last_name;
                }
            }
            
            // I-structure ang quarters array (1st to 4th quarter)
            $quarters = [];
            for ($q = 1; $q <= 4; $q++) {
                $grade = $grades->get($q);
                
                $quarters[] = [
                    'quarter' => $q,
                    'written_works' => $grade ? floatval($grade->written_works) : 0,
                    'performance_tasks' => $grade ? floatval($grade->performance_tasks) : 0,
                    'quarterly_assessment' => $grade ? floatval($grade->quarterly_assessment) : 0,
                    'final_grade' => $grade ? floatval($grade->final_grade) : null,
                ];
            }
            
            $result[] = [
                'subject' => $subject->subject_name,
                'teacher' => $teacherName,
                'quarters' => $quarters,
            ];
        }
        
        return response()->json([
            'grades' => $result,
        ]);
    }
}