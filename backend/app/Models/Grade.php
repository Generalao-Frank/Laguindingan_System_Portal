<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'grades';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'enrollment_id',
        'subject_id',
        'quarter_id',
        'teacher_id',
        'written_works',
        'performance_tasks',
        'quarterly_assessment',
        'final_grade',
        'status',
        'admin_remarks',
        'approved_at',
        'approved_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'written_works' => 'decimal:2',
        'performance_tasks' => 'decimal:2',
        'quarterly_assessment' => 'decimal:2',
        'final_grade' => 'integer',
        'approved_at' => 'datetime',
    ];

    /**
     * Get the enrollment that owns the grade.
     */
    public function enrollment()
    {
        return $this->belongsTo(Enrollment::class, 'enrollment_id');
    }

    /**
     * Get the subject that owns the grade.
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    /**
     * Get the quarter that owns the grade.
     */
    public function quarter()
    {
        return $this->belongsTo(Quarter::class, 'quarter_id');
    }

    /**
     * Get the teacher that owns the grade.
     */
    public function teacher()
    {
        return $this->belongsTo(Teacher::class, 'teacher_id');
    }

    /**
     * Get the admin who approved the grade.
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get the student through enrollment.
     */
    public function getStudentAttribute()
    {
        return $this->enrollment ? $this->enrollment->student->user : null;
    }

    /**
     * Get the student name.
     */
    public function getStudentNameAttribute()
    {
        if (!$this->enrollment || !$this->enrollment->student || !$this->enrollment->student->user) {
            return 'N/A';
        }
        
        $user = $this->enrollment->student->user;
        return $user->last_name . ', ' . $user->first_name . ' ' . $user->middle_name;
    }

    /**
     * Get the grade level and section.
     */
    public function getGradeSectionAttribute()
    {
        if (!$this->enrollment || !$this->enrollment->section) {
            return 'N/A';
        }
        
        $section = $this->enrollment->section;
        $gradeDisplay = $section->gradeLevel 
            ? ($section->gradeLevel->grade_level == 0 ? 'Kinder' : 'Grade ' . $section->gradeLevel->grade_level)
            : 'N/A';
        
        return $gradeDisplay . ' - ' . $section->section_name;
    }

    /**
     * Calculate the final grade based on DepEd grading system.
     */
    public function calculateFinalGrade()
    {
        $wwWeight = 0.30;  // 30%
        $ptWeight = 0.50;  // 50%
        $qaWeight = 0.20;  // 20%
        
        $finalGrade = ($this->written_works * $wwWeight) +
                      ($this->performance_tasks * $ptWeight) +
                      ($this->quarterly_assessment * $qaWeight);
        
        return round($finalGrade, 0);
    }

    /**
     * Automatically calculate and set final grade before saving.
     */
    protected static function booted()
    {
        static::saving(function ($grade) {
            if ($grade->written_works && $grade->performance_tasks && $grade->quarterly_assessment) {
                $grade->final_grade = $grade->calculateFinalGrade();
            }
        });
    }

    /**
     * Get the passing status.
     */
    public function getIsPassingAttribute()
    {
        return $this->final_grade >= 75;
    }

    /**
     * Get the passing status label.
     */
    public function getPassingStatusAttribute()
    {
        return $this->is_passing ? 'Passed' : 'Failed';
    }

    /**
     * Get the passing status color.
     */
    public function getPassingColorAttribute()
    {
        if ($this->final_grade >= 90) return 'green';
        if ($this->final_grade >= 85) return 'emerald';
        if ($this->final_grade >= 80) return 'blue';
        if ($this->final_grade >= 75) return 'indigo';
        return 'red';
    }

    /**
     * Get the grade remark.
     */
    public function getRemarkAttribute()
    {
        if ($this->final_grade >= 90) return 'Outstanding';
        if ($this->final_grade >= 85) return 'Very Satisfactory';
        if ($this->final_grade >= 80) return 'Satisfactory';
        if ($this->final_grade >= 75) return 'Fairly Satisfactory';
        return 'Did Not Meet Expectations';
    }

    /**
     * Get the status badge color.
     */
    public function getStatusColorAttribute()
    {
        if ($this->status === 'approved') return 'green';
        if ($this->status === 'rejected') return 'red';
        return 'yellow';
    }

    /**
     * Check if grade is pending.
     */
    public function getIsPendingAttribute()
    {
        return $this->status === 'pending';
    }

    /**
     * Check if grade is approved.
     */
    public function getIsApprovedAttribute()
    {
        return $this->status === 'approved';
    }

    /**
     * Check if grade is rejected.
     */
    public function getIsRejectedAttribute()
    {
        return $this->status === 'rejected';
    }

    /**
     * Scope a query to only include pending grades.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include approved grades.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope a query to only include rejected grades.
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    // ... rest of your existing scopes and methods (scopeForSubject, scopeForQuarter, etc.)
    // Keep all your existing scope methods below...
}