<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Admin\TeacherController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\GradeLevelController;
use App\Http\Controllers\Admin\SectionController;
use App\Http\Controllers\Admin\SubjectController;
use App\Http\Controllers\Admin\RoomController;
use App\Http\Controllers\Admin\TeacherAssignmentController;
use App\Http\Controllers\Admin\QuarterController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\GradeController;
use App\Http\Controllers\Admin\QRCodeController;
use App\Http\Controllers\Admin\AttendanceController;
use App\Http\Controllers\Admin\EnrollmentController;
use App\Http\Controllers\Admin\BulkEnrollmentController;
use App\Http\Controllers\Admin\MeetingController;
use App\Http\Controllers\Admin\ActivityController;



use App\Http\Controllers\Teacher\TeacherMobileController;
use App\Http\Controllers\Teacher\TeacherGradeController ;
use App\Http\Controllers\Teacher\ActivityController as TeacherActivityController;

use App\Http\Controllers\Student\DashboardController as StudentDashboardController;
use App\Http\Controllers\Student\GradeController as StudentGradeController;
use App\Http\Controllers\Student\AttendanceController as StudentAttendanceController;
use App\Http\Controllers\Student\ActivityController as StudentActivityController;
use App\Http\Controllers\Student\ProfileController as StudentProfileController;
use App\Http\Controllers\Student\AnnouncementController as StudentAnnouncementController;

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\SchoolYearController;



// Public API routes
Route::post('/login', [AuthController::class, 'login']);

// Protected API routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Profile routes
    Route::get('/profile', [ProfileController::class, 'getProfile']);
    Route::post('/upload-profile', [ProfileController::class, 'uploadProfile']);
    Route::delete('/remove-profile', [ProfileController::class, 'removeProfile']);
});

