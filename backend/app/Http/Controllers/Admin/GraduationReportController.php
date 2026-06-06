<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\StudentsInfo;
use App\Models\Grade;
use App\Models\SchoolYear;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GraduationReportController extends Controller
{
    /**
     * Get graduation report data
     */
    public function index(Request $request)
    {
        try {
            $query = Enrollment::with(['student.user', 'section.gradeLevel', 'schoolYear'])
                ->where('status', 'Completed'); // Completed = Graduated

            // Filter by school year
            if ($request->has('school_year_id') && $request->school_year_id) {
                $query->where('school_year_id', $request->school_year_id);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->start_date) {
                $query->whereDate('created_at', '>=', $request->start_date);
            }
            if ($request->has('end_date') && $request->end_date) {
                $query->whereDate('created_at', '<=', $request->end_date);
            }

            $graduates = $query->get();

            // --- Summary Statistics ---
            $totalGraduates = $graduates->count();
            
            // Get total enrollments for graduation rate
            $enrollmentQuery = Enrollment::query();
            if ($request->has('school_year_id') && $request->school_year_id) {
                $enrollmentQuery->where('school_year_id', $request->school_year_id);
            }
            $totalEnrollments = $enrollmentQuery->count();
            
            $graduationRate = $totalEnrollments > 0 
                ? round(($totalGraduates / $totalEnrollments) * 100, 1) 
                : 0;

            // Gender breakdown
            $maleGraduates = $graduates->filter(function($graduate) {
                return $graduate->student && $graduate->student->user && $graduate->student->user->gender === 'Male';
            })->count();
            
            $femaleGraduates = $graduates->filter(function($graduate) {
                return $graduate->student && $graduate->student->user && $graduate->student->user->gender === 'Female';
            })->count();

            // Honor counts (based on average grade)
            $withHighestHonors = 0; // >= 98
            $withHighHonors = 0;    // >= 95
            $withHonors = 0;         // >= 90
            
            foreach ($graduates as $graduate) {
                $avgGrade = $this->getStudentAverageGrade($graduate->student_id, $graduate->school_year_id);
                if ($avgGrade >= 98) {
                    $withHighestHonors++;
                } elseif ($avgGrade >= 95) {
                    $withHighHonors++;
                } elseif ($avgGrade >= 90) {
                    $withHonors++;
                }
            }

            // --- Yearly Graduation Trend ---
            $yearlyTrend = Enrollment::where('status', 'Completed')
                ->join('school_years', 'enrollments.school_year_id', '=', 'school_years.id')
                ->select(
                    DB::raw('CONCAT(school_years.year_start, "-", school_years.year_end) as year'),
                    DB::raw('count(*) as graduates')
                )
                ->groupBy('enrollments.school_year_id', 'school_years.year_start', 'school_years.year_end')
                ->orderBy('school_years.year_start', 'asc')
                ->get()
                ->map(function($item) {
                    // Get enrollment count for same year
                    $enrollmentCount = Enrollment::whereHas('schoolYear', function($q) use ($item) {
                        $years = explode('-', $item->year);
                        $q->where('year_start', $years[0])->where('year_end', $years[1]);
                    })->count();
                    
                    return [
                        'year' => $item->year,
                        'graduates' => $item->graduates,
                        'enrollment' => $enrollmentCount,
                        'rate' => $enrollmentCount > 0 ? round(($item->graduates / $enrollmentCount) * 100, 1) : 0
                    ];
                });

            // --- Section Breakdown ---
            $sectionBreakdown = $graduates->groupBy(function($graduate) {
                return $graduate->section ? $graduate->section->section_name : 'Unknown';
            })->map(function($group, $sectionName) use ($request) {
                $totalInSection = Enrollment::where('section_id', $group->first()->section_id)
                    ->when($request->has('school_year_id') && $request->school_year_id, function($q) use ($request) {
                        $q->where('school_year_id', $request->school_year_id);
                    })
                    ->count();
                    
                return [
                    'section' => $sectionName,
                    'completers' => $group->count(),
                    'total' => $totalInSection,
                    'rate' => $totalInSection > 0 ? round(($group->count() / $totalInSection) * 100, 1) : 0
                ];
            })->values();

            // --- Grade Level Completers ---
            $gradeLevelCompleters = $graduates->groupBy(function($graduate) {
                $gradeLevel = $graduate->section && $graduate->section->gradeLevel 
                    ? $graduate->section->gradeLevel->grade_level 
                    : null;
                return $gradeLevel == 6 ? 'Grade 6' : ($gradeLevel == 0 ? 'Kinder' : 'Grade ' . $gradeLevel);
            })->map(function($group, $gradeLevel) use ($request) {
                $totalInGrade = Enrollment::whereHas('section.gradeLevel', function($q) use ($gradeLevel) {
                    $gradeNum = $gradeLevel == 'Kinder' ? 0 : (int)filter_var($gradeLevel, FILTER_SANITIZE_NUMBER_INT);
                    $q->where('grade_level', $gradeNum);
                })
                ->when($request->has('school_year_id') && $request->school_year_id, function($q) use ($request) {
                    $q->where('school_year_id', $request->school_year_id);
                })
                ->count();
                
                return [
                    'grade' => $gradeLevel,
                    'completers' => $group->count(),
                    'total' => $totalInGrade,
                    'rate' => $totalInGrade > 0 ? round(($group->count() / $totalInGrade) * 100, 1) : 0
                ];
            })->values();

            // --- Honor Distribution ---
            $honorDistribution = [
                ['name' => 'With Highest Honors', 'value' => $withHighestHonors, 'color' => '#F59E0B'],
                ['name' => 'With High Honors', 'value' => $withHighHonors, 'color' => '#10B981'],
                ['name' => 'With Honors', 'value' => $withHonors, 'color' => '#3B82F6'],
                ['name' => 'Regular Graduate', 'value' => $totalGraduates - ($withHighestHonors + $withHighHonors + $withHonors), 'color' => '#6B7280']
            ];

            // --- Recent Graduates (last 10) ---
            $recentGraduates = $graduates->sortByDesc('created_at')->take(10)->map(function($graduate) {
                $avgGrade = $this->getStudentAverageGrade($graduate->student_id, $graduate->school_year_id);
                $user = $graduate->student ? $graduate->student->user : null;
                $honor = $this->getHonor($avgGrade);
                
                return [
                    'id' => $graduate->id,
                    'name' => $user ? $user->last_name . ', ' . $user->first_name : 'N/A',
                    'lrn' => $graduate->student ? $graduate->student->lrn : 'N/A',
                    'section' => $graduate->section ? $graduate->section->section_name : 'N/A',
                    'average' => $avgGrade,
                    'honor' => $honor
                ];
            })->values();

            // --- Top Performers ---
            $topPerformers = $graduates->map(function($graduate) {
                $avgGrade = $this->getStudentAverageGrade($graduate->student_id, $graduate->school_year_id);
                $user = $graduate->student ? $graduate->student->user : null;
                $honor = $this->getHonor($avgGrade);
                
                return [
                    'name' => $user ? $user->last_name . ', ' . $user->first_name : 'N/A',
                    'lrn' => $graduate->student ? $graduate->student->lrn : 'N/A',
                    'average' => $avgGrade,
                    'honor' => $honor,
                    'section' => $graduate->section ? $graduate->section->section_name : 'N/A'
                ];
            })->sortByDesc('average')->take(5)->values();

            return response()->json([
                'success' => true,
                'report' => [
                    'summary' => [
                        'totalGraduates' => $totalGraduates,
                        'totalEnrollments' => $totalEnrollments,
                        'graduationRate' => $graduationRate,
                        'maleGraduates' => $maleGraduates,
                        'femaleGraduates' => $femaleGraduates,
                        'withHonors' => $withHonors,
                        'withHighHonors' => $withHighHonors,
                        'withHighestHonors' => $withHighestHonors
                    ],
                    'yearlyGraduationTrend' => $yearlyTrend,
                    'gradeLevelCompleters' => $gradeLevelCompleters,
                    'sectionBreakdown' => $sectionBreakdown,
                    'honorDistribution' => $honorDistribution,
                    'recentGraduates' => $recentGraduates,
                    'topPerformers' => $topPerformers
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Graduation report error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load graduation report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get student's average grade for a specific school year
     */
    private function getStudentAverageGrade($studentId, $schoolYearId)
    {
        $grades = Grade::whereHas('enrollment', function($query) use ($studentId, $schoolYearId) {
            $query->where('student_id', $studentId)
                  ->where('school_year_id', $schoolYearId);
        })->get();

        if ($grades->isEmpty()) {
            return 0;
        }

        $total = 0;
        $count = 0;
        
        foreach ($grades as $grade) {
            $average = ($grade->written_works + $grade->performance_tasks + $grade->quarterly_assessment) / 3;
            $total += $average;
            $count++;
        }

        return $count > 0 ? round($total / $count, 1) : 0;
    }

    /**
     * Get honor based on average grade
     */
    private function getHonor($average)
    {
        if ($average >= 98) {
            return 'With Highest Honors';
        } elseif ($average >= 95) {
            return 'With High Honors';
        } elseif ($average >= 90) {
            return 'With Honors';
        } else {
            return 'Regular Graduate';
        }
    }
}