<?php

namespace App\Http\Controllers\Teacher;

use App\Models\User;
use Illuminate\Support\Facades\Validator;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\Enrollment;
use App\Models\Attendance;
use App\Models\Activity;
use App\Models\Meeting;

class TeacherMobileController extends Controller
{
    public function dashboard()
    {
        $teacher = Auth::user()->teacher;
        $teacherSections = TeacherAssignment::where('teacher_id', $teacher->id)
            ->with('section')
            ->get()
            ->pluck('section.id')
            ->unique();
        
        $totalStudents = Enrollment::whereIn('section_id', $teacherSections)
            ->where('status', 'Active')
            ->count();
        
        $today = now()->toDateString();
        $attendanceToday = Attendance::whereIn('enrollment_id', function($q) use ($teacherSections) {
                $q->select('id')->from('enrollments')->whereIn('section_id', $teacherSections)->where('status', 'Active');
            })
            ->whereDate('date', $today)
            ->get();
        
        $presentCount = $attendanceToday->where('status', 'Present')->count();
        $totalToday = $attendanceToday->count();
        $todayAttendance = $totalToday > 0 ? round(($presentCount / $totalToday) * 100) : 0;
        
        $pendingActivities = Activity::where('teacher_id', $teacher->id)
            ->whereHas('submissions', function($q) {
                $q->whereNull('points_earned');
            })
            ->count();
        
        return response()->json([
            'totalStudents' => $totalStudents,
            'todayAttendance' => $todayAttendance,
            'pendingActivities' => $pendingActivities,
        ]);
    }

 public function getAttendanceList()
{
    $teacher = Auth::user()->teacher;
    $today = now()->toDateString();

    // Get all teacher assignments (section + subject)
    $assignments = TeacherAssignment::with(['section', 'subject'])
        ->where('teacher_id', $teacher->id)
        ->get();

    $students = [];
    foreach ($assignments as $assignment) {
        $section = $assignment->section;
        $subject = $assignment->subject;

        $enrollments = Enrollment::with(['student.user'])
            ->where('section_id', $section->id)
            ->where('status', 'Active')
            ->get();

        foreach ($enrollments as $enrollment) {
            $attendance = Attendance::where('enrollment_id', $enrollment->id)
                ->where('date', $today)
                ->where('teacher_id', $teacher->id) // critical: only this teacher's marks
                ->first();

            $user = $enrollment->student->user;
            $students[] = [
                'enrollment_id' => $enrollment->id,
                'student_name' => $user->last_name . ', ' . $user->first_name . ' ' . $user->middle_name,
                'lrn' => $enrollment->student->lrn,
                'section' => $section->section_name,
                'subject' => $subject->subject_name, // optional: helps frontend display subject
                'status' => $attendance ? $attendance->status : null,
                'time_in' => $attendance ? $attendance->time_in : null,
            ];
        }
    }

    return response()->json($students);
}

  public function markAttendance(Request $request)
{
    $request->validate([
        'enrollment_id' => 'required|exists:enrollments,id',
        'status' => 'required|in:Present,Late,Absent',
        'time_in' => 'nullable|date_format:H:i:s',
    ]);

    $teacher = Auth::user()->teacher; // get the teacher model
    $today = now()->toDateString();

    $attendance = Attendance::updateOrCreate(
        [
            'enrollment_id' => $request->enrollment_id,
            'date' => $today,
            'teacher_id' => $teacher->id, // include teacher_id
        ],
        [
            'status' => $request->status,
            'time_in' => $request->time_in ?? now()->toTimeString(),
            'remarks' => $request->remarks ?? null,
        ]
    );

    return response()->json(['success' => true, 'attendance' => $attendance]);
}

    public function getActivities()
    {
        $teacher = Auth::user()->teacher;
        
        $activities = Activity::with(['section', 'subject'])
            ->where('teacher_id', $teacher->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($activity) {
                $submittedCount = $activity->submissions()->count();
                $gradedCount = $activity->submissions()->whereNotNull('points_earned')->count();
                return [
                    'id' => $activity->id,
                    'title' => $activity->title,
                    'description' => $activity->description,
                    'deadline' => $activity->deadline,
                    'max_points' => $activity->max_points,
                    'section' => $activity->section->section_name,
                    'subject' => $activity->subject->subject_name,
                    'submitted' => $submittedCount,
                    'graded' => $gradedCount,
                ];
            });
        
        return response()->json($activities);
    }

    public function getMeetings()
    {
        $meetings = Meeting::whereIn('audience', ['Teachers', 'All'])
            ->orderBy('meeting_datetime', 'desc')
            ->get()
            ->map(function($meeting) {
                return [
                    'id' => $meeting->id,
                    'title' => $meeting->title,
                    'description' => $meeting->description,
                    'location' => $meeting->location,
                    'datetime' => $meeting->meeting_datetime,
                    'status' => $meeting->status,
                    'created_by' => $meeting->created_by ? $meeting->creator->first_name . ' ' . $meeting->creator->last_name : 'System',
                ];
            });
        
        return response()->json($meetings);
    }

    public function getProfile()
    {
        $user = Auth::user();
        $teacher = $user->teacher;
        
        return response()->json([
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'gender' => $user->gender,
            'birthdate' => $user->birthdate,
            'address' => $user->address,
            'contact_number' => $user->contact_number,
            'email' => $user->email,
            'employee_id' => $teacher->employee_id,
            'profile_picture' => $user->profile_picture, // store relative path or full URL
        ]);
    }

