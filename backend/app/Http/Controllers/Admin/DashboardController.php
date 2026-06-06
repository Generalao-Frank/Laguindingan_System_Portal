<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SchoolYear;
use App\Models\Quarter;
use App\Models\Subject;
use App\Models\Section;
use App\Models\Enrollment;
use App\Models\Attendance;
use App\Models\ActivityLog;
use App\Models\Grade;
use App\Models\StudentsInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get all dashboard statistics in one endpoint based on the exact migration schema.
     */
    public function index()
    {
        try {
            // --- 1. Basic counts ---
            $totalStudents = User::where('role', 'Student')->count();
            $totalTeachers = User::where('role', 'Teacher')->count();
            $totalSections = Section::count();

            // --- 2. Gender breakdown ---
            $genderCounts = User::where('role', 'Student')
                ->select('gender', DB::raw('count(*) as total'))
                ->whereIn('gender', ['Male', 'Female'])
                ->groupBy('gender')
                ->pluck('total', 'gender');

            $genderData = [
                ['name' => 'Male', 'value' => $genderCounts->get('Male', 0), 'fill' => '#3B82F6'],
                ['name' => 'Female', 'value' => $genderCounts->get('Female', 0), 'fill' => '#EC4899']
            ];

            // --- 3. Active enrollments ---
            $activeSchoolYear = SchoolYear::where('is_active', true)->first();
            
            $activeEnrollments = 0;
            if ($activeSchoolYear) {
                $activeEnrollments = Enrollment::where('status', 'Active')
                    ->where('school_year_id', $activeSchoolYear->id)
                    ->count();
            }
            $enrollmentRate = $totalStudents > 0 ? round(($activeEnrollments / $totalStudents) * 100, 1) : 0;

            // --- 4. Attendance rate ---
            $attendanceRate = 0;
            $activeQuarter = null;
            
            if ($activeSchoolYear) {
                $activeQuarter = Quarter::where('school_year_id', $activeSchoolYear->id)
                    ->where('is_active', true)
                    ->first();
            }

            if ($activeQuarter) {
                $attendanceStats = Attendance::whereBetween('date', [$activeQuarter->start_date, $activeQuarter->end_date])
                    ->select(
                        DB::raw('count(*) as total_records'),
                        DB::raw("SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_records")
                    )->first();

                if ($attendanceStats && $attendanceStats->total_records > 0) {
                    $attendanceRate = round(($attendanceStats->present_records / $attendanceStats->total_records) * 100, 1);
                }
            }

            // --- 5. Graduation rate (Completed status sa enrollments table) ---
            $enrollmentStats = Enrollment::select(
                DB::raw('count(*) as total_enrollments'),
                DB::raw("SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_enrollments")
            )->first();

            $totalEnrollments = $enrollmentStats->total_enrollments ?? 0;
            $completedEnrollments = $enrollmentStats->completed_enrollments ?? 0;
            $graduationRate = $totalEnrollments > 0 ? round(($completedEnrollments / $totalEnrollments) * 100, 1) : 0;

            // --- 6. Grade level breakdown ---
            $gradeLevelLabels = [
                0 => 'Kinder', 1 => 'Grade 1', 2 => 'Grade 2', 3 => 'Grade 3',
                4 => 'Grade 4', 5 => 'Grade 5', 6 => 'Grade 6',
            ];

            $rawGradeCounts = Enrollment::where('enrollments.status', 'Active')
                ->join('sections', 'enrollments.section_id', '=', 'sections.id')
                ->join('grade_levels', 'sections.grade_level_id', '=', 'grade_levels.id')
                ->select('grade_levels.grade_level', DB::raw('count(*) as total'))
                ->groupBy('grade_levels.grade_level')
                ->pluck('total', 'grade_level');

            $gradeLevelData = [];
            foreach ($gradeLevelLabels as $gradeKey => $label) {
                $gradeLevelData[] = [
                    'grade' => $label,
                    'students' => $rawGradeCounts->get($gradeKey, 0)
                ];
            }

            // --- 7. Recent Activities ---
            $recentActivities = ActivityLog::with(['user', 'student.user'])
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function($log) {
                    return [
                        'id'           => $log->id,
                        'user_id'      => $log->user_id,
                        'student_id'   => $log->student_id,
                        'action_type'  => $log->action_type,
                        'action_label' => $log->action_label ?? $log->action_type,
                        'table_name'   => $log->table_name,
                        'record_id'    => $log->record_id,
                        'old_values'   => $log->old_values,
                        'new_values'   => $log->new_values,
                        'summary'      => $log->summary ?? $log->description,
                        'description'  => $log->description,
                        'ip_address'   => $log->ip_address ?? '0.0.0.0',
                        'user_name'    => $log->user ? $log->user->first_name . ' ' . $log->user->last_name : 'System Admin',
                        'student_name' => $log->student && $log->student->user ? $log->student->user->last_name . ', ' . $log->student->user->first_name : null,
                        'time'         => $log->created_at ? $log->created_at->diffForHumans() : 'Just now',
                        'date_full'    => $log->created_at ? $log->created_at->format('M d, Y h:i A') : null,
                        'color'        => $this->getActivityColor($log->action_type),
                        'icon'         => strtolower($log->action_type ?? 'info'),
                    ];
                });

            // --- 8. Recent Enrollments ---
            $recentEnrollments = Enrollment::join('students_info', 'enrollments.student_id', '=', 'students_info.id')
                ->join('users', 'students_info.user_id', '=', 'users.id')
                ->join('sections', 'enrollments.section_id', '=', 'sections.id')
                ->join('grade_levels', 'sections.grade_level_id', '=', 'grade_levels.id')
                ->select(
                    'enrollments.id',
                    'users.first_name',
                    'users.last_name',
                    'students_info.lrn',
                    'grade_levels.grade_level',
                    'sections.section_name',
                    'enrollments.created_at'
                )
                ->where('enrollments.status', 'Active')
                ->orderBy('enrollments.created_at', 'desc')
                ->limit(4)
                ->get()
                ->map(function($item) {
                    $gradeDisplay = $item->grade_level === 0 ? 'Kinder' : 'Grade ' . $item->grade_level;
                    return [
                        'id' => $item->id,
                        'name' => $item->last_name . ', ' . $item->first_name,
                        'lrn' => $item->lrn ?? 'N/A',
                        'grade' => $gradeDisplay,
                        'section' => $item->section_name,
                        'date' => $item->created_at->format('Y-m-d'),
                    ];
                });

            // --- 9. Enrollment Trend ---
            $currentYear = now()->year;
            $monthlyTrends = Enrollment::whereYear('created_at', $currentYear)
                ->select(DB::raw('MONTH(created_at) as month'), DB::raw('count(*) as total'))
                ->groupBy(DB::raw('MONTH(created_at)'))
                ->pluck('total', 'month');

            $enrollmentTrend = [];
            for ($month = 1; $month <= 12; $month++) {
                $enrollmentTrend[] = [
                    'month' => date('M', mktime(0, 0, 0, $month, 1)),
                    'enrolled' => $monthlyTrends->get($month, 0),
                ];
            }

            // --- 10. Subject Performance ---
            $subjectPerformance = Grade::join('subjects', 'grades.subject_id', '=', 'subjects.id')
                ->whereNotNull('grades.final_grade')
                ->select('subjects.subject_name as subject', DB::raw('round(avg(grades.final_grade), 1) as avg'))
                ->groupBy('subjects.id', 'subjects.subject_name')
                ->orderBy('avg', 'desc')
                ->limit(5)
                ->get()
                ->toArray();

            // --- 11. Attendance by Quarter ---
            $attendanceByQuarter = [];
            if ($activeSchoolYear) {
                $quarters = Quarter::where('school_year_id', $activeSchoolYear->id)->get();
                foreach ($quarters as $quarter) {
                    $qStats = Attendance::join('enrollments', 'attendance.enrollment_id', '=', 'enrollments.id')
                        ->where('enrollments.school_year_id', $activeSchoolYear->id)
                        ->whereBetween('attendance.date', [$quarter->start_date, $quarter->end_date])
                        ->select(
                            DB::raw('count(*) as total'),
                            DB::raw("SUM(CASE WHEN attendance.status = 'Present' THEN 1 ELSE 0 END) as present"),
                            DB::raw("SUM(CASE WHEN attendance.status = 'Late' THEN 1 ELSE 0 END) as late"),
                            DB::raw("SUM(CASE WHEN attendance.status = 'Absent' THEN 1 ELSE 0 END) as absent")
                        )->first();

                    $totalQ = $qStats->total ?? 0;
                    $presentQ = $qStats->present ?? 0;

                    $attendanceByQuarter[] = [
                        'quarter' => $quarter->name,
                        'present' => (int)$presentQ,
                        'late' => (int)($qStats->late ?? 0),
                        'absent' => (int)($qStats->absent ?? 0),
                        'rate' => $totalQ > 0 ? round(($presentQ / $totalQ) * 100, 1) : 0,
                    ];
                }
            } else {
                foreach (['1st Qtr', '2nd Qtr', '3rd Qtr', '4th Qtr'] as $qName) {
                    $attendanceByQuarter[] = ['quarter' => $qName, 'present' => 0, 'late' => 0, 'absent' => 0, 'rate' => 0];
                }
            }

            return response()->json([
                'success' => true,
                'stats' => [
                    'totalStudents' => $totalStudents,
                    'totalTeachers' => $totalTeachers,
                    'totalSections' => $totalSections,
                    'activeEnrollments' => $activeEnrollments,
                    'enrollmentRate' => $enrollmentRate,
                    'attendanceRate' => $attendanceRate,
                    'graduationRate' => $graduationRate,
                ],
                'genderData' => $genderData,
                'gradeLevelData' => $gradeLevelData,
                'enrollmentTrend' => $enrollmentTrend,
                'attendanceByQuarter' => $attendanceByQuarter,
                'subjectPerformance' => $subjectPerformance,
                'recentActivities' => $recentActivities,
                'recentEnrollments' => $recentEnrollments,
                'activeSchoolYear' => $activeSchoolYear ? $activeSchoolYear->year_start . '-' . $activeSchoolYear->year_end : null,
                'activeQuarter' => $activeQuarter ? $activeQuarter->name : null,
            ]);

        } catch (\Exception $e) {
            Log::error('Dashboard error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load dashboard data.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get individual student performance data for StudentPerformance component
     */
    public function studentPerformance($id)
    {
        try {
            // Get student info with user data
            $studentInfo = StudentsInfo::with(['user', 'enrollments.section.gradeLevel', 'enrollments.schoolYear'])
                ->findOrFail($id);
            
            // Get active enrollment
            $activeEnrollment = $studentInfo->enrollments()
                ->where('status', 'Active')
                ->whereHas('schoolYear', function($q) {
                    $q->where('is_active', true);
                })
                ->first();

            if (!$activeEnrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active enrollment found for this student'
                ], 404);
            }

            // Get all grades for this enrollment across all quarters
            $grades = Grade::where('enrollment_id', $activeEnrollment->id)
                ->with('subject')
                ->get();

            // Group grades by subject and calculate quarterly averages
            $subjectGrades = [];
            foreach ($grades as $grade) {
                $subjectName = $grade->subject->subject_name;
                if (!isset($subjectGrades[$subjectName])) {
                    $subjectGrades[$subjectName] = [
                        'subject_name' => $subjectName,
                        'q1' => null,
                        'q2' => null,
                        'q3' => null,
                        'q4' => null,
                    ];
                }
                
                // Calculate average for this grade record (written_works + performance_tasks + quarterly_assessment) / 3
                $quarterAvg = round(($grade->written_works + $grade->performance_tasks + $grade->quarterly_assessment) / 3, 1);
                
                $quarterNum = $grade->quarter_id;
                if ($quarterNum >= 1 && $quarterNum <= 4) {
                    $subjectGrades[$subjectName]['q' . $quarterNum] = $quarterAvg;
                }
            }

            // Calculate subject averages and overall average
            $formattedGrades = [];
            $totalAverage = 0;
            $subjectCount = 0;
            
            foreach ($subjectGrades as $subject) {
                $averages = array_filter([$subject['q1'], $subject['q2'], $subject['q3'], $subject['q4']]);
                $subjectAvg = !empty($averages) ? round(array_sum($averages) / count($averages), 1) : null;
                $totalAverage += $subjectAvg ?? 0;
                if ($subjectAvg !== null) $subjectCount++;
                
                $formattedGrades[] = [
                    'subject_name' => $subject['subject_name'],
                    'q1' => $subject['q1'],
                    'q2' => $subject['q2'],
                    'q3' => $subject['q3'],
                    'q4' => $subject['q4'],
                    'average' => $subjectAvg,
                ];
            }
            
            $overallAverage = $subjectCount > 0 ? round($totalAverage / $subjectCount, 1) : null;

            // Get attendance records for this enrollment
            $attendanceRecords = Attendance::where('enrollment_id', $activeEnrollment->id)->get();
            
            $totalPresent = $attendanceRecords->where('status', 'Present')->count();
            $totalLate = $attendanceRecords->where('status', 'Late')->count();
            $totalAbsent = $attendanceRecords->where('status', 'Absent')->count();
            $totalDays = $attendanceRecords->count();
            
            $attendanceRate = $totalDays > 0 ? round(($totalPresent + $totalLate) / $totalDays * 100, 1) : 0;

            // Monthly attendance breakdown
            $monthlyBreakdown = [];
            $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            foreach ($months as $monthIndex => $monthName) {
                $monthNum = $monthIndex + 1;
                $monthRecords = $attendanceRecords->filter(function($record) use ($monthNum) {
                    return date('n', strtotime($record->date)) == $monthNum;
                });
                
                $present = $monthRecords->where('status', 'Present')->count();
                $late = $monthRecords->where('status', 'Late')->count();
                $absent = $monthRecords->where('status', 'Absent')->count();
                $total = $monthRecords->count();
                $rate = $total > 0 ? round(($present + $late) / $total * 100, 1) : 0;
                
                if ($total > 0) {
                    $monthlyBreakdown[] = [
                        'month' => $monthName,
                        'present' => $present,
                        'late' => $late,
                        'absent' => $absent,
                        'rate' => $rate,
                    ];
                }
            }

            // Determine status based on overall average
            $status = 'Satisfactory';
            $statusColor = 'yellow';
            if ($overallAverage !== null) {
                if ($overallAverage >= 90) {
                    $status = 'Excellent';
                    $statusColor = 'green';
                } elseif ($overallAverage >= 75) {
                    $status = 'Satisfactory';
                    $statusColor = 'yellow';
                } else {
                    $status = 'Poor';
                    $statusColor = 'red';
                }
            }

            // Calculate ranking (simplified - would need more complex query for full ranking)
            $ranking = null;
            // You can implement ranking by comparing with other students in same grade level

            // Prepare student data for response
            $student = [
                'id' => $studentInfo->id,
                'user_id' => $studentInfo->user_id,
                'lrn' => $studentInfo->lrn,
                'first_name' => $studentInfo->user->first_name,
                'last_name' => $studentInfo->user->last_name,
                'middle_name' => $studentInfo->user->middle_name,
                'gender' => $studentInfo->user->gender,
                'grade_level' => $activeEnrollment->section->gradeLevel->grade_level ?? null,
                'section' => $activeEnrollment->section->section_name ?? null,
                'section_id' => $activeEnrollment->section_id,
                'school_year_id' => $activeEnrollment->school_year_id,
                'current_enrollment_id' => $activeEnrollment->id,
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'student' => $student,
                    'grades' => $formattedGrades,
                    'overall_average' => $overallAverage,
                    'attendance' => [
                        'total_present' => $totalPresent,
                        'total_late' => $totalLate,
                        'total_absent' => $totalAbsent,
                        'attendance_rate' => $attendanceRate,
                        'monthly_breakdown' => $monthlyBreakdown,
                    ],
                    'status' => $status,
                    'status_color' => $statusColor,
                    'ranking' => $ranking,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Student performance error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load student performance data.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper: Activity color mapping
     */
    private function getActivityColor($actionType)
    {
        $colors = [
            'CREATE' => '#10B981',       // Emerald
            'UPDATE' => '#3B82F6',       // Blue
            'DELETE' => '#EF4444',       // Red
            'LOGIN' => '#6366F1',        // Indigo
            'LOGOUT' => '#6B7280',       // Gray
            'UPLOAD' => '#A855F7',       // Purple
            'TRANSFER' => '#F97316',     // Orange
            'ENROLL' => '#22C55E',       // Green
            'DROP' => '#F43F5E',         // Rose
            'GRADE_UPDATE' => '#EAB308', // Yellow
        ];
        return $colors[$actionType] ?? '#6B7280';
    }

/**
 * Get today's birthdays (students, teachers, admin)
 */
public function todayBirthdays()
{
    try {
        $today = now()->format('m-d');
        
        // Get students with birthdays today
        $students = User::where('role', 'Student')
            ->whereRaw("DATE_FORMAT(birthdate, '%m-%d') = ?", [$today])
            ->whereNotNull('birthdate')
            ->with('studentInfo.enrollments.section')
            ->get()
            ->map(function($user) {
                $enrollment = $user->studentInfo ? $user->studentInfo->enrollments->first() : null;
                $gradeLevel = $enrollment && $enrollment->section && $enrollment->section->gradeLevel 
                    ? $enrollment->section->gradeLevel->grade_level : null;
                return [
                    'name' => $user->last_name . ', ' . $user->first_name,
                    'role' => 'Student',
                    'grade_section' => $enrollment && $enrollment->section 
                        ? 'Grade ' . ($gradeLevel ?? '?') . ' - ' . $enrollment->section->section_name
                        : 'Student',
                    'age' => Carbon::parse($user->birthdate)->age,
                    'days_until' => 0,
                ];
            });
        
        // Get teachers with birthdays today
        $teachers = User::where('role', 'Teacher')
            ->whereRaw("DATE_FORMAT(birthdate, '%m-%d') = ?", [$today])
            ->whereNotNull('birthdate')
            ->get()
            ->map(function($user) {
                return [
                    'name' => $user->last_name . ', ' . $user->first_name,
                    'role' => 'Teacher',
                    'subject' => 'Faculty Member',
                    'age' => Carbon::parse($user->birthdate)->age,
                    'days_until' => 0,
                ];
            });
        
        // Get admin with birthdays today
        $admins = User::where('role', 'Admin')
            ->whereRaw("DATE_FORMAT(birthdate, '%m-%d') = ?", [$today])
            ->whereNotNull('birthdate')
            ->get()
            ->map(function($user) {
                return [
                    'name' => $user->last_name . ', ' . $user->first_name,
                    'role' => 'Admin',
                    'position' => 'School Administrator',
                    'age' => Carbon::parse($user->birthdate)->age,
                    'days_until' => 0,
                ];
            });
        
        $birthdays = $students->concat($teachers)->concat($admins);
        
        return response()->json([
            'success' => true,
            'birthdays' => $birthdays,
            'count' => $birthdays->count()
        ]);
        
    } catch (\Exception $e) {
        Log::error('Today birthdays error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch birthdays: ' . $e->getMessage(),
            'birthdays' => []
        ], 500);
    }
}
/**
 * Get birthdays (today, upcoming within 30 days, and all sorted)
 */
public function birthdays(Request $request)
{
    try {
        $todayMonthDay = now()->format('m-d');
        
        // Get all users with birthdates
        $users = User::whereNotNull('birthdate')
            ->select('id', 'first_name', 'last_name', 'birthdate', 'role')
            ->get();
        
        $allBirthdays = [];
        $todayBirthdays = [];
        $upcomingBirthdays = [];
        
        foreach ($users as $user) {
            $birthdate = Carbon::parse($user->birthdate);
            $birthMonthDay = $birthdate->format('m-d');
            
            // Calculate next birthday date
            $nextBirthday = Carbon::parse($user->birthdate);
            $nextBirthday->year(now()->year);
            if ($nextBirthday->isPast()) {
                $nextBirthday->addYear();
            }
            $daysUntil = now()->diffInDays($nextBirthday);
            
            // Get role-specific info
            $roleInfo = $this->getRoleInfo($user);
            
            $birthdayInfo = [
                'id' => $user->id,
                'name' => $user->last_name . ', ' . $user->first_name,
                'role' => $user->role,
                'birthdate' => $birthdate->format('Y-m-d'),
                'age' => $birthdate->age,
                'days_until' => $daysUntil,
            ];
            
            // Merge role info
            foreach ($roleInfo as $key => $value) {
                $birthdayInfo[$key] = $value;
            }
            
            $allBirthdays[] = $birthdayInfo;
            
            // Check if today
            if ($birthMonthDay === $todayMonthDay) {
                $todayBirthdays[] = $birthdayInfo;
            }
            // Check if within 30 days (excluding today)
            elseif ($daysUntil <= 30 && $daysUntil > 0) {
                $upcomingBirthdays[] = $birthdayInfo;
            }
        }
        
        // Sort upcoming birthdays by days_until (ascending)
        usort($upcomingBirthdays, function($a, $b) {
            return $a['days_until'] - $b['days_until'];
        });
        
        // Sort all birthdays by days_until (ascending)
        usort($allBirthdays, function($a, $b) {
            return $a['days_until'] - $b['days_until'];
        });
        
        return response()->json([
            'success' => true,
            'today' => array_values($todayBirthdays),
            'upcoming' => array_values($upcomingBirthdays),
            'all' => $allBirthdays,
            'total' => count($allBirthdays)
        ]);
        
    } catch (\Exception $e) {
        Log::error('Birthdays error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch birthdays: ' . $e->getMessage(),
            'today' => [],
            'upcoming' => [],
            'all' => []
        ], 500);
    }
}
/**
 * Get role-specific information for birthday display
 */
private function getRoleInfo($user)
{
    // For Student role with studentInfo
    if ($user->role === 'Student' && $user->studentInfo) {
        $enrollment = $user->studentInfo->enrollments->first();
        $gradeLevel = $enrollment && $enrollment->section && $enrollment->section->gradeLevel 
            ? $enrollment->section->gradeLevel->grade_level : null;
        return [
            'grade_section' => $enrollment && $enrollment->section 
                ? 'Grade ' . ($gradeLevel ?? '?') . ' - ' . $enrollment->section->section_name
                : 'Student'
        ];
    } 
    // For Student role without studentInfo (fallback)
    elseif ($user->role === 'Student') {
        return ['grade_section' => 'Student'];
    }
    // For Teacher role
    elseif ($user->role === 'Teacher') {
        return ['subject' => 'Faculty Member'];
    }
    // For Admin role
    elseif ($user->role === 'Admin') {
        return ['position' => 'School Administrator'];
    }
    // For any other role (Staff, etc.)
    else {
        return ['position' => ucfirst($user->role ?? 'Staff')];
    }
}
}