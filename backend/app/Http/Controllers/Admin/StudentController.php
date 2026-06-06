<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\StudentsInfo;
use App\Models\Enrollment;
use App\Models\StudentStatusHistory;
use App\Models\Section;
use App\Models\SchoolYear;
use App\Models\ActivityLog;  // ✅ IDAGDAG ITO
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class StudentController extends Controller
{
    /**
     * Get all students with complete info (Optimized with Eager Loading)
     */
  public function index()
{
    $users = User::where('role', 'Student')
        ->with([
            'studentInfo.enrollments' => function($query) {
                // Kunin ang pinakabagong enrollment (hindi lang active)
                $query->orderBy('created_at', 'desc')->limit(1);
            },
        ])
        ->orderBy('created_at', 'desc')
        ->get();

    $students = $users->map(function($user) {
        $studentInfo = $user->studentInfo;
        // Kunin ang pinakabagong enrollment (active man o hindi)
        $latestEnrollment = $studentInfo ? $studentInfo->enrollments->sortByDesc('created_at')->first() : null;

        $gradeLevelValue = null;
        $schoolYearValue = null;
        $schoolYearId = null;
        $enrollmentId = null;
        $sectionId = null;
        $sectionName = null;
        $enrollmentStatus = 'Not Enrolled';
        
        if ($latestEnrollment) {
            if ($latestEnrollment->section && $latestEnrollment->section->gradeLevel) {
                $gradeLevelValue = $latestEnrollment->section->gradeLevel->grade_level;
            }
            if ($latestEnrollment->schoolYear) {
                $schoolYearValue = $latestEnrollment->schoolYear->year_start . '-' . $latestEnrollment->schoolYear->year_end;
                $schoolYearId = $latestEnrollment->school_year_id;
            }
            $enrollmentId = $latestEnrollment->id;
            $sectionId = $latestEnrollment->section_id;
            $sectionName = $latestEnrollment->section ? $latestEnrollment->section->section_name : null;
            $enrollmentStatus = $latestEnrollment->status; // Active, Dropped, Completed, etc.
        }

        return [
            'id' => $user->id,
            'student_info_id' => $studentInfo ? $studentInfo->id : null,
            'lrn' => $studentInfo ? $studentInfo->lrn : null,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'full_name' => $user->last_name . ', ' . $user->first_name . ' ' . $user->middle_name,
            'gender' => $user->gender,
            'birthdate' => $user->birthdate,
            'address' => $user->address,
            'contact_number' => $user->contact_number,
            'profile_picture' => $user->profile_picture ? asset('storage/' . $user->profile_picture) : null,
            'guardian_name' => $studentInfo ? $studentInfo->guardian_name : null,
            'guardian_contact_number' => $studentInfo ? $studentInfo->guardian_contact_number : null,
            'psa_number' => $studentInfo ? $studentInfo->PSA_Number : null,
            'father_name' => $studentInfo ? $studentInfo->father_name : null,
            'mother_name' => $studentInfo ? $studentInfo->mother_name : null,
            'grade_level' => $gradeLevelValue,
            'grade_level_display' => $this->getGradeDisplay($gradeLevelValue),
            'section' => $sectionName,
            'section_id' => $sectionId,
            'status' => $enrollmentStatus, // Active, Dropped, Completed, Transferred
            'enrollment_id' => $enrollmentId,
            'school_year' => $schoolYearValue,
            'school_year_id' => $schoolYearId,
            'has_qr' => $studentInfo && $studentInfo->qrCode ? true : false,
            'created_at' => $user->created_at,
            'current_enrollment' => $latestEnrollment ? [
                'id' => $latestEnrollment->id,
                'section_id' => $latestEnrollment->section_id,
                'section' => $sectionName,
                'grade_level' => $gradeLevelValue,
                'school_year_id' => $schoolYearId,
                'school_year' => $schoolYearValue,
                'status' => $enrollmentStatus,
            ] : null,
        ];
    });

    return response()->json([
        'success' => true,
        'students' => $students
    ]);
}

    /**
     * Get student statistics
     */
    public function stats()
    {
        $totalStudents = User::where('role', 'Student')->count();
        
        $genderCounts = User::where('role', 'Student')
            ->selectRaw("SUM(case when gender = 'Male' then 1 else 0 end) as male")
            ->selectRaw("SUM(case when gender = 'Female' then 1 else 0 end) as female")
            ->first();

        $thisMonth = User::where('role', 'Student')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        $gradeLevelBreakdown = array_fill(0, 7, 0);

        $enrollmentStats = Enrollment::join('sections', 'enrollments.section_id', '=', 'sections.id')
            ->join('grade_levels', 'sections.grade_level_id', '=', 'grade_levels.id')
            ->where('enrollments.status', 'Active')
            ->select('grade_levels.grade_level', DB::raw('count(*) as total'))
            ->groupBy('grade_levels.grade_level')
            ->pluck('total', 'grade_level')
            ->toArray();

        foreach ($enrollmentStats as $grade => $count) {
            if (isset($gradeLevelBreakdown[$grade])) {
                $gradeLevelBreakdown[$grade] = (int)$count;
            }
        }

        return response()->json([
            'success' => true,
            'stats' => [
                'totalStudents' => $totalStudents,
                'thisMonth' => $thisMonth,
                'maleCount' => (int)($genderCounts->male ?? 0),
                'femaleCount' => (int)($genderCounts->female ?? 0),
                'gradeLevelBreakdown' => $gradeLevelBreakdown,
                'totalSections' => Section::count(),
            ]
        ]);
    }

    /**
     * Get single student with full details
     */
    public function show($id)
    {
        $user = User::where('role', 'Student')->with(['studentInfo.qrCode'])->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found'
            ], 404);
        }

        $currentEnrollment = null;
        $enrollmentHistory = [];

        if ($user->studentInfo) {
            $currentEnrollment = Enrollment::where('student_id', $user->studentInfo->id)
                ->with(['section.gradeLevel', 'schoolYear'])
                ->where('status', 'Active')
                ->first();

            $enrollmentHistory = Enrollment::where('student_id', $user->studentInfo->id)
                ->with(['section.gradeLevel', 'schoolYear'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($enrollment) {
                    $gradeLevelValue = $enrollment->section && $enrollment->section->gradeLevel
                        ? $enrollment->section->gradeLevel->grade_level
                        : null;
                    return [
                        'id' => $enrollment->id,
                        'school_year' => $enrollment->schoolYear ? $enrollment->schoolYear->year_start . '-' . $enrollment->schoolYear->year_end : 'N/A',
                        'grade_level' => $gradeLevelValue,
                        'grade_display' => $this->getGradeDisplay($gradeLevelValue),
                        'section' => $enrollment->section ? $enrollment->section->section_name : null,
                        'status' => $enrollment->status,
                        'date_enrolled' => $enrollment->date_enrolled,
                    ];
                });
        }

        $currentGradeLevel = null;
        if ($currentEnrollment && $currentEnrollment->section && $currentEnrollment->section->gradeLevel) {
            $currentGradeLevel = $currentEnrollment->section->gradeLevel->grade_level;
        }

        return response()->json([
            'success' => true,
            'student' => [
                'id' => $user->id,
                'student_info_id' => $user->studentInfo ? $user->studentInfo->id : null,
                'lrn' => $user->studentInfo ? $user->studentInfo->lrn : null,
                'first_name' => $user->first_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'gender' => $user->gender,
                'birthdate' => $user->birthdate,
                'address' => $user->address,
                'contact_number' => $user->contact_number,
                'profile_picture' => $user->profile_picture ? asset('storage/' . $user->profile_picture) : null,
                'guardian_name' => $user->studentInfo ? $user->studentInfo->guardian_name : null,
                'guardian_contact_number' => $user->studentInfo ? $user->studentInfo->guardian_contact_number : null,
                'psa_number' => $user->studentInfo ? $user->studentInfo->PSA_Number : null,
                'father_name' => $user->studentInfo ? $user->studentInfo->father_name : null,
                'mother_name' => $user->studentInfo ? $user->studentInfo->mother_name : null,
                'has_qr' => $user->studentInfo && $user->studentInfo->qrCode ? true : false,
                'current_enrollment' => $currentEnrollment ? [
                    'id' => $currentEnrollment->id,
                    'grade_level' => $currentGradeLevel,
                    'grade_display' => $this->getGradeDisplay($currentGradeLevel),
                    'section' => $currentEnrollment->section ? $currentEnrollment->section->section_name : null,
                    'section_id' => $currentEnrollment->section_id,
                    'school_year' => $currentEnrollment->schoolYear ? $currentEnrollment->schoolYear->year_start . '-' . $currentEnrollment->schoolYear->year_end : 'N/A',
                    'status' => $currentEnrollment->status,
                ] : null,
                'enrollment_history' => $enrollmentHistory,
            ]
        ]);
    }

    /**
     * Get student by LRN
     */
    public function findByLrn($lrn)
    {
        $studentInfo = StudentsInfo::where('lrn', $lrn)->first();

        if (!$studentInfo) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found'
            ], 404);
        }

        $user = User::find($studentInfo->user_id);

        $currentEnrollment = Enrollment::where('student_id', $studentInfo->id)
            ->with('section.gradeLevel')
            ->where('status', 'Active')
            ->first();

        $gradeLevelValue = null;
        if ($currentEnrollment && $currentEnrollment->section && $currentEnrollment->section->gradeLevel) {
            $gradeLevelValue = $currentEnrollment->section->gradeLevel->grade_level;
        }

        return response()->json([
            'success' => true,
            'student' => [
                'id' => $user->id,
                'student_info_id' => $studentInfo->id,
                'lrn' => $studentInfo->lrn,
                'first_name' => $user->first_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'gender' => $user->gender,
                'birthdate' => $user->birthdate,
                'address' => $user->address,
                'contact_number' => $user->contact_number,
                'profile_picture' => $user->profile_picture ? asset('storage/' . $user->profile_picture) : null,
                'guardian_name' => $studentInfo->guardian_name,
                'guardian_contact_number' => $studentInfo->guardian_contact_number,
                'psa_number' => $studentInfo->PSA_Number,
                'father_name' => $studentInfo->father_name,
                'mother_name' => $studentInfo->mother_name,
                'grade_level' => $gradeLevelValue,
                'grade_display' => $this->getGradeDisplay($gradeLevelValue),
                'section' => $currentEnrollment && $currentEnrollment->section ? $currentEnrollment->section->section_name : null,
            ]
        ]);
    }

    /**
     * Create new student (enroll)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lrn' => 'required|string|size:12|unique:students_info,lrn',
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'gender' => 'required|in:Male,Female',
            'birthdate' => 'required|date',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:15',
            'guardian_name' => 'required|string|max:255',
            'guardian_contact_number' => 'required|string|max:15',
            'grade_level' => 'required|numeric|min:0|max:6',
            'section_id' => 'required|exists:sections,id',
            'psa_number' => 'nullable|string|unique:students_info,PSA_Number',
            'father_name' => 'nullable|string|max:255',
            'mother_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|unique:users,email',
            'password' => 'required|string|min:6',
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
            $username = $request->lrn;
            $contactNumber = $request->contact_number ?? '';

            $user = User::create([
                'first_name' => strtoupper($request->first_name),
                'middle_name' => strtoupper($request->middle_name ?? ''),
                'last_name' => strtoupper($request->last_name),
                'gender' => $request->gender,
                'birthdate' => $request->birthdate,
                'address' => strtoupper($request->address ?? ''),
                'contact_number' => $contactNumber,
                'username' => $username,
                'email' => $request->email ?? null,
                'password' => Hash::make($request->password),
                'role' => 'Student',
            ]);

            $studentInfo = StudentsInfo::create([
                'user_id' => $user->id,
                'lrn' => $request->lrn,
                'PSA_Number' => $request->psa_number,
                'father_name' => strtoupper($request->father_name ?? ''),
                'mother_name' => strtoupper($request->mother_name ?? ''),
                'guardian_name' => strtoupper($request->guardian_name),
                'guardian_contact_number' => $request->guardian_contact_number,
            ]);

            $schoolYear = SchoolYear::where('is_active', true)->first() ?? SchoolYear::first();

            $section = Section::with('gradeLevel')->find($request->section_id);
            $sectionGradeLevel = $section && $section->gradeLevel ? $section->gradeLevel->grade_level : null;

            Enrollment::create([
                'student_id' => $studentInfo->id,
                'section_id' => $request->section_id,
                'school_year_id' => $schoolYear ? $schoolYear->id : null,
                'date_enrolled' => now(),
                'status' => 'Active',
            ]);

            StudentStatusHistory::create([
                'student_id' => $studentInfo->id,
                'school_year_id' => $schoolYear ? $schoolYear->id : null,
                'status' => 'Enrolled',
                'effective_date' => now(),
                'remarks' => 'New enrollment for SY ' . ($schoolYear ? $schoolYear->year_start . '-' . $schoolYear->year_end : 'N/A') . ' - ' . $this->getGradeDisplay($sectionGradeLevel) . ' - ' . ($section ? $section->section_name : ''),
                'changed_by' => $this->getCurrentUserId() ?? 1,
            ]);

            // ✅ RECORD ENROLL ACTIVITY IN AUDIT LOGS
            ActivityLog::create([
                'user_id' => $this->getCurrentUserId(),
                'student_id' => $studentInfo->id,
                'action_type' => 'ENROLL',
                'table_name' => 'students_info',
                'record_id' => $studentInfo->id,
                'old_values' => null,
                'new_values' => [
                    'first_name' => $request->first_name,
                    'last_name' => $request->last_name,
                    'lrn' => $request->lrn,
                    'section_id' => $request->section_id,
                ],
                'description' => 'Enrolled new student: ' . $request->last_name . ', ' . $request->first_name . ' (LRN: ' . $request->lrn . ')',
                'ip_address' => request()->ip(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Student enrolled successfully',
                'student' => [
                    'id' => $user->id,
                    'student_info_id' => $studentInfo->id,
                    'lrn' => $request->lrn,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'username' => $username,
                    'password' => $request->password,
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Student enrollment failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to enroll student: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update student
     */
    public function update(Request $request, $id)
    {
        $user = User::where('role', 'Student')->with('studentInfo')->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found'
            ], 404);
        }

        // Get old values before update
        $oldValues = [
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'lrn' => $user->studentInfo ? $user->studentInfo->lrn : null,
            'guardian_name' => $user->studentInfo ? $user->studentInfo->guardian_name : null,
        ];

        $validator = Validator::make($request->all(), [
            'lrn' => 'nullable|string|max:12|unique:students_info,lrn,' . ($user->studentInfo ? $user->studentInfo->id : 'NULL'),
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'gender' => 'required|in:Male,Female',
            'birthdate' => 'required|date',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:15',
            'guardian_name' => 'required|string|max:255',
            'guardian_contact_number' => 'required|string|max:15',
            'grade_level' => 'nullable|numeric|min:0|max:6',
            'section_id' => 'nullable|exists:sections,id',
            'psa_number' => 'nullable|string|unique:students_info,PSA_Number,' . ($user->studentInfo ? $user->studentInfo->id : 'NULL'),
            'father_name' => 'nullable|string|max:255',
            'mother_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
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
            $user->update([
                'first_name' => strtoupper($request->first_name),
                'middle_name' => strtoupper($request->middle_name ?? ''),
                'last_name' => strtoupper($request->last_name),
                'gender' => $request->gender,
                'birthdate' => $request->birthdate,
                'address' => strtoupper($request->address ?? ''),
                'contact_number' => $request->contact_number ?? '',
                'email' => $request->email ?? $user->email,
            ]);

            if ($request->filled('password')) {
                $user->update(['password' => Hash::make($request->password)]);
            }

            $newValues = [];
            if ($user->studentInfo) {
                $newValues = [
                    'lrn' => $request->lrn ?? $user->studentInfo->lrn,
                    'guardian_name' => $request->guardian_name,
                ];
                
                $user->studentInfo->update([
                    'lrn' => $request->lrn ?? $user->studentInfo->lrn,
                    'PSA_Number' => $request->psa_number,
                    'father_name' => strtoupper($request->father_name ?? ''),
                    'mother_name' => strtoupper($request->mother_name ?? ''),
                    'guardian_name' => strtoupper($request->guardian_name),
                    'guardian_contact_number' => $request->guardian_contact_number,
                ]);
            }

            // ✅ RECORD UPDATE ACTIVITY IN AUDIT LOGS
            ActivityLog::create([
                'user_id' => $this->getCurrentUserId(),
                'student_id' => $user->studentInfo ? $user->studentInfo->id : null,
                'action_type' => 'UPDATE',
                'table_name' => 'students_info',
                'record_id' => $id,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'description' => 'Updated student information for: ' . $request->last_name . ', ' . $request->first_name,
                'ip_address' => request()->ip(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Student updated successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Student update failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update student: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete student
     */
    public function destroy($id)
    {
        $user = User::where('role', 'Student')->with('studentInfo')->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found'
            ], 404);
        }

        // Get old values before deletion
        $oldValues = [
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'lrn' => $user->studentInfo ? $user->studentInfo->lrn : null,
            'student_info_id' => $user->studentInfo ? $user->studentInfo->id : null,
        ];

        DB::beginTransaction();

        try {
            if ($user->studentInfo) {
                Enrollment::where('student_id', $user->studentInfo->id)->delete();
                StudentStatusHistory::where('student_id', $user->studentInfo->id)->delete();
                $user->studentInfo->delete();
            }
            $user->delete();

            // ✅ RECORD DELETE ACTIVITY IN AUDIT LOGS
            ActivityLog::create([
                'user_id' => $this->getCurrentUserId(),
                'student_id' => $oldValues['student_info_id'],
                'action_type' => 'DELETE',
                'table_name' => 'students_info',
                'record_id' => $id,
                'old_values' => $oldValues,
                'new_values' => null,
                'description' => 'Deleted student: ' . $oldValues['last_name'] . ', ' . $oldValues['first_name'] . ' (LRN: ' . ($oldValues['lrn'] ?? 'N/A') . ')',
                'ip_address' => request()->ip(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Student deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Student deletion failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete student: ' . $e->getMessage()
            ], 500);
        }
    }
/**
 * Transfer student to another section
 */
/**
 * Transfer student to another section
 */
public function transfer(Request $request, $id)
{
    try {
        $user = User::where('role', 'Student')->with('studentInfo')->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'new_section_id' => 'required|exists:sections,id',
            'reason' => 'nullable|string',
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
            $studentInfo = $user->studentInfo;
            
            // Get the current active enrollment
            $currentEnrollment = Enrollment::where('student_id', $studentInfo->id)
                ->where('status', 'Active')
                ->first();

            if (!$currentEnrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active enrollment found for this student'
                ], 404);
            }

            // ✅ Check if new section is the same as current section
            if ($currentEnrollment->section_id == $request->new_section_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student is already in this section'
                ], 422);
            }

            $oldSection = $currentEnrollment->section ? $currentEnrollment->section->section_name : 'Unknown';
            $newSection = Section::find($request->new_section_id);
            $newSectionName = $newSection ? $newSection->section_name : 'Unknown';
            $oldSectionId = $currentEnrollment->section_id;
            $oldStatus = $currentEnrollment->status;

            // ✅ UPDATE the existing enrollment instead of creating a new one
            $currentEnrollment->update([
                'section_id' => $request->new_section_id,
                'date_enrolled' => now(),
                'status' => 'Active'  // Keep as Active
            ]);

            // Record in student status history
            StudentStatusHistory::create([
                'student_id' => $studentInfo->id,
                'school_year_id' => $currentEnrollment->school_year_id,
                'status' => 'Enrolled',
                'effective_date' => now(),
                'remarks' => 'Transferred from ' . $oldSection . ' to ' . $newSectionName . '. Reason: ' . ($request->reason ?? 'No reason provided'),
                'changed_by' => 1,
            ]);

            // Record in audit logs
            try {
                ActivityLog::create([
                    'user_id' => 1,
                    'student_id' => $studentInfo->id,
                    'action_type' => 'TRANSFER',
                    'table_name' => 'enrollments',
                    'record_id' => $currentEnrollment->id,
                    'old_values' => [
                        'section' => $oldSection, 
                        'section_id' => $oldSectionId,
                        'status' => $oldStatus
                    ],
                    'new_values' => [
                        'section' => $newSectionName, 
                        'section_id' => $request->new_section_id,
                        'status' => 'Active'
                    ],
                    'description' => 'Transferred student ' . $user->last_name . ', ' . $user->first_name . ' from ' . $oldSection . ' to ' . $newSectionName,
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Exception $logError) {
                Log::warning('Activity log creation failed: ' . $logError->getMessage());
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Student transferred successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Student transfer error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to transfer student: ' . $e->getMessage()
            ], 500);
        }
    } catch (\Exception $e) {
        Log::error('Student transfer outer error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to transfer student: ' . $e->getMessage()
        ], 500);
    }
}
    /**
     * Get student status history
     */
    public function getStatusHistory($id)
    {
        $user = User::where('role', 'Student')->with('studentInfo')->find($id);

        if (!$user || !$user->studentInfo) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found'
            ], 404);
        }

        $history = StudentStatusHistory::where('student_id', $user->studentInfo->id)
            ->with(['schoolYear', 'changedByUser']) 
            ->orderBy('effective_date', 'desc')
            ->get()
            ->map(function($item) {
                $section = null;
                $gradeLevel = null;

                $enrollment = Enrollment::where('student_id', $item->student_id)
                    ->where('school_year_id', $item->school_year_id)
                    ->with('section.gradeLevel')
                    ->first();

                if ($enrollment && $enrollment->section && $enrollment->section->gradeLevel) {
                    $section = $enrollment->section->section_name;
                    $gradeLevel = $enrollment->section->gradeLevel->grade_level;
                }

                $changedByName = $item->changedByUser 
                    ? $item->changedByUser->first_name . ' ' . $item->changedByUser->last_name 
                    : 'System / Admin';

                return [
                    'id' => $item->id,
                    'status' => $item->status ?? 'Enrolled',
                    'school_year_start' => $item->schoolYear ? $item->schoolYear->year_start : null,
                    'school_year_end' => $item->schoolYear ? $item->schoolYear->year_end : null,
                    'school_year' => $item->schoolYear ? $item->schoolYear->year_start . '-' . $item->schoolYear->year_end : 'N/A',
                    'grade_level' => $gradeLevel,
                    'section' => $section,
                    'effective_date' => $item->effective_date,
                    'remarks' => $item->remarks ?? ('Student status updated to ' . $item->status), 
                    'changed_by' => $item->changed_by,
                    'changed_by_name' => $changedByName,
                    'title' => $item->status ?? 'Activity',
                    'description' => $item->remarks ?? 'No extra details provided.',
                ];
            });

        return response()->json([
            'success' => true,
            'history' => $history
        ]);
    }
    /**
 * Drop student
 */
