<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\StudentsInfo;
use App\Models\Meeting;  // CHANGE: Announcement -> Meeting
use App\Models\Enrollment;
use Illuminate\Support\Facades\Auth;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $student = StudentsInfo::where('user_id', $user->id)->first();
        
        $enrollment = Enrollment::where('student_id', $student->id)
            ->whereHas('schoolYear', function($query) {
                $query->where('is_active', true);
            })
            ->first();
        
        // Get meetings/announcements na para sa lahat o para sa estudyante
        $announcements = Meeting::where(function($query) use ($enrollment) {
                $query->where('audience', 'All')
                    ->orWhere('audience', 'Students')
                    ->orWhere('audience', 'All');
            })
            ->where('status', 'Scheduled')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($meeting) {
                // Get author name
                $authorName = 'Admin';
                if ($meeting->createdBy) {
                    $authorName = $meeting->createdBy->first_name . ' ' . $meeting->createdBy->last_name;
                }
                
                return [
                    'id' => $meeting->id,
                    'title' => $meeting->title,
                    'content' => $meeting->description ?? 'No description available',
                    'author' => $authorName,
                    'created_at' => $meeting->created_at,
                    'is_important' => false, // You can add is_important column to meetings table if needed
                ];
            });
        
        return response()->json([
            'announcements' => $announcements,
        ]);
    }
}