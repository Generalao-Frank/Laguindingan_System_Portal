<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentsInfo extends Model
{
    use HasFactory;

    protected $table = 'students_info';

    protected $fillable = [
        'user_id',
        'lrn',
        'PSA_Number',
        'father_name',
        'mother_name',
        'guardian_name',
        'guardian_contact_number',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'student_id');
    }

      public function qrCode()
    {
        return $this->hasOne(StudentQrCode::class, 'student_id');
    }
}