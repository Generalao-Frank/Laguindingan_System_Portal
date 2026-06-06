<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TeacherAssignment;
use App\Models\Teacher;
use App\Models\Subject;
use App\Models\Section;
use App\Models\SchoolYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class TeacherAssignmentController extends Controller
{
    public function index()
    {
        $assignments = TeacherAssignment::with(['teacher.user', 'subject', 'section.gradeLevel', 'schoolYear'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($assignment) {
                // Get profile picture from users table
                $profilePicture = null;
                $teacherName = 'N/A';
                
                if ($assignment->teacher && $assignment->teacher->user) {
                    $teacherName = $assignment->teacher->user->first_name . ' ' . $assignment->teacher->user->last_name;
                    $profilePicture = $assignment->teacher->user->profile_picture; // ✅ Get from users table
                }
                
                return [
                    'id' => $assignment->id,
                    'teacher_id' => $assignment->teacher_id,
                    'teacher_name' => $teacherName,
                    'teacher_profile_picture' => $profilePicture, // ✅ Add profile picture
                    'subject_id' => $assignment->subject_id,
                    'subject_name' => $assignment->subject ? $assignment->subject->subject_name : 'N/A',
                    'subject_grade_level' => $assignment->subject ? $assignment->subject->grade_level_id : null,
                    'section_id' => $assignment->section_id,
                    'section_name' => $assignment->section ? $assignment->section->section_name : 'N/A',
                    'section_grade_level' => $assignment->section && $assignment->section->gradeLevel ? 
                        $assignment->section->gradeLevel->grade_level : null,
                    'grade_level' => $assignment->section && $assignment->section->gradeLevel ? 
                        $assignment->section->gradeLevel->grade_level : null,
                    'grade_display' => $assignment->section && $assignment->section->gradeLevel ? 
                        ($assignment->section->gradeLevel->grade_level == 0 ? 'Kinder' : 'Grade ' . $assignment->section->gradeLevel->grade_level) : 'N/A',
                    'school_year_id' => $assignment->school_year_id,
                    'school_year' => $assignment->schoolYear ? 
                        $assignment->schoolYear->year_start . '-' . $assignment->schoolYear->year_end : 'N/A',
                ];
            });

        return response()->json([
            'success' => true,
            'assignments' => $assignments
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'teacher_id' => 'required|exists:teachers,id',
            'subject_id' => 'required|exists:subjects,id',
            'section_id' => 'required|exists:sections,id',
            'school_year_id' => 'required|exists:school_years,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check grade level compatibility
        $subject = Subject::find($request->subject_id);
        $section = Section::with('gradeLevel')->find($request->section_id);
        
        if ($subject && $section && $subject->grade_level_id != $section->grade_level_id) {
            return response()->json([
                'success' => false,
                'message' => 'Subject grade level does not match section grade level'
            ], 422);
        }

        // Check for duplicate assignment
        $existing = TeacherAssignment::where('teacher_id', $request->teacher_id)
            ->where('subject_id', $request->subject_id)
            ->where('section_id', $request->section_id)
            ->where('school_year_id', $request->school_year_id)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'This teacher is already assigned to this subject and section for the selected school year'
            ], 422);
        }

        try {
            $assignment = TeacherAssignment::create([
                'teacher_id' => $request->teacher_id,
                'subject_id' => $request->subject_id,
                'section_id' => $request->section_id,
                'school_year_id' => $request->school_year_id,
            ]);

            // Reload with relationships to return complete data
            $assignment->load(['teacher.user', 'subject', 'section.gradeLevel', 'schoolYear']);
            
            $profilePicture = $assignment->teacher && $assignment->teacher->user ? 
                $assignment->teacher->user->profile_picture : null;
            
            $teacherName = $assignment->teacher && $assignment->teacher->user ? 
                $assignment->teacher->user->first_name . ' ' . $assignment->teacher->user->last_name : 'N/A';

            return response()->json([
                'success' => true,
                'message' => 'Teacher assigned successfully',
                'assignment' => [
                    'id' => $assignment->id,
                    'teacher_id' => $assignment->teacher_id,
                    'teacher_name' => $teacherName,
                    'teacher_profile_picture' => $profilePicture,
                    'subject_id' => $assignment->subject_id,
                    'subject_name' => $assignment->subject ? $assignment->subject->subject_name : 'N/A',
                    'section_id' => $assignment->section_id,
                    'section_name' => $assignment->section ? $assignment->section->section_name : 'N/A',
                    'grade_display' => $assignment->section && $assignment->section->gradeLevel ? 
                        ($assignment->section->gradeLevel->grade_level == 0 ? 'Kinder' : 'Grade ' . $assignment->section->gradeLevel->grade_level) : 'N/A',
                    'school_year' => $assignment->schoolYear ? 
                        $assignment->schoolYear->year_start . '-' . $assignment->schoolYear->year_end : 'N/A',
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create assignment: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $assignment = TeacherAssignment::find($id);
        
        if (!$assignment) {
            return response()->json([
                'success' => false,
                'message' => 'Assignment not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'teacher_id' => 'required|exists:teachers,id',
            'subject_id' => 'required|exists:subjects,id',
            'section_id' => 'required|exists:sections,id',
            'school_year_id' => 'required|exists:school_years,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check grade level compatibility
        $subject = Subject::find($request->subject_id);
        $section = Section::with('gradeLevel')->find($request->section_id);
        
        if ($subject && $section && $subject->grade_level_id != $section->grade_level_id) {
            return response()->json([
                'success' => false,
                'message' => 'Subject grade level does not match section grade level'
            ], 422);
        }

        // Check for duplicate assignment (excluding current)
        $existing = TeacherAssignment::where('teacher_id', $request->teacher_id)
            ->where('subject_id', $request->subject_id)
            ->where('section_id', $request->section_id)
            ->where('school_year_id', $request->school_year_id)
            ->where('id', '!=', $id)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'This teacher is already assigned to this subject and section for the selected school year'
            ], 422);
        }

        try {
            $assignment->update([
                'teacher_id' => $request->teacher_id,
                'subject_id' => $request->subject_id,
                'section_id' => $request->section_id,
                'school_year_id' => $request->school_year_id,
            ]);

            // Reload with relationships
            $assignment->load(['teacher.user', 'subject', 'section.gradeLevel', 'schoolYear']);
            
            $profilePicture = $assignment->teacher && $assignment->teacher->user ? 
                $assignment->teacher->user->profile_picture : null;
            
            $teacherName = $assignment->teacher && $assignment->teacher->user ? 
                $assignment->teacher->user->first_name . ' ' . $assignment->teacher->user->last_name : 'N/A';

            return response()->json([
                'success' => true,
                'message' => 'Assignment updated successfully',
                'assignment' => [
                    'id' => $assignment->id,
                    'teacher_id' => $assignment->teacher_id,
                    'teacher_name' => $teacherName,
                    'teacher_profile_picture' => $profilePicture,
                    'subject_id' => $assignment->subject_id,
                    'subject_name' => $assignment->subject ? $assignment->subject->subject_name : 'N/A',
                    'section_id' => $assignment->section_id,
                    'section_name' => $assignment->section ? $assignment->section->section_name : 'N/A',
                    'grade_display' => $assignment->section && $assignment->section->gradeLevel ? 
                        ($assignment->section->gradeLevel->grade_level == 0 ? 'Kinder' : 'Grade ' . $assignment->section->gradeLevel->grade_level) : 'N/A',
                    'school_year' => $assignment->schoolYear ? 
                        $assignment->schoolYear->year_start . '-' . $assignment->schoolYear->year_end : 'N/A',
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update assignment: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $assignment = TeacherAssignment::find($id);
        
        if (!$assignment) {
            return response()->json([
                'success' => false,
                'message' => 'Assignment not found'
            ], 404);
        }

        try {
            $assignment->delete();

            return response()->json([
                'success' => true,
                'message' => 'Assignment removed successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete assignment: ' . $e->getMessage()
            ], 500);
        }
    }

    // Optional: Get assignments by teacher
    public function getByTeacher($teacherId)
    {
        $assignments = TeacherAssignment::with(['teacher.user', 'subject', 'section.gradeLevel', 'schoolYear'])
            ->where('teacher_id', $teacherId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($assignment) {
                $profilePicture = $assignment->teacher && $assignment->teacher->user ? 
                    $assignment->teacher->user->profile_picture : null;
                    
                return [
                    'id' => $assignment->id,
                    'subject_name' => $assignment->subject ? $assignment->subject->subject_name : 'N/A',
                    'section_name' => $assignment->section ? $assignment->section->section_name : 'N/A',
                    'grade_display' => $assignment->section && $assignment->section->gradeLevel ? 
                        ($assignment->section->gradeLevel->grade_level == 0 ? 'Kinder' : 'Grade ' . $assignment->section->gradeLevel->grade_level) : 'N/A',
                    'school_year' => $assignment->schoolYear ? 
                        $assignment->schoolYear->year_start . '-' . $assignment->schoolYear->year_end : 'N/A',
                ];
            });

        return response()->json([
            'success' => true,
            'assignments' => $assignments
        ]);
    }

    // Optional: Get assignments by section
    public function getBySection($sectionId)
    {
        $assignments = TeacherAssignment::with(['teacher.user', 'subject', 'section.gradeLevel', 'schoolYear'])
            ->where('section_id', $sectionId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($assignment) {
                $profilePicture = $assignment->teacher && $assignment->teacher->user ? 
                    $assignment->teacher->user->profile_picture : null;
                    
                return [
                    'id' => $assignment->id,
                    'teacher_name' => $assignment->teacher && $assignment->teacher->user ? 
                        $assignment->teacher->user->first_name . ' ' . $assignment->teacher->user->last_name : 'N/A',
                    'teacher_profile_picture' => $profilePicture,
                    'subject_name' => $assignment->subject ? $assignment->subject->subject_name : 'N/A',
                    'school_year' => $assignment->schoolYear ? 
                        $assignment->schoolYear->year_start . '-' . $assignment->schoolYear->year_end : 'N/A',
                ];
            });

        return response()->json([
            'success' => true,
            'assignments' => $assignments
        ]);
    }
}