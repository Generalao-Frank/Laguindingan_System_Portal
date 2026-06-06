import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Users, Loader2, Eye, Download, 
  TrendingUp, Award, Clock, Calendar, BookOpen, 
  ChevronDown, ChevronUp, X, AlertCircle, GraduationCap,
  BarChart3, Activity, UserCheck, UserX
} from 'lucide-react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import API_URL from '../config';

const StudentPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [sections, setSections] = useState([]);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);

  const token = localStorage.getItem('userToken');

  const gradeLevels = [
    { value: 0, label: 'Kinder' },
    { value: 1, label: 'Grade 1' },
    { value: 2, label: 'Grade 2' },
    { value: 3, label: 'Grade 3' },
    { value: 4, label: 'Grade 4' },
    { value: 5, label: 'Grade 5' },
    { value: 6, label: 'Grade 6' }
  ];

  useEffect(() => {
    fetchStudents();
    fetchSections();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setStudents(response.data.students);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load student records');
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/sections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSections(response.data.sections);
      }
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  const fetchStudentPerformance = async (student) => {
    setIsLoadingPerformance(true);
    try {
      const response = await axios.get(`${API_URL}/admin/students/${student.id}/performance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPerformanceData(response.data.data);
        setSelectedStudent(student);
        setShowPerformanceModal(true);
      } else {
        setError('Failed to load student performance data');
      }
    } catch (err) {
      console.error('Error fetching performance:', err);
      setError('Failed to load student performance');
    } finally {
      setIsLoadingPerformance(false);
    }
  };

  const getGradeName = (grade) => {
    if (grade === 0) return 'Kinder';
    if (!grade && grade !== 0) return 'N/A';
    return `Grade ${grade}`;
  };

  const getAvailableSections = () => {
    if (filterGrade === 'all') {
      return [...new Set(students.map(s => s.section).filter(Boolean))];
    }
    const gradeNum = parseInt(filterGrade);
    const sectionsInGrade = students
      .filter(s => s.grade_level === gradeNum && s.section)
      .map(s => s.section);
    return [...new Set(sectionsInGrade)];
  };

  const filteredSections = getAvailableSections();

  useEffect(() => {
    setFilterSection('all');
  }, [filterGrade]);

  // ✅ FIXED SEARCH FUNCTION - mas robust na paghahanap
  const filteredStudents = students.filter(student => {
    // Build full name for searching
    const fullName = `${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.toLowerCase();
    const lastNameFirst = `${student.last_name || ''}, ${student.first_name || ''} ${student.middle_name || ''}`.toLowerCase();
    const firstNameLast = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
    
    // Search term
    const term = searchTerm.toLowerCase().trim();
    
    // If search term is empty, just filter by grade and section
    if (term === '') {
      const matchesGrade = filterGrade === 'all' || student.grade_level === parseInt(filterGrade);
      const matchesSection = filterSection === 'all' || student.section === filterSection;
      return matchesGrade && matchesSection;
    }
    
    // Check if search term matches any field
    const matchesLRN = student.lrn && student.lrn.toString().includes(term);
    const matchesFullName = fullName.includes(term);
    const matchesLastNameFirst = lastNameFirst.includes(term);
    const matchesFirstNameLast = firstNameLast.includes(term);
    const matchesGradeFilter = filterGrade === 'all' || student.grade_level === parseInt(filterGrade);
    const matchesSectionFilter = filterSection === 'all' || student.section === filterSection;
    
    return (matchesLRN || matchesFullName || matchesLastNameFirst || matchesFirstNameLast) && 
           matchesGradeFilter && 
           matchesSectionFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Excellent':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Excellent</span>;
      case 'Satisfactory':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Satisfactory</span>;
      case 'Poor':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Poor</span>;
      default:
        return null;
    }
  };

  // Clear search function
  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp size={24} className="text-indigo-600" />
            Student Performance
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track and analyze individual student academic performance and attendance
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or LRN..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
            >
              <option value="all">All Grade Levels</option>
              {gradeLevels.map(grade => (
                <option key={grade.value} value={grade.value}>{grade.label}</option>
              ))}
            </select>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
              disabled={filterGrade === 'all'}
            >
              <option value="all">All Sections</option>
              {filteredSections.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={fetchStudents}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
          
          {/* Search result count */}
          {searchTerm && (
            <div className="mt-3 text-xs text-gray-500">
              Found {filteredStudents.length} student(s) matching "{searchTerm}"
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Total Students</p>
                <p className="text-2xl font-bold text-gray-800">{filteredStudents.length}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Users size={18} className="text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Grade Levels</p>
                <p className="text-2xl font-bold text-gray-800">
                  {new Set(filteredStudents.map(s => s.grade_level).filter(Boolean)).size}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <GraduationCap size={18} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Sections</p>
                <p className="text-2xl font-bold text-gray-800">
                  {new Set(filteredStudents.map(s => s.section).filter(Boolean)).size}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <BookOpen size={18} className="text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Male / Female</p>
                <p className="text-2xl font-bold text-gray-800">
                  {filteredStudents.filter(s => s.gender === 'Male').length} / {filteredStudents.filter(s => s.gender === 'Female').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
                <Users size={18} className="text-pink-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Student List</h3>
            {searchTerm && (
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                {filteredStudents.length} results
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Users size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-400 font-medium">No students found</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm ? `No results matching "${searchTerm}"` : 'Try adjusting your filters'}
              </p>
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="mt-3 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">LRN</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Grade & Section</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Gender</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">
                            {student.last_name}, {student.first_name} {student.middle_name || ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs text-gray-600">{student.lrn || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {getGradeName(student.grade_level)} - {student.section || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-sm ${student.gender === 'Male' ? 'text-blue-600' : 'text-pink-600'}`}>
                          {student.gender}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => fetchStudentPerformance(student)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye size={13} />
                          View Performance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Performance Modal */}
      {showPerformanceModal && selectedStudent && performanceData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedStudent.last_name}, {selectedStudent.first_name} {selectedStudent.middle_name || ''}
                </h2>
                <p className="text-sm text-gray-500">LRN: {selectedStudent.lrn || 'N/A'}</p>
              </div>
              <button
                onClick={() => {
                  setShowPerformanceModal(false);
                  setSelectedStudent(null);
                  setPerformanceData(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {isLoadingPerformance ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Grade & Section</p>
                    <p className="font-semibold text-gray-800">
                      {getGradeName(selectedStudent.grade_level)} - {selectedStudent.section || 'N/A'}
                    </p>
                  </div>
                  {getStatusBadge(performanceData.status)}
                </div>

                {/* Performance Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4">
                    <p className="text-xs text-indigo-600 uppercase font-semibold">Overall Average</p>
                    <p className="text-3xl font-bold text-indigo-700">
                      {performanceData.overall_average ? `${performanceData.overall_average}%` : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                    <p className="text-xs text-green-600 uppercase font-semibold">Attendance Rate</p>
                    <p className="text-3xl font-bold text-green-700">
                      {performanceData.attendance?.attendance_rate || 0}%
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4">
                    <p className="text-xs text-yellow-600 uppercase font-semibold">Ranking</p>
                    <p className="text-3xl font-bold text-yellow-700">
                      {performanceData.ranking ? `#${performanceData.ranking}` : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Grades Table */}
                <div>
                  <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <BookOpen size={18} className="text-indigo-500" />
                    Academic Performance
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-4 py-3 font-semibold text-gray-600">Subject</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">Q1</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">Q2</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">Q3</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">Q4</th>
                          <th className="text-center px-4 py-3 font-semibold text-indigo-600 bg-indigo-50">Average</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {performanceData.grades && performanceData.grades.length > 0 ? (
                          performanceData.grades.map((subject, idx) => {
                            const avg = subject.average;
                            const avgColor = avg && avg >= 75 ? 'text-green-600' : avg && avg >= 60 ? 'text-yellow-600' : 'text-red-600';
                            return (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-800">{subject.subject_name}</td>
                                <td className="px-4 py-3 text-center">{subject.q1 ?? '-'}</td>
                                <td className="px-4 py-3 text-center">{subject.q2 ?? '-'}</td>
                                <td className="px-4 py-3 text-center">{subject.q3 ?? '-'}</td>
                                <td className="px-4 py-3 text-center">{subject.q4 ?? '-'}</td>
                                <td className={`px-4 py-3 text-center font-semibold ${avgColor}`}>
                                  {avg ? `${avg}%` : '-'}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                              No grade records available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Attendance Chart */}
                {performanceData.attendance?.monthly_breakdown && performanceData.attendance.monthly_breakdown.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Activity size={18} className="text-orange-500" />
                      Monthly Attendance
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceData.attendance.monthly_breakdown}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="present" stroke="#10B981" name="Present" />
                          <Line type="monotone" dataKey="late" stroke="#F59E0B" name="Late" />
                          <Line type="monotone" dataKey="absent" stroke="#EF4444" name="Absent" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Attendance Summary */}
                {performanceData.attendance && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                      <UserCheck size={20} className="text-green-600" />
                      <div>
                        <p className="text-xs text-green-600 uppercase">Present</p>
                        <p className="text-xl font-bold text-green-700">{performanceData.attendance.total_present || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
                      <Clock size={20} className="text-yellow-600" />
                      <div>
                        <p className="text-xs text-yellow-600 uppercase">Late</p>
                        <p className="text-xl font-bold text-yellow-700">{performanceData.attendance.total_late || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                      <UserX size={20} className="text-red-600" />
                      <div>
                        <p className="text-xs text-red-600 uppercase">Absent</p>
                        <p className="text-xl font-bold text-red-700">{performanceData.attendance.total_absent || 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 shadow-lg">
          <AlertCircle size={20} className="text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentPerformance;