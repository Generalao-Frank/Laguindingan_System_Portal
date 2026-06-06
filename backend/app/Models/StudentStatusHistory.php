<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentStatusHistory extends Model
{
    use HasFactory;

    // Specify the correct table name (singular, not plural)
    protected $table = 'student_status_history';

    protected $fillable = [
        'student_id',
        'school_year_id',
        'status',
        'effective_date',
        'remarks',
        'changed_by',
    ];

    protected $casts = [
        'effective_date' => 'date',
    ];

    public function student()
    {
        return $this->belongsTo(StudentsInfo::class, 'student_id');
    }

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class, 'school_year_id');
    }

    public function changedByUser   ()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}