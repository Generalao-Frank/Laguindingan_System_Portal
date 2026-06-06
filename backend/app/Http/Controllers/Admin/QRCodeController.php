<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\StudentQrCode;
use App\Models\StudentsInfo;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QRCodeController extends Controller
{
    public function stats()
    {
        $totalStudents = User::where('role', 'Student')->count();
        $hasQRCode = StudentQrCode::count();
        $noQRCode = $totalStudents - $hasQRCode;
        $generatedToday = StudentQrCode::whereDate('created_at', today())->count();
        
        return response()->json([
            'success' => true,
            'stats' => [
                'totalStudents' => $totalStudents,
                'hasQRCode' => $hasQRCode,
                'noQRCode' => $noQRCode,
                'generatedToday' => $generatedToday,
            ]
        ]);
    }
    
    // Get QR code for a specific student
    public function getStudentQR($studentInfoId)
    {
        $qrCode = StudentQrCode::where('student_id', $studentInfoId)->first();
        
        if (!$qrCode) {
            return response()->json([
                'success' => false,
                'message' => 'QR code not found'
            ], 404);
        }
        
        return response()->json([
            'success' => true,
            'qr_code' => $qrCode
        ]);
    }
    
    // Optional: Regenerate QR code if needed
    public function regenerate($studentInfoId)
    {
        $studentInfo = StudentsInfo::find($studentInfoId);
        
        if (!$studentInfo) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found'
            ], 404);
        }
        
        $user = $studentInfo->user;
        $enrollment = $studentInfo->enrollments()->where('status', 'Active')->first();
        $section = $enrollment ? $enrollment->section : null;
        $gradeLevel = $section && $section->gradeLevel ? $section->gradeLevel->grade_level : null;
        
        $qrData = json_encode([
            'student_id' => $studentInfo->id,
            'lrn' => $studentInfo->lrn,
            'name' => $user->first_name . ' ' . $user->last_name,
            'grade_level' => $gradeLevel,
            'section' => $section ? $section->section_name : null,
            'timestamp' => now()->toISOString()
        ]);
        
        $qrCode = StudentQrCode::updateOrCreate(
            ['student_id' => $studentInfo->id],
            ['qr_data' => $qrData]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'QR code regenerated successfully',
            'qr_code' => $qrCode
        ]);
    }
}