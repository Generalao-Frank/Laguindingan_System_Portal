<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\StudentsInfo;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Attendance;
use App\Models\Activity;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Submission;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'student_name' => 'Guest',
                    'lrn' => 'N/A',
                    'grade_level' => 'N/A',
                    'section' => 'N/A',
                    'total_subjects' => 0,
                    'average_grade' => 0,
                    'attendance_percentage' => 0,
                    'pending_activities' => 0,
                ]);
            }
            
            $student = StudentsInfo::where('user_id', $user->id)->first();
            
            if (!$student) {
                return response()->json([
                    'student_name' => $user->first_name . ' ' . $user->last_name,
                    'lrn' => 'N/A',
                    'grade_level' => 'N/A',
                    'section' => 'Not Enrolled',
                    'total_subjects' => 0,
                    'average_grade' => 0,
                    'attendance_percentage' => 0,
                    'pending_activities' => 0,
                ]);
            }
            
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            $enrollment = Enrollment::where('student_id', $student->id);
            if ($currentSchoolYear) {
                $enrollment = $enrollment->where('school_year_id', $currentSchoolYear->id);
            }
            $enrollment = $enrollment->first();
            
            // Get grade_level and section names
            $gradeLevel = 'N/A';
            $sectionName = 'Not Enrolled';
            $totalSubjects = 0;
            $averageGrade = 0;
            $attendancePercentage = 0;
            $pendingActivities = 0;
            
            if ($enrollment) {
                if ($enrollment->section) {
                    $gradeLevel = $enrollment->section->grade_level_id ?? 'N/A';
                    $sectionName = $enrollment->section->section_name ?? 'N/A';
                }
                
                // Get grades
                $grades = Grade::where('enrollment_id', $enrollment->id)->get();
                $totalSubjects = $grades->count();
                $averageGrade = $grades->avg('final_grade') ?? 0;
                
                // Get attendance
                $totalSchoolDays = Attendance::where('enrollment_id', $enrollment->id)->count();
                $presentDays = Attendance::where('enrollment_id', $enrollment->id)
                    ->where('status', 'Present')
                    ->count();
                
                $attendancePercentage = $totalSchoolDays > 0 
                    ? round(($presentDays / $totalSchoolDays) * 100, 2) 
                    : 0;
                
                // Get pending activities
                $pendingActivities = Activity::where('section_id', $enrollment->section_id)
                    ->whereDoesntHave('submissions', function($query) use ($enrollment) {
                        $query->where('enrollment_id', $enrollment->id);
                    })
                    ->count();
            }
            
            return response()->json([
                'student_name' => $user->first_name . ' ' . $user->last_name,
                'lrn' => $student->lrn ?? 'N/A',
                'grade_level' => $gradeLevel,
                'section' => $sectionName,
                'total_subjects' => $totalSubjects,
                'average_grade' => round($averageGrade, 2),
                'attendance_percentage' => $attendancePercentage,
                'pending_activities' => $pendingActivities,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Dashboard error: ' . $e->getMessage());
            
            return response()->json([
                'student_name' => 'Student',
                'lrn' => 'N/A',
                'grade_level' => 'N/A',
                'section' => 'N/A',
                'total_subjects' => 0,
                'average_grade' => 0,
                'attendance_percentage' => 0,
                'pending_activities' => 0,
            ]);
        }
    }
}