public function drop(Request $request, $id)
{
    try {
        $user = User::where('role', 'Student')->with('studentInfo')->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string',
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
            $studentInfo = $user->studentInfo;
            $currentEnrollment = Enrollment::where('student_id', $studentInfo->id)
                ->where('status', 'Active')
                ->first();

            if (!$currentEnrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active enrollment found for this student'
                ], 404);
            }

            $oldStatus = $currentEnrollment->status;
            $oldSection = $currentEnrollment->section ? $currentEnrollment->section->section_name : 'Unknown';

            // Update enrollment status to 'Dropped'
            $currentEnrollment->update([
                'status' => 'Dropped'
            ]);

            // Record in student status history
            StudentStatusHistory::create([
                'student_id' => $studentInfo->id,
                'school_year_id' => $currentEnrollment->school_year_id,
                'status' => 'Dropped',
                'effective_date' => now(),
                'remarks' => $request->reason,
                'changed_by' => 1,
            ]);

            // Record in audit logs
            try {
                ActivityLog::create([
                    'user_id' => 1,
                    'student_id' => $studentInfo->id,
                    'action_type' => 'DROP',
                    'table_name' => 'enrollments',
                    'record_id' => $currentEnrollment->id,
                    'old_values' => [
                        'status' => $oldStatus,
                        'section' => $oldSection
                    ],
                    'new_values' => [
                        'status' => 'Dropped',
                        'reason' => $request->reason
                    ],
                    'description' => 'Dropped student: ' . $user->last_name . ', ' . $user->first_name . ' (LRN: ' . ($studentInfo->lrn ?? 'N/A') . '). Reason: ' . $request->reason,
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Exception $logError) {
                Log::warning('Activity log creation failed: ' . $logError->getMessage());
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Student has been dropped successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Student drop error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to drop student: ' . $e->getMessage()
            ], 500);
        }
    } catch (\Exception $e) {
        Log::error('Student drop outer error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to drop student: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Get student performance data
     */
    public function performance($id)
    {
        try {
            $user = User::where('role', 'Student')->with(['studentInfo'])->find($id);
            
            if (!$user || !$user->studentInfo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found'
                ], 404);
            }

            $studentInfo = $user->studentInfo;
            $activeEnrollment = Enrollment::where('student_id', $studentInfo->id)
                ->where('status', 'Active')
                ->with(['section.gradeLevel', 'schoolYear'])
                ->first();

            if (!$activeEnrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active enrollment found for this student'
                ], 404);
            }

            $grades = \App\Models\Grade::where('enrollment_id', $activeEnrollment->id)
                ->with('subject')
                ->get();

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
                
                $quarterAvg = round(($grade->written_works + $grade->performance_tasks + $grade->quarterly_assessment) / 3, 1);
                
                $quarterNum = $grade->quarter_id;
                if ($quarterNum == 1) $subjectGrades[$subjectName]['q1'] = $quarterAvg;
                if ($quarterNum == 2) $subjectGrades[$subjectName]['q2'] = $quarterAvg;
                if ($quarterNum == 3) $subjectGrades[$subjectName]['q3'] = $quarterAvg;
                if ($quarterNum == 4) $subjectGrades[$subjectName]['q4'] = $quarterAvg;
            }

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

            $attendanceRecords = \App\Models\Attendance::where('enrollment_id', $activeEnrollment->id)->get();
            
            $totalPresent = $attendanceRecords->where('status', 'Present')->count();
            $totalLate = $attendanceRecords->where('status', 'Late')->count();
            $totalAbsent = $attendanceRecords->where('status', 'Absent')->count();
            $totalDays = $attendanceRecords->count();
            
            $attendanceRate = $totalDays > 0 ? round(($totalPresent + $totalLate) / $totalDays * 100, 1) : 0;

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

            $gradeLevelValue = $activeEnrollment->section && $activeEnrollment->section->gradeLevel 
                ? $activeEnrollment->section->gradeLevel->grade_level 
                : null;

            $studentData = [
                'id' => $studentInfo->id,
                'user_id' => $user->id,
                'lrn' => $studentInfo->lrn,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'middle_name' => $user->middle_name,
                'gender' => $user->gender,
                'grade_level' => $gradeLevelValue,
                'section' => $activeEnrollment->section->section_name ?? null,
                'section_id' => $activeEnrollment->section_id,
                'school_year_id' => $activeEnrollment->school_year_id,
                'current_enrollment_id' => $activeEnrollment->id,
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'student' => $studentData,
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
                    'ranking' => null,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Student performance error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load student performance data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper: Get grade display name
     */
    private function getGradeDisplay($gradeLevel)
    {
        if ($gradeLevel === null) return 'N/A';
        if ($gradeLevel == 0) return 'Kinder';
        return 'Grade ' . $gradeLevel;
    }

    /**
     * Helper: Get current user ID
     */
    private function getCurrentUserId()
    {
        try {
            if (Auth::guard('sanctum')->check()) {
                return Auth::guard('sanctum')->id();
            }
            return null;
        } catch (\Exception $e) {
            return null;
        }
    }
}