<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ActivityLog; 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string',
            'device_type' => 'nullable|in:web,mobile',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid username or password.'
            ], 401);
        }

        $deviceType = $request->device_type ?? 'web';

        if ($deviceType === 'web' && $user->role !== 'Admin') {
            return response()->json([
                'success' => false,
                'message' => 'Only Admin can access the web portal.'
            ], 403);
        }
        
        if ($deviceType === 'mobile' && $user->role === 'Admin') {
            return response()->json([
                'success' => false,
                'message' => 'Admin must use the web portal.'
            ], 403);
        }

        $token = $user->createToken($deviceType . '_token')->plainTextToken;

        ActivityLog::create([
            'user_id'     => $user->id,
            'student_id'  => null,
            'action_type' => 'LOGIN',
            'table_name'  => 'users',
            'record_id'   => $user->id,
            'old_values'  => null,
            'new_values'  => ['username' => $user->username, 'device' => $deviceType],
            'description' => $user->first_name . ' ' . $user->last_name . ' logged into the system via ' . strtoupper($deviceType) . '.',
            'ip_address'  => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'middle_name' => $user->middle_name,
                'email' => $user->email,
                'role' => $user->role,
                'profile_picture' => $user->profile_picture,
                'profile_picture_url' => $user->profile_picture ? asset('storage/' . $user->profile_picture) : null,
            ]
        ], 200);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            ActivityLog::create([
                'user_id'     => $user->id,
                'student_id'  => null,
                'action_type' => 'LOGOUT',
                'table_name'  => 'users',
                'record_id'   => $user->id,
                'old_values'  => null,
                'new_values'  => null,
                'description' => $user->first_name . ' ' . $user->last_name . ' logged out of the system.',
                'ip_address'  => $request->ip(),
            ]);

            $user->currentAccessToken()->delete();
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'middle_name' => $user->middle_name,
                'email' => $user->email,
                'role' => $user->role,
                'profile_picture' => $user->profile_picture,
                'profile_picture_url' => $user->profile_picture ? asset('storage/' . $user->profile_picture) : null,
            ]
        ]);
    }
/**
 * Send OTP to user's email for password reset
 */
public function forgotPassword(Request $request)
{
    $validator = Validator::make($request->all(), [
        'email' => 'required|email|exists:users,email'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Email not found or invalid',
            'errors' => $validator->errors()
        ], 422);
    }

    $user = User::where('email', $request->email)->first();
    
    // Generate 6-digit OTP
    $otp = rand(100000, 999999);
    
    // Store OTP in cache (expires in 10 minutes)
    Cache::put('password_reset_otp_' . $user->id, $otp, 600);
    
    try {
        // Send email with OTP - UNCOMMENT THIS
        Mail::send('emails.otp', ['otp' => $otp, 'name' => $user->first_name], function($message) use ($user) {
            $message->to($user->email)
                    ->subject('Free Cp Giveaways');
        });
        
        // Also log for backup
        Log::info('Password Reset OTP for ' . $user->email . ': ' . $otp);
        
        return response()->json([
            'success' => true,
            'message' => 'OTP sent to your email address'
        ]);
        
    } catch (\Exception $e) {
        Log::error('Failed to send OTP email: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to send OTP. Error: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Verify OTP code
     */
    public function verifyOTP(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|string|size:6'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        $user = User::where('email', $request->email)->first();
        $cachedOtp = Cache::get('password_reset_otp_' . $user->id);
        
        if (!$cachedOtp || $cachedOtp != $request->otp) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired OTP code'
            ], 422);
        }
        
        // Mark OTP as verified
        Cache::put('password_reset_verified_' . $user->id, true, 600);
        
        return response()->json([
            'success' => true,
            'message' => 'OTP verified successfully'
        ]);
    }

    /**
     * Reset password after OTP verification
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|string|size:6',
            'new_password' => 'required|string|min:6'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        $user = User::where('email', $request->email)->first();
        
        // Verify OTP again
        $cachedOtp = Cache::get('password_reset_otp_' . $user->id);
        $isVerified = Cache::get('password_reset_verified_' . $user->id);
        
        if (!$cachedOtp || $cachedOtp != $request->otp || !$isVerified) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired OTP code'
            ], 422);
        }
        
        // Reset password
        $user->password = Hash::make($request->new_password);
        $user->save();
        
        // Clear OTP from cache
        Cache::forget('password_reset_otp_' . $user->id);
        Cache::forget('password_reset_verified_' . $user->id);
        
        // Log password reset activity
        ActivityLog::create([
            'user_id'     => $user->id,
            'student_id'  => null,
            'action_type' => 'UPDATE',
            'table_name'  => 'users',
            'record_id'   => $user->id,
            'old_values'  => null,
            'new_values'  => ['password_reset' => true],
            'description' => $user->first_name . ' ' . $user->last_name . ' reset their password via forgot password feature.',
            'ip_address'  => $request->ip(),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully. You can now login with your new password.'
        ]);
    }
}