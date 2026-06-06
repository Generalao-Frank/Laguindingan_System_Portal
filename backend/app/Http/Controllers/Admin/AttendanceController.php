<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\Section;
use App\Models\SchoolYear;
use App\Models\Quarter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    // Get attendance records for a specific section and date
    public function index(Request $request)
    {
        $request->validate([
            'section_id' => 'required|exists:sections,id',
            'date' => 'required|date',
        ]);

        $section = Section::find($request->section_id);
        
        // Get all active enrollments in the section
        $enrollments = Enrollment::where('section_id', $request->section_id)
            ->where('status', 'Active')
            ->with(['student.user', 'student'])
            ->get();
        
        // Get attendance records for the date - use distinct student_id
        $attendanceRecords = Attendance::where('date', $request->date)
            ->whereIn('enrollment_id', $enrollments->pluck('id'))
            ->get()
            ->keyBy('enrollment_id');
        
        $result = [];
        foreach ($enrollments as $enrollment) {
            $user = $enrollment->student->user;
            $attendance = $attendanceRecords->get($enrollment->id);
            
            $result[] = [
                'id' => $attendance ? $attendance->id : null,
                'student_id' => $enrollment->student_id,
                'student_name' => $user->last_name . ', ' . $user->first_name . ' ' . $user->middle_name,
                'lrn' => $enrollment->student->lrn,
                'enrollment_id' => $enrollment->id,
                'time_in' => $attendance ? $attendance->time_in : null,
                'time_out' => $attendance ? $attendance->time_out : null,
                'status' => $attendance ? $attendance->status : 'Absent',
                'remarks' => $attendance ? $attendance->remarks : null,
            ];
        }
        
        return response()->json([
            'success' => true,
            'attendance' => $result,
            'section' => [
                'id' => $section->id,
                'name' => $section->section_name,
                'grade_display' => $section->gradeLevel ? 
                    ($section->gradeLevel->grade_level == 0 ? 'Kinder' : 'Grade ' . $section->gradeLevel->grade_level) : 'N/A',
            ],
            'date' => $request->date,
        ]);
    }

    // Get attendance report
    public function report(Request $request)
    {
        $request->validate([
            'section_id' => 'required|exists:sections,id',
            'report_type' => 'required|in:daily,weekly,monthly,quarterly,custom',
            'start_date' => 'required_if:report_type,custom|date',
            'end_date' => 'required_if:report_type,custom|date',
            'quarter_id' => 'required_if:report_type,quarterly|exists:quarters,id',
        ]);

        $section = Section::find($request->section_id);
        
        // Determine date range based on report type
        list($startDate, $endDate) = $this->getDateRange($request);
        
        // Get all active enrollments in the section
        $enrollments = Enrollment::where('section_id', $request->section_id)
            ->where('status', 'Active')
            ->with(['student.user', 'student'])
            ->get();
        
        $enrollmentIds = $enrollments->pluck('id');
        
        // If no enrollments, return empty report
        if ($enrollments->isEmpty()) {
            return response()->json([
                'success' => true,
                'report' => [
                    'summary' => [
                        'totalDays' => 0,
                        'totalStudents' => 0,
                        'totalAttendance' => 0,
                        'averageDailyAttendance' => 0,
                        'overallAttendanceRate' => 0,
                        'topPerformingDay' => null,
                        'lowPerformingDay' => null,
                    ],
                    'dailyStats' => [],
                    'weeklyStats' => [],
                    'monthlyStats' => [],
                    'studentRankings' => [],
                    'statusBreakdown' => ['present' => 0, 'late' => 0, 'absent' => 0],
                    'trends' => ['weekly' => [], 'monthly' => []],
                ],
                'filters' => [
                    'section' => $section->section_name,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'report_type' => $request->report_type,
                ]
            ]);
        }
        
        // Get attendance records for the date range
        $attendanceRecords = Attendance::whereBetween('date', [$startDate, $endDate])
            ->whereIn('enrollment_id', $enrollmentIds)
            ->get();
        
        // Calculate summary statistics
        $summary = $this->calculateSummary($attendanceRecords, $enrollments, $startDate, $endDate);
        
        // Generate daily/weekly/monthly stats
        $stats = $this->generateStats($attendanceRecords, $enrollments, $startDate, $endDate, $request->report_type);
        
        // Calculate student rankings
        $studentRankings = $this->calculateStudentRankings($attendanceRecords, $enrollments);
        
        // Calculate status breakdown
        $statusBreakdown = $this->calculateStatusBreakdown($attendanceRecords);
        
        // Calculate trends
        $trends = $this->calculateTrends($attendanceRecords, $enrollments, $startDate, $endDate);
        
        return response()->json([
            'success' => true,
            'report' => [
                'summary' => $summary,
                'dailyStats' => $stats['daily'],
                'weeklyStats' => $stats['weekly'],
                'monthlyStats' => $stats['monthly'],
                'studentRankings' => $studentRankings,
                'statusBreakdown' => $statusBreakdown,
                'trends' => $trends,
            ],
            'filters' => [
                'section' => $section->section_name,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'report_type' => $request->report_type,
            ]
        ]);
    }

    private function getDateRange($request)
    {
        $today = Carbon::today();
        
        switch ($request->report_type) {
            case 'daily':
                return [$today->copy()->subDays(30)->toDateString(), $today->toDateString()];
            case 'weekly':
                return [$today->copy()->subWeeks(4)->startOfWeek()->toDateString(), $today->toDateString()];
            case 'monthly':
                return [$today->copy()->subMonths(5)->startOfMonth()->toDateString(), $today->toDateString()];
            case 'quarterly':
                $quarter = Quarter::find($request->quarter_id);
                if (!$quarter) {
                    return [$today->copy()->subDays(30)->toDateString(), $today->toDateString()];
                }
                return [$quarter->start_date, $quarter->end_date];
            case 'custom':
                return [$request->start_date, $request->end_date];
            default:
                return [$today->copy()->subDays(30)->toDateString(), $today->toDateString()];
        }
    }

    private function calculateSummary($attendanceRecords, $enrollments, $startDate, $endDate)
    {
        $totalDays = max(1, Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate)) + 1);
        $totalStudents = $enrollments->count();
        
        // Get unique dates that have attendance records
        $uniqueDates = $attendanceRecords->unique('date')->pluck('date')->toArray();
        $actualSchoolDays = count($uniqueDates);
        
        // Count UNIQUE student attendance per day (not total records)
        $uniqueAttendanceCount = 0;
        foreach ($uniqueDates as $date) {
            $uniqueStudentsOnDate = $attendanceRecords
                ->where('date', $date)
                ->unique('enrollment_id')
                ->count();
            $uniqueAttendanceCount += $uniqueStudentsOnDate;
        }
        
        $totalPossible = $totalStudents * $actualSchoolDays;
        $overallAttendanceRate = $totalPossible > 0 
            ? round(($uniqueAttendanceCount / $totalPossible) * 100, 1) 
            : 0;
        
        $averageDailyAttendance = $actualSchoolDays > 0 ? round($uniqueAttendanceCount / $actualSchoolDays, 1) : 0;
        
        // Find top and low performing days using UNIQUE students
        $dailyAttendance = [];
        foreach ($uniqueDates as $date) {
            $uniqueCount = $attendanceRecords
                ->where('date', $date)
                ->unique('enrollment_id')
                ->count();
            $rate = $totalStudents > 0 ? round(($uniqueCount / $totalStudents) * 100, 1) : 0;
            $dailyAttendance[] = ['date' => $date, 'count' => $uniqueCount, 'rate' => $rate];
        }
        
        usort($dailyAttendance, fn($a, $b) => $b['rate'] <=> $a['rate']);
        $topDay = $dailyAttendance[0] ?? null;
        $lowDay = end($dailyAttendance) ?: null;
        
        return [
            'totalDays' => $actualSchoolDays,
            'totalStudents' => $totalStudents,
            'totalAttendance' => $uniqueAttendanceCount,
            'averageDailyAttendance' => $averageDailyAttendance,
            'overallAttendanceRate' => min(100, $overallAttendanceRate),
            'topPerformingDay' => $topDay ? $topDay['date'] : null,
            'lowPerformingDay' => $lowDay ? $lowDay['date'] : null,
        ];
    }

    private function generateStats($attendanceRecords, $enrollments, $startDate, $endDate, $reportType)
    {
        $totalStudents = $enrollments->count();
        
        if ($reportType === 'daily') {
            // Daily stats - ONLY show dates that have attendance records
            $dailyStats = [];
            
            // Get unique dates that have attendance records
            $datesWithAttendance = $attendanceRecords->unique('date')->pluck('date')->toArray();
            
            // Sort dates chronologically
            sort($datesWithAttendance);
            
            foreach ($datesWithAttendance as $date) {
                $recordsOnDate = $attendanceRecords->where('date', $date);
                $uniquePresent = $recordsOnDate->where('status', 'Present')->unique('enrollment_id')->count();
                $uniqueLate = $recordsOnDate->where('status', 'Late')->unique('enrollment_id')->count();
                $uniquePresentOrLate = $recordsOnDate->unique('enrollment_id')->count();
                $absent = max(0, $totalStudents - $uniquePresentOrLate);
                
                $dailyStats[] = [
                    'date' => $date,
                    'present' => $uniquePresent,
                    'late' => $uniqueLate,
                    'absent' => $absent,
                    'rate' => $totalStudents > 0 ? min(100, round(($uniquePresentOrLate / $totalStudents) * 100, 1)) : 0
                ];
            }
            
            return ['daily' => $dailyStats, 'weekly' => [], 'monthly' => []];
        } 
        
        if ($reportType === 'weekly') {
            $weeklyStats = [];
            $start = Carbon::parse($startDate);
            $end = Carbon::parse($endDate);
            
            // Get unique weeks that have attendance
            $weeksWithAttendance = [];
            foreach ($attendanceRecords->unique('date') as $record) {
                $weekNum = Carbon::parse($record->date)->weekOfYear;
                $year = Carbon::parse($record->date)->year;
                $weeksWithAttendance["{$year}-W{$weekNum}"] = $weekNum;
            }
            
            foreach ($weeksWithAttendance as $weekKey => $weekNum) {
                $weekStart = Carbon::now()->setISODate($year, $weekNum)->startOfWeek();
                $weekEnd = Carbon::now()->setISODate($year, $weekNum)->endOfWeek();
                
                $weekRecords = $attendanceRecords->filter(function($record) use ($weekStart, $weekEnd) {
                    $recordDate = Carbon::parse($record->date);
                    return $recordDate >= $weekStart && $recordDate <= $weekEnd;
                });
                
                // Get unique dates in this week that have attendance
                $weekDates = $weekRecords->unique('date')->pluck('date')->toArray();
                $totalUniqueAttendance = 0;
                foreach ($weekDates as $weekDate) {
                    $uniqueOnDate = $weekRecords->where('date', $weekDate)->unique('enrollment_id')->count();
                    $totalUniqueAttendance += $uniqueOnDate;
                }
                
                $present = $weekRecords->where('status', 'Present')->unique('enrollment_id')->count();
                $late = $weekRecords->where('status', 'Late')->unique('enrollment_id')->count();
                $totalPossible = $totalStudents * count($weekDates);
                $rate = $totalPossible > 0 ? min(100, round(($totalUniqueAttendance / $totalPossible) * 100, 1)) : 0;
                
                $weeklyStats[] = [
                    'week' => 'Week ' . $weekNum,
                    'present' => $present,
                    'late' => $late,
                    'absent' => max(0, $totalPossible - $totalUniqueAttendance),
                    'rate' => $rate,
                ];
            }
            return ['daily' => [], 'weekly' => $weeklyStats, 'monthly' => []];
        }
        
        // Monthly stats - ONLY show months that have attendance records
        $monthlyStats = [];
        $monthsWithAttendance = [];
        
        foreach ($attendanceRecords->unique('date') as $record) {
            $monthYear = Carbon::parse($record->date)->format('Y-m');
            $monthsWithAttendance[$monthYear] = Carbon::parse($record->date)->format('M');
        }
        
        foreach ($monthsWithAttendance as $monthYear => $monthName) {
            $monthStart = Carbon::parse($monthYear . '-01')->startOfMonth();
            $monthEnd = Carbon::parse($monthYear . '-01')->endOfMonth();
            
            $monthRecords = $attendanceRecords->filter(function($record) use ($monthStart, $monthEnd) {
                $recordDate = Carbon::parse($record->date);
                return $recordDate >= $monthStart && $recordDate <= $monthEnd;
            });
            
            // Get unique dates in this month that have attendance
            $monthDates = $monthRecords->unique('date')->pluck('date')->toArray();
            $totalUniqueAttendance = 0;
            foreach ($monthDates as $monthDate) {
                $uniqueOnDate = $monthRecords->where('date', $monthDate)->unique('enrollment_id')->count();
                $totalUniqueAttendance += $uniqueOnDate;
            }
            
            $present = $monthRecords->where('status', 'Present')->unique('enrollment_id')->count();
            $late = $monthRecords->where('status', 'Late')->unique('enrollment_id')->count();
            $totalPossible = $totalStudents * count($monthDates);
            $rate = $totalPossible > 0 ? min(100, round(($totalUniqueAttendance / $totalPossible) * 100, 1)) : 0;
            
            $monthlyStats[] = [
                'month' => $monthName,
                'present' => $present,
                'late' => $late,
                'absent' => max(0, $totalPossible - $totalUniqueAttendance),
                'rate' => $rate,
            ];
        }
        
        return ['daily' => [], 'weekly' => [], 'monthly' => $monthlyStats];
    }

    private function calculateStudentRankings($attendanceRecords, $enrollments)
    {
        // Get unique dates that have attendance
        $totalDays = $attendanceRecords->unique('date')->count();
        if ($totalDays === 0) return [];
        
        $studentAttendance = [];
        foreach ($enrollments as $enrollment) {
            $user = $enrollment->student->user;
            $studentRecords = $attendanceRecords->where('enrollment_id', $enrollment->id);
            
            $present = $studentRecords->where('status', 'Present')->count();
            $late = $studentRecords->where('status', 'Late')->count();
            $attendedDays = $studentRecords->unique('date')->count(); // UNIQUE days attended
            $absent = max(0, $totalDays - $attendedDays);
            $rate = $totalDays > 0 ? min(100, round(($attendedDays / $totalDays) * 100, 1)) : 0;
            
            $studentAttendance[] = [
                'name' => $user->last_name . ', ' . $user->first_name,
                'present' => $present,
                'late' => $late,
                'absent' => $absent,
                'rate' => $rate
            ];
        }
        
        usort($studentAttendance, fn($a, $b) => $b['rate'] <=> $a['rate']);
        return array_slice($studentAttendance, 0, 10);
    }

    private function calculateStatusBreakdown($attendanceRecords)
    {
        return [
            'present' => $attendanceRecords->where('status', 'Present')->unique('enrollment_id')->count(),
            'late' => $attendanceRecords->where('status', 'Late')->unique('enrollment_id')->count(),
            'absent' => 0,
        ];
    }

    private function calculateTrends($attendanceRecords, $enrollments, $startDate, $endDate)
    {
        $totalStudents = $enrollments->count();
        if ($totalStudents === 0) return ['weekly' => [], 'monthly' => []];
        
        // Weekly trends using UNIQUE students - only weeks with attendance
        $weeklyTrends = [];
        $weeksWithAttendance = [];
        
        foreach ($attendanceRecords->unique('date') as $record) {
            $weekNum = Carbon::parse($record->date)->weekOfYear;
            $year = Carbon::parse($record->date)->year;
            $weeksWithAttendance["{$year}-W{$weekNum}"] = ['week' => $weekNum, 'year' => $year];
        }
        
        foreach ($weeksWithAttendance as $weekData) {
            $weekNum = $weekData['week'];
            $year = $weekData['year'];
            $weekStart = Carbon::now()->setISODate($year, $weekNum)->startOfWeek();
            $weekEnd = Carbon::now()->setISODate($year, $weekNum)->endOfWeek();
            
            $weekRecords = $attendanceRecords->filter(function($record) use ($weekStart, $weekEnd) {
                $recordDate = Carbon::parse($record->date);
                return $recordDate >= $weekStart && $recordDate <= $weekEnd;
            });
            
            $weekDates = $weekRecords->unique('date')->pluck('date')->toArray();
            $totalUniqueAttendance = 0;
            foreach ($weekDates as $weekDate) {
                $totalUniqueAttendance += $weekRecords->where('date', $weekDate)->unique('enrollment_id')->count();
            }
            
            $totalPossible = $totalStudents * count($weekDates);
            $rate = $totalPossible > 0 ? min(100, round(($totalUniqueAttendance / $totalPossible) * 100, 1)) : 0;
            $weeklyTrends[] = ['week' => 'Week ' . $weekNum, 'rate' => $rate];
        }
        
        // Monthly trends using UNIQUE students - only months with attendance
        $monthlyTrends = [];
        $monthsWithAttendance = [];
        
        foreach ($attendanceRecords->unique('date') as $record) {
            $monthYear = Carbon::parse($record->date)->format('Y-m');
            $monthsWithAttendance[$monthYear] = Carbon::parse($record->date)->format('M');
        }
        
        foreach ($monthsWithAttendance as $monthYear => $monthName) {
            $monthStart = Carbon::parse($monthYear . '-01')->startOfMonth();
            $monthEnd = Carbon::parse($monthYear . '-01')->endOfMonth();
            
            $monthRecords = $attendanceRecords->filter(function($record) use ($monthStart, $monthEnd) {
                $recordDate = Carbon::parse($record->date);
                return $recordDate >= $monthStart && $recordDate <= $monthEnd;
            });
            
            $monthDates = $monthRecords->unique('date')->pluck('date')->toArray();
            $totalUniqueAttendance = 0;
            foreach ($monthDates as $monthDate) {
                $totalUniqueAttendance += $monthRecords->where('date', $monthDate)->unique('enrollment_id')->count();
            }
            
            $totalPossible = $totalStudents * count($monthDates);
            $rate = $totalPossible > 0 ? min(100, round(($totalUniqueAttendance / $totalPossible) * 100, 1)) : 0;
            $monthlyTrends[] = ['month' => $monthName, 'rate' => $rate];
        }
        
        return ['weekly' => $weeklyTrends, 'monthly' => $monthlyTrends];
    }

    // Helper function to get array of dates between start and end
    private function getDateRangeArray($startDate, $endDate)
    {
        $dates = [];
        $current = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        
        while ($current <= $end) {
            $dates[] = $current->toDateString();
            $current->addDay();
        }
        
        return $dates;
    }

    // Get attendance summary for a section and quarter
    public function summary(Request $request)
    {
        $request->validate([
            'section_id' => 'required|exists:sections,id',
            'quarter_id' => 'required|exists:quarters,id',
        ]);
        
        $section = Section::find($request->section_id);
        $quarter = Quarter::find($request->quarter_id);
        
        $enrollments = Enrollment::where('section_id', $request->section_id)
            ->where('status', 'Active')
            ->get();
        
        $attendanceRecords = Attendance::whereBetween('date', [$quarter->start_date, $quarter->end_date])
            ->whereIn('enrollment_id', $enrollments->pluck('id'))
            ->get();
        
        // Daily summary - ONLY show dates that have attendance records
        $dailySummary = [];
        $datesWithAttendance = $attendanceRecords->unique('date')->pluck('date')->toArray();
        sort($datesWithAttendance);
        
        foreach ($datesWithAttendance as $date) {
            $recordsOnDate = $attendanceRecords->where('date', $date);
            $uniquePresent = $recordsOnDate->where('status', 'Present')->unique('enrollment_id')->count();
            $uniqueLate = $recordsOnDate->where('status', 'Late')->unique('enrollment_id')->count();
            $totalPresentOrLate = $recordsOnDate->unique('enrollment_id')->count();
            
            $dailySummary[] = [
                'date' => $date,
                'present' => $uniquePresent,
                'late' => $uniqueLate,
                'absent' => max(0, $enrollments->count() - $totalPresentOrLate),
            ];
        }
        
        return response()->json([
            'success' => true,
            'summary' => [
                'daily' => $dailySummary,
                'weekly' => [],
                'monthly' => [],
            ]
        ]);
    }

    /**
     * Get quarterly attendance summary (for ViewAttendance page)
     * Supports optional grade level and section filters.
     * Weekly trend uses date range labels (e.g. "May 15 - May 21") with correct absent counts.
     */
    public function quarterlySummary(Request $request)
    {
        $request->validate([
            'school_year_id' => 'required|exists:school_years,id',
            'quarter_id'     => 'required|exists:quarters,id',
            'grade_level'    => 'nullable|integer|min:0|max:6',
            'section_id'     => 'nullable|exists:sections,id',
        ]);

        $schoolYearId = $request->school_year_id;
        $quarterId    = $request->quarter_id;
        $gradeLevel   = $request->grade_level;
        $sectionId    = $request->section_id;

        // Kunin ang quarter date range
        $quarter = Quarter::with('schoolYear')->findOrFail($quarterId);
        $startDate = $quarter->start_date;
        $endDate   = $quarter->end_date;

        // --- Kunin ang lahat ng enrollment na aktibo sa loob ng quarter ---
        $enrollmentsQuery = Enrollment::where('school_year_id', $schoolYearId)
            ->where('date_enrolled', '<=', $endDate)
            ->with(['student.user', 'section.gradeLevel']);

        // Filter ayon sa grade level (kung ibinigay)
        if ($gradeLevel !== null) {
            $enrollmentsQuery->whereHas('section.gradeLevel', function ($q) use ($gradeLevel) {
                $q->where('grade_level', $gradeLevel);
            });
        }

        // Filter ayon sa section (kung ibinigay)
        if ($sectionId) {
            $enrollmentsQuery->where('section_id', $sectionId);
        }

        $enrollments = $enrollmentsQuery->get();

        // Kung walang enrollment, magbalik ng walang laman
        if ($enrollments->isEmpty()) {
            return response()->json([
                'success' => true,
                'stats' => [
                    'totalStudents'  => 0,
                    'present'        => 0,
                    'late'           => 0,
                    'absent'         => 0,
                    'attendanceRate' => 0,
                    'weeklyTrend'    => [],
                ],
                'students' => [],
            ]);
        }

        // Kunin ang mga attendance records sa loob ng quarter para sa mga enrollment na ito
        $attendanceRecords = Attendance::whereIn('enrollment_id', $enrollments->pluck('id'))
            ->whereBetween('date', [$startDate, $endDate])
            ->get();

        // --- Kabuuang istatistika ---
        $presentCount = $attendanceRecords->where('status', 'Present')->count();
        $lateCount    = $attendanceRecords->where('status', 'Late')->count();
        // Walang 'Absent' na record, kaya absentCount ay hindi na ginagamit sa overall stats. 
        // Sa weekly trend natin kukuwentahin ang absent.

        // Bilang ng araw na may attendance (maaaring hindi lahat ng araw ng quarter)
        $uniqueDates = $attendanceRecords->unique('date')->count();
        $totalPossible = $enrollments->count() * $uniqueDates;
        $attendanceRate = $totalPossible > 0 ? round(($presentCount + $lateCount) / $totalPossible * 100, 1) : 0;
        $attendanceRate = min(100, $attendanceRate);

        // --- Weekly trend na may date range labels at tamang absent ---
        $weeklyStats = [];
        $start = Carbon::parse($startDate);
        $end   = Carbon::parse($endDate);
        $currentWeekStart = $start->copy()->startOfWeek();

        $totalStudents = $enrollments->count();

        while ($currentWeekStart <= $end) {
            $weekEnd = $currentWeekStart->copy()->endOfWeek();
            $weekRecords = $attendanceRecords->filter(function ($record) use ($currentWeekStart, $weekEnd) {
                $recordDate = Carbon::parse($record->date);
                return $recordDate >= $currentWeekStart && $recordDate <= $weekEnd;
            });

            // Bilang ng mga araw sa linggong ito na may kahit isang attendance record
            $daysInWeek = $weekRecords->unique('date')->count();

            // Kabuuang posibleng attendance entries sa linggong ito (kung lahat ng estudyante ay pumasok sa lahat ng araw na may attendance)
            $totalPossibleThisWeek = $totalStudents * $daysInWeek;

            $presentThisWeek = $weekRecords->where('status', 'Present')->count();
            $lateThisWeek    = $weekRecords->where('status', 'Late')->count();
            $absentThisWeek  = max(0, $totalPossibleThisWeek - ($presentThisWeek + $lateThisWeek));

            $label = $currentWeekStart->format('M d') . ' - ' . $weekEnd->format('M d');
            
            $weeklyStats[] = [
                'week'    => $label,
                'present' => $presentThisWeek,
                'late'    => $lateThisWeek,
                'absent'  => $absentThisWeek,
            ];
            
            $currentWeekStart->addWeek();
        }

        // --- Per‑student summary (may attendance rate at status) ---
        $totalDaysInQuarter = $uniqueDates; // araw na may attendance records
        $students = [];
        foreach ($enrollments as $enrollment) {
            $studentInfo = $enrollment->student;
            $user = $studentInfo->user;
            $section = $enrollment->section;
            $gradeLevelObj = $section->gradeLevel ?? null;

            $studentRecords = $attendanceRecords->where('enrollment_id', $enrollment->id);
            $presentDays = $studentRecords->where('status', 'Present')->count();
            $lateDays    = $studentRecords->where('status', 'Late')->count();
            // Walang absent records, kaya absentDays ay computed
            $attendedDays = $presentDays + $lateDays;
            $absentDays   = max(0, $totalDaysInQuarter - $attendedDays);

            $studentAttendanceRate = $totalDaysInQuarter > 0 ? round($attendedDays / $totalDaysInQuarter * 100, 1) : 0;
            $studentAttendanceRate = min(100, $studentAttendanceRate);

            // Tukuyin ang status batay sa attendance rate
            if ($studentAttendanceRate >= 90) {
                $status = 'Excellent';
                $statusColor = 'green';
            } elseif ($studentAttendanceRate >= 75) {
                $status = 'Satisfactory';
                $statusColor = 'yellow';
            } else {
                $status = 'Poor';
                $statusColor = 'red';
            }

            $students[] = [
                'id'              => $user->id,
                'name'            => $user->last_name . ', ' . $user->first_name . ' ' . $user->middle_name,
                'lrn'             => $studentInfo->lrn,
                'profile_picture' => $user->profile_picture ? asset('storage/' . $user->profile_picture) : null,
                'grade_level'     => $gradeLevelObj ? $gradeLevelObj->grade_level : null,
                'grade_display'   => $gradeLevelObj ? ($gradeLevelObj->grade_level == 0 ? 'Kinder' : 'Grade ' . $gradeLevelObj->grade_level) : 'N/A',
                'section'         => $section->section_name ?? null,
                'present_days'    => $presentDays,
                'late_days'       => $lateDays,
                'absent_days'     => $absentDays,
                'attendance_rate' => $studentAttendanceRate,
                'status'          => $status,
                'status_color'    => $statusColor,
            ];
        }

        // Alisin ang posibleng duplicate (kung ang isang estudyante ay may maraming enrollment sa parehong quarter)
        $students = collect($students)->unique('id')->values()->toArray();

        return response()->json([
            'success' => true,
            'stats' => [
                'totalStudents'  => $enrollments->count(),
                'present'        => $presentCount,
                'late'           => $lateCount,
                'absent'         => 0, // hindi na ginagamit sa frontend pie chart? pero iwan na lang
                'attendanceRate' => $attendanceRate,
                'weeklyTrend'    => $weeklyStats,
            ],
            'students' => $students,
        ]);
    }
}