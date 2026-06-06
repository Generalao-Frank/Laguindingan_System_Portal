<?php
// app/Http/Controllers/Admin/BulkEnrollmentController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Models\StudentsInfo;
use App\Models\Enrollment;
use App\Models\StudentStatusHistory;
use App\Models\Section;
use App\Models\SchoolYear;
use Shuchkin\SimpleXLSX;

class BulkEnrollmentController extends Controller
{
    // GET /admin/bulk-enrollment
    public function index()
    {
        $sections = Section::with('gradeLevel')->get();
        $schoolYears = SchoolYear::orderBy('year_start', 'desc')->get();

        return response()->json([
            'success' => true,
            'sections' => $sections->map(fn($s) => [
                'id' => $s->id,
                'section_name' => $s->section_name,
                'grade_level' => $s->gradeLevel->grade_level,      // numeric (0,1,2...)
                'grade_level_id' => $s->grade_level_id,           // ID mula sa grade_levels table
                'school_year_id' => $s->school_year_id,           // para sa filter
            ]),
            'school_years' => $schoolYears,
        ]);
    }

    // Download template CSV (walang email at username columns)
    public function downloadTemplate()
    {
        $headers = [
            'first_name', 'middle_name', 'last_name', 'suffix', 'gender',
            'birthdate', 'address', 'contact_number',
            'lrn', 'psa_number', 'father_name', 'mother_name',
            'guardian_name', 'guardian_contact_number'
        ];

        $callback = function() use ($headers) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="enrollment_template.csv"',
        ]);
    }

    // POST /admin/bulk-enrollment/upload
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:5120',
            'section_id' => 'required|exists:sections,id',
            'school_year_id' => 'required|exists:school_years,id',
        ]);

        $extension = $request->file('file')->getClientOriginalExtension();
        if (!in_array(strtolower($extension), ['csv', 'xlsx', 'xls'])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid file type. Only CSV, XLSX, XLS are allowed.'
            ], 422);
        }

        $section = Section::with('gradeLevel')->findOrFail($request->section_id);
        $schoolYear = SchoolYear::findOrFail($request->school_year_id);

        // Parse file
        $data = $this->parseFile($request->file('file'));
        if (empty($data)) {
            return response()->json(['success' => false, 'message' => 'File is empty or invalid'], 422);
        }

        $total = count($data);
        $success = 0;
        $failedRows = [];

        DB::beginTransaction();

        foreach ($data as $index => $row) {
            $rowNumber = $index + 2;
            $validator = Validator::make($row, $this->validationRules());

            if ($validator->fails()) {
                $failedRows[] = [
                    'row' => $rowNumber,
                    'lrn' => $row['lrn'] ?? 'N/A',
                    'reason' => $validator->errors()->first(),
                ];
                continue;
            }

            // Check uniqueness ng LRN sa students_info
            if (StudentsInfo::where('lrn', $row['lrn'])->exists()) {
                $failedRows[] = ['row' => $rowNumber, 'lrn' => $row['lrn'], 'reason' => 'LRN already exists in students_info'];
                continue;
            }
            // Check uniqueness ng LRN bilang username sa users table
            if (User::where('username', $row['lrn'])->exists()) {
                $failedRows[] = ['row' => $rowNumber, 'lrn' => $row['lrn'], 'reason' => 'LRN already used as username by another user'];
                continue;
            }

            try {
                // Gumawa ng user gamit ang LRN bilang username
                $user = User::create([
                    'first_name' => $row['first_name'],
                    'middle_name' => $row['middle_name'] ?? '',
                    'last_name' => $row['last_name'],
                    'suffix' => $row['suffix'] ?? null,
                    'gender' => $row['gender'],
                    'birthdate' => $row['birthdate'] ?? null,
                    'address' => $row['address'] ?? null,
                    'contact_number' => $row['contact_number'] ?? null,
                    'email' => null,  // hindi ginagamit
                    'username' => $row['lrn'], // LRN = username
                    'password' => Hash::make('password'),
                    'role' => 'Student',
                ]);

                $studentInfo = StudentsInfo::create([
                    'user_id' => $user->id,
                    'lrn' => $row['lrn'],
                    'PSA_Number' => $row['psa_number'] ?? null,
                    'father_name' => $row['father_name'] ?? '',
                    'mother_name' => $row['mother_name'] ?? '',
                    'guardian_name' => $row['guardian_name'],
                    'guardian_contact_number' => $row['guardian_contact_number'],
                ]);

                Enrollment::create([
                    'student_id' => $studentInfo->id,
                    'section_id' => $request->section_id,
                    'school_year_id' => $request->school_year_id,
                    'date_enrolled' => now(),
                    'status' => 'Active',
                ]);

                // ✅ CREATE STUDENT STATUS HISTORY RECORD
                $gradeDisplay = $section && $section->gradeLevel 
                    ? ($section->gradeLevel->grade_level == 0 ? 'Kinder' : 'Grade ' . $section->gradeLevel->grade_level)
                    : 'N/A';
                
                StudentStatusHistory::create([
                    'student_id' => $studentInfo->id,
                    'school_year_id' => $request->school_year_id,
                    'status' => 'Enrolled',
                    'effective_date' => now(),
                    'remarks' => 'New enrollment for SY ' . $schoolYear->year_start . '-' . $schoolYear->year_end . ' - ' . $gradeDisplay . ' - ' . $section->section_name,
                    'changed_by' => auth()->id() ?? 1,
                ]);

                $success++;
            } catch (\Exception $e) {
                $failedRows[] = [
                    'row' => $rowNumber,
                    'lrn' => $row['lrn'],
                    'reason' => 'Database error: ' . $e->getMessage(),
                ];
            }
        }

        if ($success > 0) {
            DB::commit();
        } else {
            DB::rollBack();
        }

        // Generate failed CSV report
        $failedCsvUrl = null;
        if (!empty($failedRows)) {
            $failedCsvUrl = $this->generateFailedReport($failedRows);
        }

        return response()->json([
            'success' => true,
            'stats' => [
                'total' => $total,
                'success' => $success,
                'failed' => count($failedRows),
            ],
            'failed_rows' => $failedRows,
            'failed_csv_url' => $failedCsvUrl,
            'default_password' => 'password', // ipaalam sa admin
        ]);
    }

    private function parseFile($file)
    {
        $ext = $file->getClientOriginalExtension();
        
        // CSV handling
        if ($ext === 'csv') {
            $rows = array_map('str_getcsv', file($file));
            $header = array_shift($rows);
            // Remove BOM if present
            $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]);
            return array_map(fn($row) => array_combine($header, $row), $rows);
        }
        
        // Excel handling using SimpleXLSX
        $filePath = $file->getPathname();
        if ($xlsx = SimpleXLSX::parse($filePath)) {
            $rows = $xlsx->rows();
            if (empty($rows)) return [];
            $header = array_shift($rows);
            if (!is_array($header)) return [];
            // Clean header
            $header = array_map(function($col) {
                return strtolower(trim($col));
            }, $header);
            
            $data = [];
            foreach ($rows as $row) {
                $combined = [];
                foreach ($header as $idx => $key) {
                    $value = $row[$idx] ?? '';
                    
                    // Fix LRN (scientific notation)
                    if ($key === 'lrn' && is_numeric($value)) {
                        $value = number_format($value, 0, '', '');
                    }
                    
                    // Fix contact numbers (leading zero)
                    if (in_array($key, ['contact_number', 'guardian_contact_number']) && is_numeric($value)) {
                        $value = (string) (int) $value;
                        // Kung 10 digits ang haba, ibigay ang nawawalang leading zero
                        if (strlen($value) === 10) {
                            $value = '0' . $value;
                        }
                    }
                    
                    // PSA Number: convert to string para hindi maging scientific notation
                    if ($key === 'psa_number' && is_numeric($value)) {
                        $value = (string) (int) $value;
                    }
                    
                    $combined[$key] = $value;
                }
                $data[] = $combined;
            }
            return $data;
        }
        
        return [];
    }

    private function validationRules()
    {
        return [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'gender' => 'required|in:Male,Female',
            'birthdate' => 'nullable|date|before:today',
            'lrn' => 'required|string|size:12',
            'guardian_name' => 'required|string|max:255',
            'guardian_contact_number' => 'required|string|size:11',
            // wala nang username at email
        ];
    }

    private function generateFailedReport($failedRows)
    {
        $fileName = 'failed_enrollment_' . time() . '.csv';
        $filePath = storage_path('app/public/' . $fileName);
        
        $file = fopen($filePath, 'w');
        fputcsv($file, ['Row', 'LRN', 'Reason']);
        foreach ($failedRows as $row) {
            fputcsv($file, [$row['row'], $row['lrn'], $row['reason']]);
        }
        fclose($file);
        
        // Return public URL (run php artisan storage:link kung hindi pa)
        return asset('storage/' . $fileName);
    }
}