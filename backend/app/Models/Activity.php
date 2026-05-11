<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Activity extends Model
{

protected $table = 'activities';
    protected $fillable = [
        'teacher_id', 'section_id', 'subject_id', 'title',
        'description', 'deadline', 'max_points'
    ];

    protected $casts = [
        'deadline' => 'datetime',
    ];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function submissions()
    {
        return $this->hasMany(Submission::class, 'activity_id');
    }
}