// Admin only routes
Route::middleware(['auth:sanctum', 'role:Admin'])->prefix('admin')->group(function () {
    // Teacher Management
    Route::get('/teachers', [TeacherController::class, 'index']);
    Route::post('/teachers', [TeacherController::class, 'store']);
    Route::get('/teachers/{id}', [TeacherController::class, 'show']);
    Route::put('/teachers/{id}', [TeacherController::class, 'update']);
    Route::delete('/teachers/{id}', [TeacherController::class, 'destroy']);

    // Student Management
    Route::get('/students', [StudentController::class, 'index']);
    Route::get('/students/stats', [StudentController::class, 'stats']);
    Route::post('/students', [StudentController::class, 'store']);
    Route::get('/students/{id}', [StudentController::class, 'show']);
    Route::get('/students/lrn/{lrn}', [StudentController::class, 'findByLrn']);
    Route::put('/students/{id}', [StudentController::class, 'update']);
    Route::delete('/students/{id}', [StudentController::class, 'destroy']);
    Route::post('/students/{id}/transfer', [StudentController::class, 'transfer']);
    Route::post('/students/{id}/drop', [StudentController::class, 'drop']);
    Route::get('/students/{id}/status-history', [StudentController::class, 'getStatusHistory']);

    // School Years - ADD THIS BLOCK
    Route::get('/school-years', [SchoolYearController::class, 'index']);
    Route::get('/school-years/active', [SchoolYearController::class, 'getActive']);
    Route::post('/school-years', [SchoolYearController::class, 'store']);
    Route::put('/school-years/{id}', [SchoolYearController::class, 'update']);
    Route::delete('/school-years/{id}', [SchoolYearController::class, 'destroy']);

    // Grade Level
    Route::get('/grade-levels', [GradeLevelController::class, 'index']);
    Route::get('/grade-levels/{id}', [GradeLevelController::class, 'show']);
    Route::post('/grade-levels', [GradeLevelController::class, 'store']);
    Route::put('/grade-levels/{id}', [GradeLevelController::class, 'update']);
    Route::delete('/grade-levels/{id}', [GradeLevelController::class, 'destroy']);


    // Sections
    Route::get('/sections', [SectionController::class, 'index']);
    Route::get('/grade-levels/{id}/sections', [SectionController::class, 'getSectionsByGradeLevel']);
    Route::post('/sections', [SectionController::class, 'store']);
    Route::put('/sections/{id}', [SectionController::class, 'update']);
    Route::delete('/sections/{id}', [SectionController::class, 'destroy']);
    Route::get('/sections/{id}/students', [SectionController::class, 'getStudents']);

    // Subjects
    Route::get('/subjects', [SubjectController::class, 'index']);
    Route::post('/subjects', [SubjectController::class, 'store']);
    Route::put('/subjects/{id}', [SubjectController::class, 'update']);
    Route::delete('/subjects/{id}', [SubjectController::class, 'destroy']);

    // ==================== ROOMS ====================
Route::get('/rooms', [RoomController::class, 'index']);
Route::get('/rooms/{id}', [RoomController::class, 'show']);
Route::post('/rooms', [RoomController::class, 'store']);
Route::put('/rooms/{id}', [RoomController::class, 'update']);
Route::delete('/rooms/{id}', [RoomController::class, 'destroy']);

// Teacher Assignments
Route::get('/teacher-assignments', [TeacherAssignmentController::class, 'index']);
Route::post('/teacher-assignments', [TeacherAssignmentController::class, 'store']);
Route::put('/teacher-assignments/{id}', [TeacherAssignmentController::class, 'update']);
Route::delete('/teacher-assignments/{id}', [TeacherAssignmentController::class, 'destroy']);

// School Years
Route::get('/school-years', [SchoolYearController::class, 'index']);
Route::get('/school-years/active', [SchoolYearController::class, 'getActive']);
Route::post('/school-years', [SchoolYearController::class, 'store']);
Route::put('/school-years/{id}', [SchoolYearController::class, 'update']);
Route::delete('/school-years/{id}', [SchoolYearController::class, 'destroy']);

// Quarters
Route::get('/quarters', [QuarterController::class, 'index']);
Route::get('/school-years/{id}/quarters', [QuarterController::class, 'getQuartersBySchoolYear']);
Route::post('/quarters', [QuarterController::class, 'store']);
Route::put('/quarters/{id}', [QuarterController::class, 'update']);
Route::delete('/quarters/{id}', [QuarterController::class, 'destroy']);

// Dashboard

 Route::get('/dashboard', [DashboardController::class, 'index']);

// Grades
Route::get('/grades', [GradeController::class, 'index']);
Route::post('/grades/batch', [GradeController::class, 'batchStore']);
Route::get('/grades/pending', [GradeController::class, 'pendingGrades']);
Route::get('/grades/stats', [GradeController::class, 'stats']);
Route::post('/grades/{id}/approve', [GradeController::class, 'approveGrade']);
Route::post('/grades/{id}/reject', [GradeController::class, 'rejectGrade']);

// QR Code Management
Route::get('/qr/stats', [QRCodeController::class, 'stats']);
Route::post('/qr/generate', [QRCodeController::class, 'generate']);
Route::post('/qr/bulk-generate', [QRCodeController::class, 'bulkGenerate']);
Route::get('/qr/student/{id}', [QRCodeController::class, 'getStudentQR']);

// ==================== ATTENDANCE ====================
Route::get('/attendance', [AttendanceController::class, 'index']);
Route::get('/attendance/report', [AttendanceController::class, 'report']);
Route::get('/attendance/summary', [AttendanceController::class, 'summary']);

// ==================== ENROLLMENTS ====================
Route::get('/enrollments', [EnrollmentController::class, 'index']);
Route::get('/enrollments/active', [EnrollmentController::class, 'active']);
Route::get('/enrollments/stats', [EnrollmentController::class, 'stats']);
Route::get('/enrollments/student/{studentId}', [EnrollmentController::class, 'studentHistory']);
Route::post('/enrollments', [EnrollmentController::class, 'store']);
Route::put('/enrollments/{id}', [EnrollmentController::class, 'update']);
Route::post('/enrollments/{id}/transfer', [EnrollmentController::class, 'transfer']);
Route::post('/enrollments/{id}/drop', [EnrollmentController::class, 'drop']);
Route::post('/enrollments/{id}/complete', [EnrollmentController::class, 'complete']);
Route::delete('/enrollments/{id}', [EnrollmentController::class, 'destroy']);

// Bulk Enrollment

    Route::get('/bulk-enrollment', [BulkEnrollmentController::class, 'index']);
    Route::post('/bulk-enrollment/upload', [BulkEnrollmentController::class, 'upload']);
    Route::get('/bulk-enrollment/template', [BulkEnrollmentController::class, 'downloadTemplate'])->middleware('auth:sanctum'); 
    
    
    Route::get('/meetings', [MeetingController::class, 'index']);
    Route::post('/meetings', [MeetingController::class, 'store']);
    Route::put('/meetings/{id}', [MeetingController::class, 'update']);
    Route::delete('/meetings/{id}', [MeetingController::class, 'destroy']);
});

    //All Activities
    // Route::get('/sections', [TeacherController::class, 'getSections']);
    // Route::get('/subjects', [TeacherController::class, 'getSubjects']);
    // Route::get('/activities', [ActivityController::class, 'index']);
    // Route::post('/activities', [ActivityController::class, 'store']);
    // Route::put('/activities/{id}', [ActivityController::class, 'update']);
    // Route::delete('/activities/{id}', [ActivityController::class, 'destroy']);
    // Route::get('/activities/{id}/submissions', [ActivityController::class, 'submissions']);
    // Route::post('/submissions/{id}/grade', [ActivityController::class, 'gradeSubmission']);

    // Teacher mobile routes
  Route::middleware(['auth:sanctum'])->group(function () {
    // Teacher mobile routes
    Route::prefix('teacher')->group(function () {

    Route::post('/expo-token', [TeacherMobileController::class, 'storeExpoToken']);

        Route::get('/dashboard', [TeacherMobileController::class, 'dashboard']);
        Route::get('/attendance', [TeacherMobileController::class, 'getAttendanceList']);
        Route::post('/attendance/mark', [TeacherMobileController::class, 'markAttendance']);
        Route::get('/activities', [TeacherMobileController::class, 'getActivities']);
        Route::get('/meetings', [TeacherMobileController::class, 'getMeetings']);
        Route::get('/profile', [TeacherMobileController::class, 'getProfile']);
        Route::put('/profile', [TeacherMobileController::class, 'updateProfile']);
        Route::get('/sections', [TeacherMobileController::class, 'getSections']);

        Route::post('/update-profile-picture', [TeacherMobileController::class, 'updateProfilePicture']);
        Route::post('/attendance/timeout', [TeacherMobileController::class, 'markTimeOut']);
        Route::post('/attendance/bulk-timeout', [TeacherMobileController::class, 'bulkTimeOut']);
        Route::post('/activities', [TeacherMobileController::class, 'storeActivity']);
        Route::get('/attendance/history/{enrollment_id}', [TeacherMobileController::class, 'attendanceHistory']);


        //grade
       Route::get('/grades/subjects', [TeacherGradeController::class, 'getSubjectsForGrading']);
    Route::get('/grades/students', [TeacherGradeController::class, 'getStudentsForGrading']);
    Route::post('/grades/save', [TeacherGradeController::class, 'saveGrade']);
    Route::post('/grades/submit', [TeacherGradeController::class, 'submitGrades']);
    Route::get('/grades/status', [TeacherGradeController::class, 'getSubmissionStatus']);

    
     Route::get('/activities/{id}/submissions', [TeacherActivityController::class, 'getSubmissions']);
    Route::post('/submissions/{id}/grade', [TeacherActivityController::class, 'gradeSubmission']);
    });

    // Student Routes (need authentication)
Route::middleware(['auth:sanctum', 'role:Student'])->prefix('student')->group(function () {
    Route::get('/dashboard', [StudentDashboardController::class, 'index']);
    Route::get('/grades', [StudentGradeController::class, 'index']);
    Route::get('/attendance', [\App\Http\Controllers\Student\AttendanceController::class, 'index']);
    Route::get('/activities', [StudentActivityController::class, 'index']);
    Route::get('/activities/{id}', [StudentActivityController::class, 'show']);
    Route::post('/activities/{id}/submit', [StudentActivityController::class, 'submit']);
    Route::get('/announcements', [StudentAnnouncementController::class, 'index']);

     Route::post('/activities/{id}/update-submission', [StudentActivityController::class, 'updateSubmission']);

   Route::get('/profile', [StudentProfileController::class, 'index']);
Route::put('/profile', [StudentProfileController::class, 'update']);
Route::post('/upload-profile', [StudentProfileController::class, 'uploadProfilePicture']);
Route::post('/update-profile-picture', [StudentProfileController::class, 'updateProfilePicture']);
Route::post('/change-password', [StudentProfileController::class, 'changePassword']);
});

});