    public function updateProfile(Request $request)
    {
        $userId = Auth::id();
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }
        $user = User::find($userId);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'gender' => 'required|in:Male,Female',
            'birthdate' => 'nullable|date',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:11',
            'email' => 'nullable|email|unique:users,email,' . $user->id,
            'profile_picture' => 'nullable|string|max:255', // allow storing picture path/URL
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }
        
        $user->first_name = $request->first_name;
        $user->last_name = $request->last_name;
        $user->middle_name = $request->middle_name;
        $user->gender = $request->gender;
        $user->birthdate = $request->birthdate;
        $user->address = $request->address;
        $user->contact_number = $request->contact_number;
        $user->email = $request->email;
        if ($request->has('profile_picture')) {
            $user->profile_picture = $request->profile_picture;
        }
        $user->save();
        
        return response()->json(['success' => true, 'user' => $user]);
    }

    public function getSections()
    {
        $teacher = Auth::user()->teacher;
        $assignments = TeacherAssignment::with(['section.gradeLevel', 'subject', 'schoolYear'])
            ->where('teacher_id', $teacher->id)
            ->get();

        $sections = $assignments->map(function($a) {
            return [
                'id' => $a->section_id,
                'grade_level' => $a->section->gradeLevel->grade_level,
                'section_name' => $a->section->section_name,
                'subject_name' => $a->subject->subject_name,
                'school_year' => $a->schoolYear ? $a->schoolYear->year_start . '-' . $a->schoolYear->year_end : null,
            ];
        })->unique('id')->values();

        return response()->json($sections);
    }
public function updateProfilePicture(Request $request)
{
    $userId = Auth::id();
    if (!$userId) {
        return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
    }
    $user = User::find($userId);
    if (!$user) {
        return response()->json(['success' => false, 'message' => 'User not found'], 404);
    }
    $request->validate([
        'profile_picture' => 'required|string|max:255',
    ]);
    $user->profile_picture = $request->profile_picture;
    $user->save();
    return response()->json(['success' => true, 'profile_picture' => $user->profile_picture]);
}


public function markTimeOut(Request $request)
{
    $request->validate([
        'enrollment_id' => 'required|exists:enrollments,id',
        'time_out' => 'nullable|date_format:H:i:s',
    ]);

    $teacher = Auth::user()->teacher;
    $today = now()->toDateString();

    $attendance = Attendance::where('enrollment_id', $request->enrollment_id)
        ->where('date', $today)
        ->where('teacher_id', $teacher->id)
        ->first();

    if (!$attendance) {
        return response()->json(['success' => false, 'message' => 'No attendance record found for today'], 404);
    }

    $attendance->time_out = $request->time_out ?? now()->toTimeString();
    $attendance->save();

    return response()->json(['success' => true, 'attendance' => $attendance]);
}


public function bulkTimeOut(Request $request)
{
    $teacher = Auth::user()->teacher;
    $today = now()->toDateString();
    $request->validate([
        'enrollment_ids' => 'required|array',
        'enrollment_ids.*' => 'exists:enrollments,id',
    ]);

    $now = now()->toTimeString();
    $updated = 0;

    foreach ($request->enrollment_ids as $enrollment_id) {
        $attendance = Attendance::where('enrollment_id', $enrollment_id)
            ->where('date', $today)
            ->where('teacher_id', $teacher->id)
            ->whereNull('time_out')
            ->first();
        if ($attendance) {
            $attendance->time_out = $now;
            $attendance->save();
            $updated++;
        }
    }

    return response()->json(['success' => true, 'updated' => $updated]);
}


public function storeActivity(Request $request)
{
    $teacher = Auth::user()->teacher;
    $validator = Validator::make($request->all(), [
        'title' => 'required|string|max:255',
        'description' => 'nullable|string',
        'deadline' => 'nullable|date',
        'max_points' => 'required|integer|min:1',
        'section_id' => 'required|exists:sections,id',
        'subject_id' => 'required|exists:subjects,id',
    ]);
    if ($validator->fails()) {
        return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
    }
    $activity = Activity::create([
        'teacher_id' => $teacher->id,
        'section_id' => $request->section_id,
        'subject_id' => $request->subject_id,
        'title' => $request->title,
        'description' => $request->description,
        'deadline' => $request->deadline,
        'max_points' => $request->max_points,
    ]);
    return response()->json(['success' => true, 'activity' => $activity]);
}

public function attendanceHistory($enrollment_id)
{
    $teacher = Auth::user()->teacher;
    $records = Attendance::where('enrollment_id', $enrollment_id)
        ->where('teacher_id', $teacher->id)
        ->orderBy('date', 'desc')
        ->get(['id', 'date', 'status', 'time_in', 'time_out']);
    return response()->json($records);
}

public function storeExpoToken(Request $request)
{
    $user = Auth::user();
    
    if (!$user) {
        return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
    }
    
    $request->validate([
        'expo_token' => 'required|string'
    ]);
    
    // Manually find the user to ensure we have a model instance
    $user = User::find($user->id);
    
    if (!$user) {
        return response()->json(['success' => false, 'message' => 'User not found'], 404);
    }
    
    $user->expo_push_token = $request->expo_token;
    $user->save();
    
    return response()->json(['success' => true]);
}

}