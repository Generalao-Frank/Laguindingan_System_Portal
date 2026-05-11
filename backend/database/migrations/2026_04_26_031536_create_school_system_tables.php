    <?php

    use Illuminate\Database\Migrations\Migration;
    use Illuminate\Database\Schema\Blueprint;
    use Illuminate\Support\Facades\Schema;

    return new class extends Migration {

        public function up(): void
        {
            /*
            |--------------------------------------------------------------------------
            | 1. USERS (Dapat "create" ito dahil ito ang base table)
            |--------------------------------------------------------------------------
            */
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                //para sa information ng teacher or students
                $table->string('first_name');
                $table->string('middle_name');
                $table->string('last_name');
                $table->enum('gender', ['Male', 'Female']);
                $table->string('suffix')->nullable();
                $table->date('birthdate')->nullable();
                $table->text('address')->nullable();
                $table->string('contact_number', 11)->nullable();

                $table->string('profile_picture')->nullable();

                $table->string('username')->unique();
                $table->string('email')->nullable()->unique();
                

                $table->string('password');
                $table->enum('role', ['Admin', 'Teacher', 'Student'])->default('Student');
                $table->string('fcm_token')->nullable();
                $table->rememberToken();
                $table->timestamps();
            });

            /*
            |--------------------------------------------------------------------------
            | 2. SCHOOL YEARS & QUARTERS
            |--------------------------------------------------------------------------
            */
            Schema::create('school_years', function (Blueprint $table) {
                $table->id();
                $table->year('year_start');
                $table->year('year_end');
                $table->boolean('is_active')->default(false);
                $table->timestamps();
            });

            Schema::create('quarters', function (Blueprint $table) {
                $table->id();
                $table->foreignId('school_year_id')->constrained()->cascadeOnDelete();
                $table->string('name'); 
                $table->date('start_date');
                $table->date('end_date');
                $table->boolean('is_active')->default(false);
                $table->boolean('is_locked')->default(false);
                $table->timestamps();
            });

            /*
            |--------------------------------------------------------------------------
            | 3. ACADEMIC STRUCTURE
            |--------------------------------------------------------------------------
            */
            Schema::create('grade_levels', function (Blueprint $table) {
                $table->id();
                $table->integer('grade_level')->unique(); // 0 for Kinder, 1-6
                $table->timestamps();
            });

            Schema::create('teachers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->string('employee_id')->nullable()->unique();
                $table->timestamps();
            });

            Schema::create('rooms', function (Blueprint $table) {
                $table->id();
                $table->string('room_name')->unique(); // Halimbawa: "Room 101", "Math Lab", "Covered Court"
                $table->integer('capacity')->nullable(); // Ilang estudyante ang kasya
                $table->timestamps();
            });

            Schema::create('sections', function (Blueprint $table) {
                $table->id();
                $table->foreignId('grade_level_id')->constrained()->cascadeOnDelete();
                $table->string('section_name');

                $table->foreignId('room_id')->nullable()->constrained('rooms')->onDelete('set null');

                $table->foreignId('school_year_id')->constrained()->cascadeOnDelete();
                $table->foreignId('adviser_id')->nullable()->constrained('teachers')->onDelete('set null');
                $table->timestamps();
            });

            Schema::create('subjects', function (Blueprint $table) {
                $table->id();
                $table->string('subject_name');
                $table->foreignId('grade_level_id')->constrained()->cascadeOnDelete();
                $table->timestamps();
            });

            /*
            |--------------------------------------------------------------------------
            | 4. STUDENTS & ENROLLMENTS
            |--------------------------------------------------------------------------
            */
            Schema::create('students_info', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->unsignedBigInteger('lrn')->unique();
                $table->string('PSA_Number')->nullable()->unique();
                $table->string('father_name');
                $table->string('mother_name');
                $table->string('guardian_name');
                $table->string('guardian_contact_number', 11);
                $table->timestamps();
            });

            Schema::create('enrollments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->constrained('students_info')->cascadeOnDelete();
                $table->foreignId('section_id')->constrained()->cascadeOnDelete();
                $table->foreignId('school_year_id')->constrained()->cascadeOnDelete();
                $table->date('date_enrolled')->nullable();
                $table->enum('status', ['Active', 'Completed', 'Dropped'])->default('Active');

$table->unique(['student_id', 'section_id', 'school_year_id']);
            
                $table->timestamps();
            });

            Schema::create('student_status_history', function (Blueprint $table) {
                $table->id();
                // Nakatali sa students_info para alam kung kaninong record ito
                $table->foreignId('student_id')->constrained('students_info')->cascadeOnDelete();

                // Para malaman kung anong taon nangyari ang status change
                $table->foreignId('school_year_id')->constrained()->cascadeOnDelete();

                // Ang listahan ng academic milestones ng bata
                $table->enum('status', [
                    'Enrolled',        // Kasalukuyang nag-aaral
                    'Transferred Out', // Lumipat ng ibang school
                    'Dropped',         // Huminto sa pag-aaral (LWD - Long-term Withdrawal)
                    'Graduated',       // Nakatapos ng Grade 6 (Complete Elementary)
                    'Promoted',        // Nakapasa at aakyat sa susunod na Grade Level
                    'Retained',        // Hindi nakapasa at uulitin ang level
                    'On Leave'         // Temporary absence (hal. medical reasons)
                ]);

                $table->date('effective_date'); // Kailan naging official ang status
                $table->text('remarks')->nullable(); // Detalye (e.g., "Moved to Manila", "Failed 3 subjects")

                // Audit Trail: Sino ang nag-update ng status (Registrar o Admin)
                $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();

                $table->timestamps();
            });

            /*
            |--------------------------------------------------------------------------
            | 5. INSTRUCTIONAL TOOLS
            |--------------------------------------------------------------------------
            */
            Schema::create('teacher_assignments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('teacher_id')->constrained('teachers')->cascadeOnDelete();
                $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
                $table->foreignId('section_id')->constrained()->cascadeOnDelete();
                $table->foreignId('school_year_id')->constrained()->cascadeOnDelete();

                $table->unique(['teacher_id', 'subject_id', 'section_id', 'school_year_id'], 'teacher_assign_unique');

                $table->timestamps();
            });

          Schema::create('attendance', function (Blueprint $table) {
    $table->id();
    $table->foreignId('enrollment_id')->constrained()->cascadeOnDelete();
    $table->foreignId('teacher_id')->constrained('teachers')->cascadeOnDelete(); // <-- IDAGDAG ITO
    $table->date('date')->index();
    $table->time('time_in')->nullable();    
    $table->time('time_out')->nullable();
    $table->enum('status', ['Present', 'Late', 'Absent']);
    $table->text('remarks')->nullable();
    $table->timestamps();

    // Optional: unique constraint para iwas duplicate per teacher per student per day
    $table->unique(['enrollment_id', 'teacher_id', 'date'], 'attendance_unique_record');
});

            /*
            |--------------------------------------------------------------------------
            | 6. GRADING SYSTEM
            |--------------------------------------------------------------------------
            */
            Schema::create('grades', function (Blueprint $table) {
                $table->id();
                $table->foreignId('enrollment_id')->constrained()->cascadeOnDelete();
                $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
                $table->foreignId('quarter_id')->constrained('quarters')->cascadeOnDelete();
            
            $table->unique(['enrollment_id', 'subject_id', 'quarter_id']);
            
                //DepEd grading system
                $table->decimal('written_works', 5, 2)->default(0);
                $table->decimal('performance_tasks', 5, 2)->default(0);
                $table->decimal('quarterly_assessment', 5, 2)->default(0);
                $table->integer('final_grade')->nullable();
                $table->timestamps();
            });

            /*
            |--------------------------------------------------------------------------
            | 7. LMS & EXTRAS
            |--------------------------------------------------------------------------
            */
            Schema::create('activities', function (Blueprint $table) {
                $table->id();
                $table->foreignId('teacher_id')->constrained('teachers')->cascadeOnDelete();
                $table->foreignId('section_id')->constrained()->cascadeOnDelete();
                $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->dateTime('deadline')->nullable();
                $table->integer('max_points')->default(100);
                $table->timestamps();
            });

            Schema::create('submissions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('activity_id')->constrained()->cascadeOnDelete();
                $table->foreignId('enrollment_id')->constrained()->cascadeOnDelete();
                $table->string('image_path')->nullable();
                $table->integer('points_earned')->nullable();
                $table->text('feedback')->nullable();

                $table->unique(['activity_id', 'enrollment_id']);
                $table->timestamps();
            });

            Schema::create('student_qr_codes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->unique()->constrained('students_info')->cascadeOnDelete();
                $table->text('qr_data');
                $table->timestamps();
            });

            Schema::create('meetings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('location')->nullable();
                $table->dateTime('meeting_datetime');
                $table->enum('audience', ['Teachers', 'Students', 'All']);
                $table->enum('status', ['Scheduled', 'Completed', 'Cancelled'])->default('Scheduled');
                $table->timestamps();
            });

            Schema::create('activity_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

                $table->foreignId('student_id')->nullable()->constrained('students_info')->nullOnDelete();

                $table->enum('action_type', ['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','UPLOAD','TRANSFER','ENROLL','DROP','GRADE_UPDATE']);
                $table->string('table_name');
                $table->string('record_id');
                $table->json('old_values')->nullable(); 
                $table->json('new_values')->nullable();
                $table->text('description');
                $table->string('ip_address', 45)->nullable();
                $table->timestamps();
            });

        
        }

        public function down(): void
        {
            // Mas maigi na ganito ang pagkakasunod-sunod para iwas foreign key constraint errors
            
            Schema::dropIfExists('activity_logs');
            Schema::dropIfExists('meetings');
            Schema::dropIfExists('student_qr_codes');
            Schema::dropIfExists('submissions');
            Schema::dropIfExists('activities');
            Schema::dropIfExists('grades');
            Schema::dropIfExists('attendance');
            Schema::dropIfExists('teacher_assignments');
            Schema::dropIfExists('student_status_history');
            Schema::dropIfExists('enrollments');
            Schema::dropIfExists('students_info');
            Schema::dropIfExists('subjects');
            Schema::dropIfExists('sections');
            Schema::dropIfExists('rooms');
            Schema::dropIfExists('teachers');
            Schema::dropIfExists('grade_levels');
            Schema::dropIfExists('quarters');
            Schema::dropIfExists('school_years');
            Schema::dropIfExists('users');
        }
    };