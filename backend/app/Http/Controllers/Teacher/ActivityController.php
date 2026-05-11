<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Activity;
use App\Models\Submission;
use App\Models\TeacherAssignment;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Enrollment;
use App\Models\StudentsInfo;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ActivityController extends Controller
{
    /**
     * Get all activities for the authenticated teacher
     */
    public function index(Request $request)
    {
        try {
            $teacher = Auth::user()->teacher;
            
            if (!$teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Teacher record not found'
                ], 404);
            }
            
            // Get all teacher assignments for this teacher
            $teacherAssignments = TeacherAssignment::with(['section', 'subject'])
                ->where('teacher_id', $teacher->id)
                ->where('school_year_id', $this->getActiveSchoolYear())
                ->get();
            
            $activities = collect();
            
            foreach ($teacherAssignments as $assignment) {
                $sectionActivities = Activity::with(['section', 'subject'])
                    ->where('teacher_id', $teacher->id)
                    ->where('section_id', $assignment->section_id)
                    ->where('subject_id', $assignment->subject_id)
                    ->orderBy('created_at', 'desc')
                    ->get()
                    ->map(function($activity) use ($assignment) {
                        // Get submission counts
                        $submissions = Submission::where('activity_id', $activity->id)->get();
                        $submitted = $submissions->count();
                        $graded = $submissions->whereNotNull('points_earned')->count();
                        
                        return [
                            'id' => $activity->id,
                            'title' => $activity->title,
                            'description' => $activity->description,
                            'deadline' => $activity->deadline,
                            'max_points' => $activity->max_points,
                            'section' => $assignment->section->section_name ?? 'N/A',
                            'subject' => $assignment->subject->subject_name ?? 'N/A',
                            'submitted' => $submitted,
                            'graded' => $graded,
                        ];
                    });
                
                $activities = $activities->concat($sectionActivities);
            }
            
            return response()->json($activities);
            
        } catch (\Exception $e) {
            Log::error('Activities fetch error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch activities: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Create a new activity
     */
    public function storeActivity(Request $request)
    {
        try {
            $teacher = Auth::user()->teacher;
            
            if (!$teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Teacher record not found'
                ], 404);
            }
            
            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'deadline' => 'nullable|date',
                'max_points' => 'required|integer|min:1',
                'section_id' => 'required|exists:sections,id',
                'subject_id' => 'required|exists:subjects,id',
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
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
            
            return response()->json([
                'success' => true,
                'message' => 'Activity created successfully',
                'activity' => $activity
            ]);
            
        } catch (\Exception $e) {
            Log::error('Activity creation error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create activity: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get submissions for a specific activity
     */
    public function getSubmissions($id)
    {
        try {
            $teacher = Auth::user()->teacher;
            
            if (!$teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Teacher record not found'
                ], 404);
            }
            
            $activity = Activity::with(['submissions'])->findOrFail($id);
            
            // Verify that this activity belongs to the teacher
            if ($activity->teacher_id !== $teacher->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this activity'
                ], 403);
            }
            
            $submissions = [];
            
            foreach ($activity->submissions as $submission) {
                // Get enrollment and student info
                $enrollment = $submission->enrollment;
                if ($enrollment) {
                    $student = $enrollment->student;
                    $user = $student ? $student->user : null;
                    
                    // Convert image path to full URL
                    $imageUrl = null;
                    if ($submission->image_path) {
                        $imageUrl = url('/storage/' . $submission->image_path);
                    }
                    
                    $submissions[] = [
                        'id' => $submission->id,
                        'student_name' => $user ? $user->first_name . ' ' . $user->last_name : 'Unknown',
                        'lrn' => $student ? $student->lrn : 'N/A',
                        'submitted_at' => $submission->created_at,
                        'image_path' => $imageUrl, // <-- FULL URL HERE
                        'points_earned' => $submission->points_earned,
                        'feedback' => $submission->feedback,
                        'status' => $submission->points_earned !== null ? 'graded' : 'submitted',
                        'enrollment_id' => $submission->enrollment_id,
                    ];
                }
            }
            
            return response()->json($submissions);
            
        } catch (\Exception $e) {
            Log::error('Submissions fetch error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch submissions: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Grade a submission
     */
    public function gradeSubmission(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'points_earned' => 'required|integer|min:0',
                'feedback' => 'nullable|string',
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $submission = Submission::findOrFail($id);
            $activity = $submission->activity;
            
            // Verify max points
            if ($request->points_earned > $activity->max_points) {
                return response()->json([
                    'success' => false,
                    'message' => 'Points earned cannot exceed max points (' . $activity->max_points . ')'
                ], 400);
            }
            
            $submission->points_earned = $request->points_earned;
            $submission->feedback = $request->feedback;
            $submission->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Grade submitted successfully',
                'submission' => [
                    'id' => $submission->id,
                    'points_earned' => $submission->points_earned,
                    'feedback' => $submission->feedback,
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Grade submission error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to grade submission: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Update an existing activity
     */
    public function updateActivity(Request $request, $id)
    {
        try {
            $teacher = Auth::user()->teacher;
            
            if (!$teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Teacher record not found'
                ], 404);
            }
            
            $activity = Activity::findOrFail($id);
            
            // Verify ownership
            if ($activity->teacher_id !== $teacher->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this activity'
                ], 403);
            }
            
            $validator = Validator::make($request->all(), [
                'title' => 'sometimes|string|max:255',
                'description' => 'nullable|string',
                'deadline' => 'nullable|date',
                'max_points' => 'sometimes|integer|min:1',
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }
            
            if ($request->has('title')) $activity->title = $request->title;
            if ($request->has('description')) $activity->description = $request->description;
            if ($request->has('deadline')) $activity->deadline = $request->deadline;
            if ($request->has('max_points')) $activity->max_points = $request->max_points;
            $activity->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Activity updated successfully',
                'activity' => $activity
            ]);
            
        } catch (\Exception $e) {
            Log::error('Activity update error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update activity: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Delete an activity
     */
    public function deleteActivity($id)
    {
        try {
            $teacher = Auth::user()->teacher;
            
            if (!$teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Teacher record not found'
                ], 404);
            }
            
            $activity = Activity::findOrFail($id);
            
            // Verify ownership
            if ($activity->teacher_id !== $teacher->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this activity'
                ], 403);
            }
            
            // Delete associated submissions first
            Submission::where('activity_id', $id)->delete();
            $activity->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Activity deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Activity deletion error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete activity: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get a single activity with its submissions
     */
    public function show($id)
    {
        try {
            $teacher = Auth::user()->teacher;
            
            if (!$teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'Teacher record not found'
                ], 404);
            }
            
            $activity = Activity::with(['section', 'subject'])->findOrFail($id);
            
            // Verify ownership
            if ($activity->teacher_id !== $teacher->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to this activity'
                ], 403);
            }
            
            $submissions = Submission::where('activity_id', $id)
                ->with(['enrollment.student.user'])
                ->get()
                ->map(function($submission) {
                    $student = $submission->enrollment->student;
                    $user = $student ? $student->user : null;
                    
                    // Convert image path to full URL
                    $imageUrl = null;
                    if ($submission->image_path) {
                        $imageUrl = url('/storage/' . $submission->image_path);
                    }
                    
                    return [
                        'id' => $submission->id,
                        'student_name' => $user ? $user->first_name . ' ' . $user->last_name : 'Unknown',
                        'lrn' => $student ? $student->lrn : 'N/A',
                        'submitted_at' => $submission->created_at,
                        'image_path' => $imageUrl, // <-- FULL URL HERE
                        'points_earned' => $submission->points_earned,
                        'feedback' => $submission->feedback,
                    ];
                });
            
            return response()->json([
                'id' => $activity->id,
                'title' => $activity->title,
                'description' => $activity->description,
                'deadline' => $activity->deadline,
                'max_points' => $activity->max_points,
                'section' => $activity->section->section_name ?? 'N/A',
                'subject' => $activity->subject->subject_name ?? 'N/A',
                'submissions' => $submissions,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Activity fetch error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch activity: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get active school year ID
     */
    private function getActiveSchoolYear()
    {
        $schoolYear = \App\Models\SchoolYear::where('is_active', true)->first();
        return $schoolYear ? $schoolYear->id : null;
    }
}