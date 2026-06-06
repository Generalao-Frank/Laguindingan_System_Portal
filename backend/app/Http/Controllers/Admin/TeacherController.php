<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class TeacherController extends Controller
{
    /**
     * Tiyakin na ang bawat User na may role na 'Teacher' ay may kaugnay na record sa teachers table.
     * Kung wala, awtomatikong likhain ito.
     */
    private function syncMissingTeacherRecords()
    {
        $users = User::where('role', 'Teacher')->get();
        foreach ($users as $user) {
            if (!$user->teacher) {
                // Lumikha ng teacher record na may default na employee_id kung wala pa
                $employeeId = $user->employee_id ?? 'TCH-' . $user->id;
                Teacher::create([
                    'user_id' => $user->id,
                    'employee_id' => $employeeId,
                ]);
            }
        }
    }

    // Get all teachers
public function index()
{
    // Siguraduhin na lahat ng teacher users ay may teacher record
    $this->syncMissingTeacherRecords();

    $teachers = User::where('role', 'Teacher')
        ->whereHas('teacher')
        ->with('teacher')
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function($user) {
            return [
                'id' => $user->teacher->id,
                'user_id' => $user->id,
                'first_name' => $user->first_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'gender' => $user->gender,
                'birthdate' => $user->birthdate,
                'address' => $user->address,
                'contact_number' => $user->contact_number,
                'employee_id' => $user->teacher->employee_id,
                'email' => $user->email,
                'username' => $user->username,
                'profile_picture' => $user->profile_picture, // ✅ IDAGDAG ITO
                'status' => 'Active',
                'created_at' => $user->created_at,
            ];
        });

    return response()->json([
        'success' => true,
        'teachers' => $teachers
    ]);
}

    // Create new teacher
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'gender' => 'required|in:Male,Female',
            'birthdate' => 'nullable|date',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:15',
            'employee_id' => 'required|string|unique:teachers,employee_id',
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
            // Create user account
            $user = User::create([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name ?? '',
                'last_name' => $request->last_name,
                'gender' => $request->gender,
                'birthdate' => $request->birthdate,
                'address' => $request->address,
                'contact_number' => $request->contact_number,
                'username' => $request->employee_id,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => 'Teacher',
            ]);

            // Create teacher record
            $teacher = Teacher::create([
                'user_id' => $user->id,
                'employee_id' => $request->employee_id,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Teacher created successfully',
                'teacher' => [
                    'id' => $teacher->id,
                    'user_id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'employee_id' => $request->employee_id,
                    'email' => $user->email,
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create teacher: ' . $e->getMessage()
            ], 500);
        }
    }

    // Get single teacher (maaaring gamitin ang teacher ID o user ID)
    public function show($id)
    {
        // Subukan muna kung ang $id ay teacher ID
        $teacher = Teacher::with('user')->find($id);
        
        // Kung wala, subukan kung ito ay user ID
        if (!$teacher) {
            $user = User::where('role', 'Teacher')->find($id);
            if ($user && $user->teacher) {
                $teacher = $user->teacher;
            }
        }

        // Kung wala pa rin, subukang likhain ang teacher record kung may user
        if (!$teacher) {
            $user = User::where('role', 'Teacher')->find($id);
            if ($user) {
                // Awtomatikong likhain ang nawawalang teacher record
                $teacher = Teacher::create([
                    'user_id' => $user->id,
                    'employee_id' => 'TCH-' . $user->id,
                ]);
            }
        }

        if (!$teacher) {
            return response()->json([
                'success' => false,
                'message' => 'Teacher not found'
            ], 404);
        }

        $user = $teacher->user;

        return response()->json([
            'success' => true,
            'teacher' => [
                'id' => $teacher->id,
                'user_id' => $user->id,
                'first_name' => $user->first_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'gender' => $user->gender,
                'birthdate' => $user->birthdate,
                'address' => $user->address,
                'contact_number' => $user->contact_number,
                'employee_id' => $teacher->employee_id,
                'email' => $user->email,
                'username' => $user->username,
            ]
        ]);
    }

    // Update teacher
    public function update(Request $request, $id)
    {
        // Ang $id ay teacher ID
        $teacher = Teacher::with('user')->find($id);
        
        if (!$teacher) {
            return response()->json([
                'success' => false,
                'message' => 'Teacher not found'
            ], 404);
        }

        $user = $teacher->user;

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'gender' => 'required|in:Male,Female',
            'birthdate' => 'nullable|date',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:15',
            'email' => 'nullable|email|unique:users,email,' . $user->id,
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
            // Update user
            $user->update([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name ?? '',
                'last_name' => $request->last_name,
                'gender' => $request->gender,
                'birthdate' => $request->birthdate,
                'address' => $request->address,
                'contact_number' => $request->contact_number,
                'email' => $request->email,
            ]);

            if ($request->filled('password')) {
                $user->update(['password' => Hash::make($request->password)]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Teacher updated successfully',
                'teacher' => [
                    'id' => $teacher->id,
                    'user_id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'employee_id' => $teacher->employee_id,
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update teacher: ' . $e->getMessage()
            ], 500);
        }
    }

    // Delete teacher
    public function destroy($id)
    {
        $teacher = Teacher::find($id);
        
        if (!$teacher) {
            return response()->json([
                'success' => false,
                'message' => 'Teacher not found'
            ], 404);
        }

        DB::beginTransaction();

        try {
            $user = $teacher->user;
            $teacher->delete();
            $user->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Teacher deleted successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete teacher: ' . $e->getMessage()
            ], 500);
        }
    }
}