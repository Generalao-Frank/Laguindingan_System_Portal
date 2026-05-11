<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\StudentsInfo;
use App\Models\Enrollment;
use App\Models\Attendance;
use App\Models\SchoolYear;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            $student = StudentsInfo::where('user_id', $user->id)->first();
            
            if (!$student) {
                return response()->json([
                    'attendance' => [],
                    'summary' => ['present' => 0, 'late' => 0, 'absent' => 0],
                ]);
            }
            
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            $enrollment = Enrollment::where('student_id', $student->id)
                ->where('school_year_id', $currentSchoolYear->id ?? 1)
                ->first();
            
            if (!$enrollment) {
                return response()->json([
                    'attendance' => [],
                    'summary' => ['present' => 0, 'late' => 0, 'absent' => 0],
                ]);
            }
            
            $attendances = Attendance::where('enrollment_id', $enrollment->id)
                ->orderBy('date', 'desc')
                ->get()
                ->map(function($attendance) {
                    // Get subject from teacher_id
                    $subject = null;
                    if ($attendance->teacher_id) {
                        $subject = \App\Models\TeacherAssignment::where('teacher_id', $attendance->teacher_id)
                            ->where('section_id', $attendance->enrollment->section_id)
                            ->with('subject')
                            ->first();
                    }
                    
                    return [
                        'date' => $attendance->date,
                        'status' => strtolower($attendance->status),
                        'subject' => $subject->subject->subject_name ?? 'N/A',
                        'time_in' => $attendance->time_in,
                        'time_out' => $attendance->time_out,
                    ];
                });
            
            $summary = [
                'present' => Attendance::where('enrollment_id', $enrollment->id)
                    ->where('status', 'Present')
                    ->count(),
                'late' => Attendance::where('enrollment_id', $enrollment->id)
                    ->where('status', 'Late')
                    ->count(),
                'absent' => Attendance::where('enrollment_id', $enrollment->id)
                    ->where('status', 'Absent')
                    ->count(),
            ];
            
            return response()->json([
                'attendance' => $attendances,
                'summary' => $summary,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Attendance error: ' . $e->getMessage());
            Log::error('Line: ' . $e->getLine());
            Log::error('File: ' . $e->getFile());
            
            return response()->json([
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ], 500);
        }
    }
}