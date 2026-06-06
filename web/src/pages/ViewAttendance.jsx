import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Search, Filter, Download, Printer, Users, 
  GraduationCap, Clock, CheckCircle, XCircle, AlertCircle,
  Loader2, ChevronRight, Eye, TrendingUp, Award, BarChart3,
  Activity, UserCheck, UserX, Zap, Target, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import API_URL from '../config';

const ViewAttendance = () => {
  const navigate = useNavigate();
  const [schoolYears, setSchoolYears] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [sections, setSections] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [quarterlyStats, setQuarterlyStats] = useState({
    totalStudents: 0,
    present: 0,
    late: 0,
    absent: 0,
    attendanceRate: 0,
    weeklyTrend: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedSection, setSelectedSection] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const token = localStorage.getItem('userToken');

  // Helper: get initials from full name "Last, First Middle"
  const getInitialsFromFullName = (fullName) => {
    if (!fullName) return 'S';
    const parts = fullName.split(',');
    if (parts.length === 2) {
      const lastName = parts[0].trim();
      const firstNamePart = parts[1].trim();
      const firstName = firstNamePart.split(' ')[0];
      return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    }
    return fullName.charAt(0).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const filteredSectionsByGrade = sections.filter(
    sec => sec.grade_level === parseInt(selectedGradeLevel)
  );

  useEffect(() => {
    fetchSchoolYears();
    fetchGradeLevels();
  }, []);

  const fetchSchoolYears = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/school-years`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSchoolYears(response.data.school_years);
        const active = response.data.school_years.find(sy => sy.is_active);
        if (active) {
          setSelectedSchoolYear(active);
          fetchQuarters(active.id);
        }
      }
    } catch (error) {
      console.error('Error fetching school years:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuarters = async (schoolYearId) => {
    try {
      const response = await axios.get(`${API_URL}/admin/school-years/${schoolYearId}/quarters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setQuarters(response.data.quarters);
      }
    } catch (error) {
      console.error('Error fetching quarters:', error);
    }
  };

  const fetchGradeLevels = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/grade-levels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setGradeLevels(response.data.grade_levels);
      }
    } catch (error) {
      console.error('Error fetching grade levels:', error);
      setGradeLevels([
        { id: 1, grade_level: 0, grade_display: 'Kinder' },
        { id: 2, grade_level: 1, grade_display: 'Grade 1' },
        { id: 3, grade_level: 2, grade_display: 'Grade 2' },
        { id: 4, grade_level: 3, grade_display: 'Grade 3' },
        { id: 5, grade_level: 4, grade_display: 'Grade 4' },
        { id: 6, grade_level: 5, grade_display: 'Grade 5' },
        { id: 7, grade_level: 6, grade_display: 'Grade 6' },
      ]);
    }
  };

  const fetchSections = async () => {
    if (!selectedSchoolYear) return;
    try {
      const response = await axios.get(`${API_URL}/admin/sections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        const filtered = response.data.sections.filter(s => s.school_year_id === selectedSchoolYear.id);
        setSections(filtered);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchQuarterlySummary = useCallback(async () => {
    if (!selectedSchoolYear || !selectedQuarter) {
      setStudentsList([]);
      setQuarterlyStats({
        totalStudents: 0,
        present: 0,
        late: 0,
        absent: 0,
        attendanceRate: 0,
        weeklyTrend: []
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const params = {
        school_year_id: selectedSchoolYear.id,
        quarter_id: selectedQuarter.id,
      };
      if (selectedGradeLevel) {
        params.grade_level = parseInt(selectedGradeLevel);
      }
      if (selectedSection) {
        params.section_id = selectedSection.id;
      }

      const response = await axios.get(`${API_URL}/admin/attendance/quarterly-summary`, {
        params,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setStudentsList(response.data.students || []);
        const stats = response.data.stats || {
          totalStudents: 0,
          present: 0,
          late: 0,
          absent: 0,
          attendanceRate: 0,
          weeklyTrend: []
        };
        stats.attendanceRate = Math.min(100, stats.attendanceRate);
        setQuarterlyStats(stats);
      } else {
        setError(response.data.message || 'Failed to load quarterly attendance');
        setStudentsList([]);
        setQuarterlyStats({
          totalStudents: 0,
          present: 0,
          late: 0,
          absent: 0,
          attendanceRate: 0,
          weeklyTrend: []
        });
      }
    } catch (error) {
      console.error('Error fetching quarterly attendance:', error);
      setError('Unable to load attendance data. Please check your connection.');
      setStudentsList([]);
      setQuarterlyStats({
        totalStudents: 0,
        present: 0,
        late: 0,
        absent: 0,
        attendanceRate: 0,
        weeklyTrend: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedSchoolYear, selectedQuarter, selectedGradeLevel, selectedSection, token]);

  useEffect(() => {
    if (selectedSchoolYear) {
      fetchSections();
      setSelectedQuarter(null);
      setSelectedGradeLevel('');
      setSelectedSection(null);
    }
  }, [selectedSchoolYear]);

  useEffect(() => {
    setSelectedSection(null);
  }, [selectedGradeLevel]);

  useEffect(() => {
    fetchQuarterlySummary();
  }, [fetchQuarterlySummary]);

  const filteredStudents = studentsList.filter(student => {
    const lrnStr = student.lrn ? String(student.lrn) : '';
    const fullName = student.name || '';
    return lrnStr.includes(searchTerm) || fullName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getGradeDisplay = (grade) => {
    if (grade === 0) return 'Kinder';
    return `Grade ${grade}`;
  };

  const pieData = [
    { name: 'Present', value: quarterlyStats.present, color: '#10B981' },
    { name: 'Late', value: quarterlyStats.late, color: '#F59E0B' },
    { name: 'Absent', value: quarterlyStats.absent, color: '#EF4444' }
  ];

  const weeklyTrendData = quarterlyStats.weeklyTrend || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <Activity size={24} className="text-indigo-600" />
                Attendance Overview
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Quarterly attendance summary • Filter by grade level or section
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"><Printer size={16} /> Print</button>
              <button onClick={() => navigate('/admin/attendance/reports')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium"><BarChart3 size={16} /> Full Report</button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* School Year */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">School Year</label>
              <select
                value={selectedSchoolYear?.id || ''}
                onChange={(e) => {
                  const sy = schoolYears.find(s => s.id === parseInt(e.target.value));
                  setSelectedSchoolYear(sy);
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
              >
                <option value="">Select School Year</option>
                {schoolYears.map(sy => (
                  <option key={sy.id} value={sy.id}>
                    {sy.year_start}-{sy.year_end} {sy.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Quarter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Quarter</label>
              <select
                value={selectedQuarter?.id || ''}
                onChange={(e) => {
                  const q = quarters.find(q => q.id === parseInt(e.target.value));
                  setSelectedQuarter(q);
                }}
                disabled={!selectedSchoolYear}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none disabled:opacity-50"
              >
                <option value="">Select Quarter</option>
                {quarters.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Level */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Grade Level (Optional)</label>
              <select
                value={selectedGradeLevel}
                onChange={(e) => setSelectedGradeLevel(e.target.value)}
                disabled={!selectedSchoolYear}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none disabled:opacity-50"
              >
                <option value="">All Grade Levels</option>
                {gradeLevels.map(gl => (
                  <option key={gl.id} value={gl.grade_level}>
                    {gl.grade_display || getGradeDisplay(gl.grade_level)}
                  </option>
                ))}
              </select>
            </div>

            {/* Section (depende sa grade level) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Section (Optional)</label>
              <select
                value={selectedSection?.id || ''}
                onChange={(e) => {
                  const sec = sections.find(s => s.id === parseInt(e.target.value));
                  setSelectedSection(sec);
                }}
                disabled={!selectedSchoolYear || !selectedGradeLevel}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none disabled:opacity-50"
              >
                <option value="">All Sections</option>
                {filteredSectionsByGrade.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.section_name}
                  </option>
                ))}
              </select>
              {selectedGradeLevel && filteredSectionsByGrade.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">No sections for this grade level</p>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <p className="text-gray-500 text-sm mt-4">Loading quarterly attendance...</p>
          </div>
        ) : !selectedSchoolYear || !selectedQuarter ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Select Filters</h3>
            <p className="text-gray-400 text-sm">Please select school year and quarter to view attendance overview</p>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase">Total Students</p>
                <p className="text-2xl font-bold text-gray-800">{quarterlyStats.totalStudents}</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <p className="text-xs text-green-600 uppercase">Present</p>
                <p className="text-2xl font-bold text-green-600">{quarterlyStats.present}</p>
                <p className="text-[10px] text-green-500">{quarterlyStats.attendanceRate.toFixed(1)}%</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                <p className="text-xs text-yellow-600 uppercase">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{quarterlyStats.late}</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-xs text-red-600 uppercase">Absent</p>
                <p className="text-2xl font-bold text-red-600">{quarterlyStats.absent}</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase">Attendance Rate</p>
                <p className="text-2xl font-bold text-indigo-600">{quarterlyStats.attendanceRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Pie Chart – Attendance Distribution */}
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Attendance Distribution (Quarter)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekly Trend (Bar Chart) */}
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Weekly Attendance Trend</h3>
                <div className="h-64">
                  {weeklyTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" fill="#10B981" name="Present" />
                        <Bar dataKey="late" fill="#F59E0B" name="Late" />
                        <Bar dataKey="absent" fill="#EF4444" name="Absent" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No weekly data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search student by name or LRN..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Students Table with Attendance Rate & Status */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">#</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">LRN</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Grade & Section</th>
                      <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Attendance Rate</th>
                      <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.length > 0 ? filteredStudents.map((student, index) => {
                      const initials = getInitialsFromFullName(student.name);
                      return (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm overflow-hidden">
                                {student.profile_picture ? (
                                  <img src={student.profile_picture} alt="Profile" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  initials
                                )}
                              </div>
                              <p className="font-medium text-gray-800 text-sm">{student.name}</p>
                            </div>
                          </td>
                          <td className="px-5 py-3"><span className="font-mono text-xs text-gray-600">{student.lrn || 'N/A'}</span></td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <GraduationCap size={12} className="text-gray-400" />
                              <span className="text-sm text-gray-700">
                                {student.grade_display || `Grade ${student.grade_level}`} - {student.section || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="text-sm font-semibold">
                              {student.attendance_rate !== undefined ? `${student.attendance_rate}%` : 'N/A'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            {student.status && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium 
                                ${student.status_color === 'green' ? 'bg-green-100 text-green-700' :
                                  student.status_color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'}`}>
                                {student.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="6" className="px-5 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <Users size={32} className="text-gray-300 mb-2" />
                            <p className="text-gray-400 text-sm">No students found for the selected filters</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Summary */}
            {filteredStudents.length > 0 && (
              <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                <p>Showing {filteredStudents.length} of {studentsList.length} students</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Present</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span>Late</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Absent</span></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ViewAttendance;