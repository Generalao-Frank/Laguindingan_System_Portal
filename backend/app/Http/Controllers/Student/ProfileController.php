<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\StudentsInfo;
use App\Models\Enrollment;
use App\Models\SchoolYear;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'No authenticated user found'
                ], 401);
            }
            
            $student = StudentsInfo::where('user_id', $user->id)->first();
            
            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student record not found'
                ], 404);
            }
            
            $currentSchoolYear = SchoolYear::where('is_active', true)->first();
            
            $enrollment = Enrollment::where('student_id', $student->id);
            if ($currentSchoolYear) {
                $enrollment = $enrollment->where('school_year_id', $currentSchoolYear->id);
            }
            $enrollment = $enrollment->first();
            
            $responseData = [
                'profile' => [
                    'id' => $student->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'middle_name' => $user->middle_name,
                    'lrn' => $student->lrn,
                    'username' => $user->username,
                    'email' => $user->email,
                    'grade_level' => $enrollment && $enrollment->section ? ($enrollment->section->grade_level_id ?? 'N/A') : 'N/A',
                    'section' => $enrollment && $enrollment->section ? ($enrollment->section->section_name ?? 'Not Enrolled') : 'Not Enrolled',
                    'profile_picture' => $user->profile_picture,
                    'profile_picture_url' => $user->profile_picture ? url('/storage/' . $user->profile_picture) : null,
                    'gender' => $user->gender,
                    'birthdate' => $user->birthdate,
                    'address' => $user->address,
                    'contact_number' => $user->contact_number,
                    'father_name' => $student->father_name,
                    'mother_name' => $student->mother_name,
                    'guardian_name' => $student->guardian_name,
                    'guardian_contact_number' => $student->guardian_contact_number,
                ]
            ];
            
            return response()->json($responseData);
            
        } catch (\Exception $e) {
            Log::error('Profile fetch error: ' . $e->getMessage());
            Log::error('Line: ' . $e->getLine());
            Log::error('File: ' . $e->getFile());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch profile: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }
            
            $student = StudentsInfo::where('user_id', $user->id)->first();

            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found'
                ], 404);
            }

            // Validate request
            $validated = $request->validate([
                'first_name' => 'sometimes|string|max:255',
                'middle_name' => 'sometimes|string|max:255',
                'last_name' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $user->id,
                'contact_number' => 'sometimes|string|max:11',
                'address' => 'sometimes|string|nullable',
                'father_name' => 'sometimes|string|nullable',
                'mother_name' => 'sometimes|string|nullable',
                'guardian_name' => 'sometimes|string|nullable',
                'guardian_contact_number' => 'sometimes|string|max:11|nullable',
            ]);

            // Update user table
            $userData = [];
            if ($request->filled('first_name')) $userData['first_name'] = $request->first_name;
            if ($request->filled('middle_name')) $userData['middle_name'] = $request->middle_name;
            if ($request->filled('last_name')) $userData['last_name'] = $request->last_name;
            if ($request->filled('email')) $userData['email'] = $request->email;
            if ($request->filled('contact_number')) $userData['contact_number'] = $request->contact_number;
            if ($request->filled('address')) $userData['address'] = $request->address;
            
            if (!empty($userData)) {
                User::where('id', $user->id)->update($userData);
            }

            // Update students_info table
            $studentData = [];
            if ($request->filled('father_name')) $studentData['father_name'] = $request->father_name;
            if ($request->filled('mother_name')) $studentData['mother_name'] = $request->mother_name;
            if ($request->filled('guardian_name')) $studentData['guardian_name'] = $request->guardian_name;
            if ($request->filled('guardian_contact_number')) $studentData['guardian_contact_number'] = $request->guardian_contact_number;
            
            if (!empty($studentData)) {
                StudentsInfo::where('id', $student->id)->update($studentData);
            }

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully'
            ]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Profile update error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile: ' . $e->getMessage()
            ], 500);
        }
    }

    public function uploadProfilePicture(Request $request)
    {
        try {
            $request->validate([
                'profile_picture' => 'required|image|mimes:jpeg,png,jpg|max:2048'
            ]);

            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Delete old profile picture if exists
            $oldPicture = $user->profile_picture;
            if ($oldPicture && Storage::disk('public')->exists($oldPicture)) {
                Storage::disk('public')->delete($oldPicture);
            }

            // Upload new profile picture
            $file = $request->file('profile_picture');
            $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('profile_pictures', $filename, 'public');
            
            // Update user record
            User::where('id', $user->id)->update(['profile_picture' => $path]);

            return response()->json([
                'success' => true,
                'message' => 'Profile picture updated successfully',
                'profile_picture_url' => url('/storage/' . $path),
            ]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed: ' . implode(', ', array_merge(...array_values($e->errors())))
            ], 422);
        } catch (\Exception $e) {
            Log::error('Upload error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Upload failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateProfilePicture(Request $request)
    {
        try {
            $request->validate([
                'profile_picture' => 'required|string'
            ]);

            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }
            
            $picturePath = $request->profile_picture;
            
            // Extract just the path if full URL is provided
            if (filter_var($picturePath, FILTER_VALIDATE_URL)) {
                $picturePath = str_replace(url('/storage/'), '', $picturePath);
                $picturePath = ltrim($picturePath, '/');
            }
            
            // Update using static method
            User::where('id', $user->id)->update(['profile_picture' => $picturePath]);

            return response()->json([
                'success' => true,
                'message' => 'Profile picture URL saved successfully'
            ]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed: ' . implode(', ', array_merge(...array_values($e->errors())))
            ], 422);
        } catch (\Exception $e) {
            Log::error('Update picture URL error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to save: ' . $e->getMessage()
            ], 500);
        }
    }

    public function changePassword(Request $request)
    {
        try {
            $request->validate([
                'current_password' => 'required|string',
                'new_password' => 'required|string|min:6|confirmed',
            ]);

            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Check current password
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Current password is incorrect'
                ], 400);
            }

            // Update password
            User::where('id', $user->id)->update([
                'password' => Hash::make($request->new_password)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Password changed successfully'
            ]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed: ' . implode(', ', array_merge(...array_values($e->errors())))
            ], 422);
        } catch (\Exception $e) {
            Log::error('Password change error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to change password: ' . $e->getMessage()
            ], 500);
        }
    }
}