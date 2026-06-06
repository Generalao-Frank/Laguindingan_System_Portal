import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, Filter, Calendar, GraduationCap, 
  BookOpen, CheckCircle, XCircle, AlertCircle, Loader2,
  Eye, Download, Printer, ChevronRight, Award, TrendingUp,
  UserCheck, UserX, Clock, Zap, Target, FileText, X, UserPlus,
  History
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const ActiveEnrollments = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [sections, setSections] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedSection, setSelectedSection] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);
  const [stats, setStats] = useState({
    totalEnrollments: 0,
    totalStudents: 0,
    totalSections: 0,
    totalGradeLevels: 0,
    maleCount: 0,
    femaleCount: 0,
    byGradeLevel: []
  });

  const token = localStorage.getItem('userToken');

  const gradeLevelOptions = [
    { value: 0, label: 'Kinder' },
    { value: 1, label: 'Grade 1' },
    { value: 2, label: 'Grade 2' },
    { value: 3, label: 'Grade 3' },
    { value: 4, label: 'Grade 4' },
    { value: 5, label: 'Grade 5' },
    { value: 6, label: 'Grade 6' }
  ];

  const sectionsByGrade = selectedGradeLevel !== '' 
    ? sections.filter(sec => sec.grade_level === parseInt(selectedGradeLevel))
    : [];

  useEffect(() => {
    fetchSchoolYears();
    fetchSections();
    fetchAllStudents();
  }, []);

  useEffect(() => {
    if (selectedSchoolYear) {
      fetchSections();
      setSelectedGradeLevel('');
      setSelectedSection(null);
    }
  }, [selectedSchoolYear]);

  useEffect(() => {
    setSelectedSection(null);
  }, [selectedGradeLevel]);

  useEffect(() => {
    fetchEnrollments();
  }, [selectedSchoolYear, selectedSection]);

  useEffect(() => {
    if (enrollments.length > 0) {
      applyFilters();
    }
  }, [selectedGradeLevel, searchTerm, enrollments]);

  const fetchSchoolYears = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/school-years`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSchoolYears(response.data.school_years);
        const active = response.data.school_years.find(sy => sy.is_active);
        if (active) setSelectedSchoolYear(active);
      }
    } catch (error) {
      console.error('Error fetching school years:', error);
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

  const fetchAllStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setAllStudents(response.data.students);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchEnrollments = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (selectedSchoolYear) params.school_year_id = selectedSchoolYear.id;
      if (selectedSection) params.section_id = selectedSection.id;
      
      const response = await axios.get(`${API_URL}/admin/enrollments/active`, {
        params,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const normalized = response.data.enrollments.map(e => ({
          ...e,
          grade_display: e.grade_display || (e.grade_level === 0 ? 'Kinder' : `Grade ${e.grade_level}`)
        }));
        setEnrollments(normalized);
        applyFilters(normalized);
        calculateStats(normalized);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      const demoEnrollments = [
        { id: 1, student_name: 'DELA CRUZ, JUAN D', lrn: '123456789012', grade_level: 6, grade_display: 'Grade 6', section: 'DIAMOND', status: 'Active', enrolled_date: '2024-06-10', guardian: 'PEDRO DELA CRUZ', contact: '09171234569' },
        { id: 2, student_name: 'REYES, MARIA E', lrn: '123456789013', grade_level: 5, grade_display: 'Grade 5', section: 'EMERALD', status: 'Active', enrolled_date: '2024-06-09', guardian: 'RAMON REYES', contact: '09171234571' },
        { id: 3, student_name: 'RIVERA, JOSE M', lrn: '123456789014', grade_level: 4, grade_display: 'Grade 4', section: 'RUBY', status: 'Active', enrolled_date: '2024-06-08', guardian: 'MANUEL RIVERA', contact: '09171234573' },
        { id: 4, student_name: 'MARTINEZ, ANA L', lrn: '123456789015', grade_level: 3, grade_display: 'Grade 3', section: 'SAPPHIRE', status: 'Active', enrolled_date: '2024-06-07', guardian: 'CARLOS MARTINEZ', contact: '09171234575' },
      ];
      setEnrollments(demoEnrollments);
      applyFilters(demoEnrollments);
      calculateStats(demoEnrollments);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (data = enrollments) => {
    let filtered = [...data];
    
    if (selectedGradeLevel !== '') {
      filtered = filtered.filter(e => e.grade_level === parseInt(selectedGradeLevel));
    }
    
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => {
        const studentName = (e.student_name || '').toLowerCase();
        const lrnStr = e.lrn ? String(e.lrn) : '';
        return studentName.includes(term) || lrnStr.includes(term);
      });
    }
    
    setFilteredEnrollments(filtered);
  };

  const calculateStats = (data) => {
    const totalStudents = data.length;
    const uniqueSections = [...new Set(data.map(e => e.section))];
    const uniqueGradeLevels = [...new Set(data.map(e => e.grade_level))];
    const maleCount = data.filter(e => e.gender === 'Male').length;
    const femaleCount = data.filter(e => e.gender === 'Female').length;
    
    const gradeLevelMap = new Map();
    data.forEach(e => {
      const key = e.grade_level;
      if (!gradeLevelMap.has(key)) {
        gradeLevelMap.set(key, { grade: e.grade_display || (key === 0 ? 'Kinder' : `Grade ${key}`), count: 0 });
      }
      gradeLevelMap.get(key).count++;
    });
    const byGradeLevel = Array.from(gradeLevelMap.values()).sort((a, b) => {
      const order = { 'Kinder': 0, 'Grade 1': 1, 'Grade 2': 2, 'Grade 3': 3, 'Grade 4': 4, 'Grade 5': 5, 'Grade 6': 6 };
      return (order[a.grade] || 99) - (order[b.grade] || 99);
    });
    
    setStats({
      totalEnrollments: totalStudents,
      totalStudents: totalStudents,
      totalSections: uniqueSections.length,
      totalGradeLevels: uniqueGradeLevels.length,
      maleCount: maleCount,
      femaleCount: femaleCount,
      byGradeLevel: byGradeLevel
    });
  };

  const fetchStudentEnrollmentHistory = async (studentInfoId) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/enrollments/student/${studentInfoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSelectedStudentHistory({
          student: response.data.student,
          enrollments: response.data.enrollments
        });
        setShowStudentModal(true);
      } else {
        alert('No enrollment history found');
      }
    } catch (error) {
      console.error('Error fetching student history:', error);
      alert('Failed to load student history');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  // Helper para makuha ang full name initials mula sa "Last, First Middle" format
  const getInitialsFromFullName = (fullName) => {
    if (!fullName) return 'S';
    const parts = fullName.split(',');
    if (parts.length === 2) {
      const lastName = parts[0].trim();
      const firstNamePart = parts[1].trim();
      const firstName = firstNamePart.split(' ')[0];
      return getInitials(firstName, lastName);
    }
    return fullName.charAt(0).toUpperCase();
  };

  const getStatusBadge = (status) => {
    if (status === 'Active') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700"><CheckCircle size={10} /> Active</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">{status}</span>;
  };

  const downloadCSV = () => {
    const headers = ['Student Name', 'LRN', 'Grade Level', 'Section', 'Status', 'Enrolled Date', 'Guardian', 'Contact Number'];
    const rows = filteredEnrollments.map(e => [
      e.student_name,
      e.lrn,
      e.grade_display || (e.grade_level === 0 ? 'Kinder' : `Grade ${e.grade_level}`),
      e.section,
      e.status,
      e.enrolled_date,
      e.guardian || 'N/A',
      e.contact || 'N/A'
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `active_enrollments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => window.print();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <UserCheck size={24} className="text-indigo-600" />
                Active Enrollments
              </h1>
              <p className="text-gray-500 text-sm mt-1">View and manage currently enrolled students</p>
            </div>
            <div className="flex gap-3">
              <button onClick={downloadCSV} disabled={filteredEnrollments.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"><Download size={16} /> Export CSV</button>
              <button onClick={downloadPDF} disabled={filteredEnrollments.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"><Printer size={16} /> Print</button>
              <button onClick={() => navigate('/admin/students/enroll')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium"><UserPlus size={16} /> New Enrollment</button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">School Year</label>
              <select value={selectedSchoolYear?.id || ''} onChange={(e) => { const sy = schoolYears.find(s => s.id === parseInt(e.target.value)); setSelectedSchoolYear(sy); setSelectedSection(null); setSelectedGradeLevel(''); }} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none">
                <option value="">All School Years</option>
                {schoolYears.map(sy => <option key={sy.id} value={sy.id}>{sy.year_start}-{sy.year_end} {sy.is_active ? '(Active)' : ''}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Grade Level</label>
              <select value={selectedGradeLevel} onChange={(e) => setSelectedGradeLevel(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none">
                <option value="">All Grade Levels</option>
                {gradeLevelOptions.map(gl => <option key={gl.value} value={gl.value}>{gl.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
              <select value={selectedSection?.id || ''} onChange={(e) => { const sec = sectionsByGrade.find(s => s.id === parseInt(e.target.value)); setSelectedSection(sec || null); }} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none" disabled={!selectedGradeLevel}>
                <option value="">All Sections</option>
                {sectionsByGrade.map(sec => <option key={sec.id} value={sec.id}>{sec.section_name}</option>)}
              </select>
              {selectedGradeLevel && sectionsByGrade.length === 0 && <p className="text-xs text-amber-500 mt-1">No sections for this grade level</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Name or LRN..." className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none">
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Dropped">Dropped</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-4"><p className="text-xs text-gray-400 uppercase">Total Students</p><p className="text-2xl font-bold text-gray-800">{stats.totalStudents}</p></div>
          <div className="bg-white border border-gray-100 rounded-xl p-4"><p className="text-xs text-gray-400 uppercase">Sections</p><p className="text-2xl font-bold text-gray-800">{stats.totalSections}</p></div>
          <div className="bg-white border border-gray-100 rounded-xl p-4"><p className="text-xs text-gray-400 uppercase">Grade Levels</p><p className="text-2xl font-bold text-gray-800">{stats.totalGradeLevels}</p></div>
          <div className="bg-white border border-gray-100 rounded-xl p-4"><p className="text-xs text-gray-400 uppercase">Male</p><p className="text-2xl font-bold text-blue-600">{stats.maleCount}</p></div>
          <div className="bg-white border border-gray-100 rounded-xl p-4"><p className="text-xs text-gray-400 uppercase">Female</p><p className="text-2xl font-bold text-pink-600">{stats.femaleCount}</p></div>
          <div className="bg-white border border-gray-100 rounded-xl p-4"><p className="text-xs text-gray-400 uppercase">Active</p><p className="text-2xl font-bold text-green-600">{stats.totalEnrollments}</p></div>
        </div>

        {/* Grade Level Distribution */}
        {stats.byGradeLevel.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Enrollment by Grade Level</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {stats.byGradeLevel.map(grade => (
                <div key={grade.grade} className="text-center">
                  <div className="text-xs font-medium text-gray-500 mb-1">{grade.grade}</div>
                  <div className="text-xl font-bold text-indigo-600">{grade.count}</div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2"><div className="bg-indigo-600 rounded-full h-1.5" style={{ width: `${(grade.count / stats.totalStudents) * 100}%` }}></div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading / Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32"><Loader2 className="animate-spin text-indigo-600" size={48} /><p className="text-gray-500 text-sm mt-4">Loading enrollments...</p></div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">LRN</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Grade & Section</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Guardian</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Enrolled Date</th>
                    <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEnrollments.length > 0 ? filteredEnrollments.map((enrollment, idx) => {
                    const studentInfo = allStudents.find(s => s.lrn === enrollment.lrn);
                    const profilePicture = studentInfo?.profile_picture;
                    
                    return (
                      <tr key={enrollment.id || idx} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm overflow-hidden">
                              {profilePicture ? (
                                <img 
                                  src={profilePicture} 
                                  alt="Profile" 
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                getInitialsFromFullName(enrollment.student_name)
                              )}
                            </div>
                            <p className="font-medium text-gray-800 text-sm">{enrollment.student_name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3"><span className="font-mono text-xs text-gray-600">{enrollment.lrn || 'N/A'}</span></td>
                        <td className="px-5 py-3"><div className="flex items-center gap-1.5"><GraduationCap size={12} className="text-gray-400" /><span className="text-sm text-gray-700">{enrollment.grade_display} - {enrollment.section}</span></div></td>
                        <td className="px-5 py-3"><div><p className="text-sm text-gray-700">{enrollment.guardian || 'N/A'}</p><p className="text-[10px] text-gray-400">{enrollment.contact || 'No contact'}</p></div></td>
                        <td className="px-5 py-3"><span className="text-sm text-gray-600">{enrollment.enrolled_date || 'N/A'}</span></td>
                        <td className="px-5 py-3 text-center">{getStatusBadge(enrollment.status)}</td>
                        <td className="px-5 py-3 text-center">
                          <button onClick={() => { if (enrollment.student_id) fetchStudentEnrollmentHistory(enrollment.student_id); else alert('Student ID not found'); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="7" className="px-5 py-12 text-center"><div className="flex flex-col items-center"><Users size={32} className="text-gray-300 mb-2" /><p className="text-gray-400 text-sm">No enrollment records found</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Summary */}
        {filteredEnrollments.length > 0 && (
          <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
            <p>Showing {filteredEnrollments.length} of {enrollments.length} enrollments</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Active</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Student Enrollment History Modal - may profile picture na rin */}
      {showStudentModal && selectedStudentHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Enrollment History</h3>
              <button onClick={() => setShowStudentModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {/* Student Info with profile picture */}
              {(() => {
                const studentRecord = allStudents.find(s => s.lrn === selectedStudentHistory.student?.lrn || s.id === selectedStudentHistory.student?.id);
                const studentProfilePic = studentRecord?.profile_picture;
                const studentName = selectedStudentHistory.student?.name || '';
                const studentLrn = selectedStudentHistory.student?.lrn || 'N/A';
                // Get initials for fallback
                let initials = 'S';
                if (studentName) {
                  const parts = studentName.split(',');
                  if (parts.length === 2) {
                    const lastName = parts[0].trim();
                    const firstName = parts[1].trim().split(' ')[0];
                    initials = getInitials(firstName, lastName);
                  } else {
                    initials = studentName.charAt(0).toUpperCase();
                  }
                }
                return (
                  <div className="text-center pb-3 border-b border-gray-100">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                      {studentProfilePic ? (
                        <img src={studentProfilePic} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-indigo-600">{initials}</span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-800">{studentName}</h4>
                    <p className="text-xs text-gray-500">LRN: {studentLrn}</p>
                  </div>
                );
              })()}
              
              <div className="space-y-4">
                {selectedStudentHistory.enrollments?.map((enrollment, index) => (
                  <div key={index} className="relative pl-8">
                    {index !== selectedStudentHistory.enrollments.length - 1 && <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-200"></div>}
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${enrollment.status === 'Active' ? 'bg-green-100' : enrollment.status === 'Completed' ? 'bg-blue-100' : 'bg-red-100'}`}>
                      {enrollment.status === 'Active' && <CheckCircle size={14} className="text-green-600" />}
                      {enrollment.status === 'Completed' && <Award size={14} className="text-blue-600" />}
                      {enrollment.status === 'Dropped' && <XCircle size={14} className="text-red-600" />}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${enrollment.status === 'Active' ? 'bg-green-100 text-green-700' : enrollment.status === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{enrollment.status}</span>
                        <span className="text-xs text-gray-500">{enrollment.date_enrolled}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-[10px] text-gray-400">School Year</p><p className="font-medium text-gray-700">{enrollment.school_year}</p></div>
                        <div><p className="text-[10px] text-gray-400">Grade & Section</p><p className="font-medium text-gray-700">{enrollment.grade_display} - {enrollment.section}</p></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveEnrollments;