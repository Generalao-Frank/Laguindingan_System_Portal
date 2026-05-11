<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\StudentsInfo;
use App\Models\Activity;
use App\Models\Submission;
use App\Models\Enrollment;
use App\Models\SchoolYear;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ActivityController extends Controller
{
   public function index(Request $request)
{
    try {
        $user = Auth::user();
        $student = StudentsInfo::where('user_id', $user->id)->first();
        
        if (!$student) {
            return response()->json(['activities' => []]);
        }
        
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        $enrollment = Enrollment::where('student_id', $student->id)
            ->where('school_year_id', $currentSchoolYear->id ?? 0)
            ->first();
        
        if (!$enrollment) {
            return response()->json(['activities' => []]);
        }
        
        $activities = Activity::with(['subject'])
            ->where('section_id', $enrollment->section_id)
            ->orderBy('deadline', 'asc')
            ->get()
            ->map(function($activity) use ($enrollment) {
                $submission = Submission::where('activity_id', $activity->id)
                    ->where('enrollment_id', $enrollment->id)
                    ->first();
                
                $status = 'pending';
                $imageUrl = null;
                
                if ($submission) {
                    $status = $submission->points_earned !== null ? 'graded' : 'submitted';
                    // Convert image path to full URL
                    if ($submission->image_path) {
                        $imageUrl = url('/storage/' . $submission->image_path);
                    }
                }
                
                return [
                    'id' => $activity->id,
                    'title' => $activity->title,
                    'description' => $activity->description,
                    'subject' => $activity->subject->subject_name ?? 'N/A',
                    'due_date' => $activity->deadline,
                    'status' => $status,
                    'score' => $submission->points_earned ?? null,
                    'max_score' => $activity->max_points,
                    'submission_image' => $imageUrl, // Full URL here
                    'submitted_at' => $submission ? $submission->created_at : null,
                ];
            });
        
        return response()->json([
            'activities' => $activities,
        ]);
        
    } catch (\Exception $e) {
        Log::error('Activities fetch error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch activities'
        ], 500);
    }
}
    
    public function submit(Request $request, $id)
{
    try {
        $request->validate([
            'submission_image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);
        
        $user = Auth::user();
        $student = StudentsInfo::where('user_id', $user->id)->first();
        
        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Student record not found'
            ], 404);
        }
        
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        
        $enrollment = Enrollment::where('student_id', $student->id)
            ->where('school_year_id', $currentSchoolYear->id ?? 0)
            ->first();
        
        if (!$enrollment) {
            return response()->json([
                'success' => false,
                'message' => 'Student not enrolled'
            ], 400);
        }
        
        $activity = Activity::findOrFail($id);
        
        // Check if already submitted
        $existingSubmission = Submission::where('activity_id', $id)
            ->where('enrollment_id', $enrollment->id)
            ->first();
        
        if ($existingSubmission) {
            return response()->json([
                'success' => false,
                'message' => 'Activity already submitted'
            ], 400);
        }
        
        // Handle file upload
        $file = $request->file('submission_image');
        $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('submissions', $filename, 'public');
        
        $submission = Submission::create([
            'activity_id' => $id,
            'enrollment_id' => $enrollment->id,
            'image_path' => $path,
            'points_earned' => null,
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Activity submitted successfully',
            'submission' => [
                'id' => $submission->id,
                'activity_id' => $submission->activity_id,
                'submitted_at' => $submission->created_at,
                'image_path' => url('/storage/' . $path), // Return full URL
            ],
        ]);
        
    } catch (\Exception $e) {
        Log::error('Submit error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to submit: ' . $e->getMessage()
        ], 500);
    }
}
    
    public function updateSubmission(Request $request, $id)
    {
        try {
            $request->validate([
                'submission_image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
            ]);
            
            $user = Auth::user();
            $student = StudentsInfo::where('user_id', $user->id)->first();
            
            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student record not found'
                ], 404);
            }
            
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            $enrollment = Enrollment::where('student_id', $student->id)
                ->where('school_year_id', $currentSchoolYear->id ?? 0)
                ->first();
            
            if (!$enrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not enrolled'
                ], 400);
            }
            
            $activity = Activity::findOrFail($id);
            
            // Check if submission exists
            $submission = Submission::where('activity_id', $id)
                ->where('enrollment_id', $enrollment->id)
                ->first();
            
            if (!$submission) {
                return response()->json([
                    'success' => false,
                    'message' => 'No submission found to update'
                ], 404);
            }
            
            // Delete old image if exists
            if ($submission->image_path && Storage::disk('public')->exists($submission->image_path)) {
                Storage::disk('public')->delete($submission->image_path);
            }
            
            // Upload new image
            $file = $request->file('submission_image');
            $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $imagePath = $file->storeAs('submissions', $filename, 'public');
            
            $submission->image_path = $imagePath;
            $submission->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Submission updated successfully',
                'submission' => [
                    'id' => $submission->id,
                    'image_path' => $imagePath,
                ],
            ]);
            
        } catch (\Exception $e) {
            Log::error('Update submission error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update submission: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function deleteSubmission($id)
    {
        try {
            $user = Auth::user();
            $student = StudentsInfo::where('user_id', $user->id)->first();
            
            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student record not found'
                ], 404);
            }
            
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            $enrollment = Enrollment::where('student_id', $student->id)
                ->where('school_year_id', $currentSchoolYear->id ?? 0)
                ->first();
            
            if (!$enrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not enrolled'
                ], 400);
            }
            
            $submission = Submission::where('activity_id', $id)
                ->where('enrollment_id', $enrollment->id)
                ->first();
            
            if (!$submission) {
                return response()->json([
                    'success' => false,
                    'message' => 'Submission not found'
                ], 404);
            }
            
            // Delete image file
            if ($submission->image_path && Storage::disk('public')->exists($submission->image_path)) {
                Storage::disk('public')->delete($submission->image_path);
            }
            
            $submission->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Submission deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Delete submission error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete submission: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function show($id)
    {
        try {
            $user = Auth::user();
            $student = StudentsInfo::where('user_id', $user->id)->first();
            
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            $enrollment = Enrollment::where('student_id', $student->id)
                ->where('school_year_id', $currentSchoolYear->id ?? 0)
                ->first();
            
            if (!$enrollment) {
                return response()->json(['message' => 'Student not enrolled'], 400);
            }
            
            $activity = Activity::with(['subject'])
                ->where('id', $id)
                ->where('section_id', $enrollment->section_id)
                ->firstOrFail();
            
            $submission = Submission::where('activity_id', $id)
                ->where('enrollment_id', $enrollment->id)
                ->first();
            
            $status = 'pending';
            if ($submission) {
                $status = $submission->points_earned !== null ? 'graded' : 'submitted';
            }
            
            return response()->json([
                'id' => $activity->id,
                'title' => $activity->title,
                'description' => $activity->description,
                'subject' => $activity->subject->subject_name ?? 'N/A',
                'due_date' => $activity->deadline,
                'status' => $status,
                'score' => $submission->points_earned ?? null,
                'max_score' => $activity->max_points,
                'submission_image' => $submission->image_path ?? null,
                'submitted_at' => $submission ? $submission->created_at : null,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Show activity error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch activity details'
            ], 500);
        }
    }
}