import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Search, ArrowLeft, FileDown, User, Loader2, Users, ChevronRight, 
  GraduationCap, Eye, Download, Filter, Grid3x3, List, X, 
  Phone, Mail, MapPin, Calendar, Shield, Award, CheckCircle,
  Clock, BookOpen, TrendingUp, AlertCircle, Printer, Edit2,
  Trash2, Save, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const StudentRecord = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentGrades, setStudentGrades] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [stats, setStats] = useState({
    totalStudents: 0,
    maleCount: 0,
    femaleCount: 0,
    totalSections: 0,
    gradeLevelBreakdown: {}
  });

  // Modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDropModal, setShowDropModal] = useState(false);
  const [selectedTransferStudent, setSelectedTransferStudent] = useState(null);
  const [selectedDropStudent, setSelectedDropStudent] = useState(null);
  const [newSectionId, setNewSectionId] = useState('');
  const [dropReason, setDropReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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
    fetchStats();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setStudents(response.data.students);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      showError("Failed to load student records");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/sections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSections(response.data.sections);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/students/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setStats({
          totalStudents: response.data.stats.totalStudents,
          maleCount: response.data.stats.maleCount,
          femaleCount: response.data.stats.femaleCount,
          totalSections: response.data.stats.totalSections,
          gradeLevelBreakdown: response.data.stats.gradeLevelBreakdown || {}
        });
      } else {
        updateLocalStats();
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      updateLocalStats();
    }
  };

  const updateLocalStats = () => {
    setStats({
      totalStudents: students.length,
      maleCount: students.filter(s => s.gender === 'Male').length,
      femaleCount: students.filter(s => s.gender === 'Female').length,
      totalSections: [...new Set(students.map(s => s.section).filter(Boolean))].length,
      gradeLevelBreakdown: {}
    });
  };

  const fetchStudentGrades = async (studentId, enrollmentId) => {
    try {
      const response = await axios.get(`${API_URL}/admin/grades/student/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        return response.data.grades;
      }
      return [];
    } catch (error) {
      console.log("Grades feature coming soon");
      return [];
    }
  };

  const handleViewStudent = async (student) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/students/${student.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSelectedStudent(response.data.student);
        const grades = await fetchStudentGrades(student.id, response.data.student.current_enrollment?.id);
        setStudentGrades(grades);
        setViewMode('report');
      } else {
        showError("Failed to load student details");
      }
    } catch (error) {
      console.error("Error viewing student:", error);
      showError("Failed to load student details");
    } finally {
      setIsLoading(false);
    }
  };

  const showError = (message) => {
    alert(message);
  };

  // Transfer Functions
  const openTransferModal = (student) => {
    setSelectedTransferStudent(student);
    setNewSectionId('');
    setShowTransferModal(true);
  };

  const handleTransferStudent = async () => {
    if (!newSectionId) {
      showError("Please select a new section");
      return;
    }

    const reason = prompt("Reason for transfer (optional):") || "Transferred to new section";
    
    setActionLoading(true);
    try {
      const response = await axios.post(`${API_URL}/admin/students/${selectedTransferStudent.id}/transfer`, {
        new_section_id: newSectionId,
        reason: reason
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        alert("Student transferred successfully!");
        setShowTransferModal(false);
        fetchStudents();
        if (viewMode === 'report' && selectedStudent?.id === selectedTransferStudent.id) {
          setViewMode('list');
          setSelectedStudent(null);
        }
      } else {
        alert(response.data.message || "Transfer failed");
      }
    } catch (error) {
      console.error("Error transferring student:", error);
      alert(error.response?.data?.message || "Failed to transfer student");
    } finally {
      setActionLoading(false);
    }
  };

  // Drop Functions
  const openDropModal = (student) => {
    setSelectedDropStudent(student);
    setDropReason('');
    setShowDropModal(true);
  };

  const handleDropStudent = async () => {
    if (!dropReason) {
      alert("Please provide a reason for dropping");
      return;
    }

    setActionLoading(true);
    try {
      const response = await axios.post(`${API_URL}/admin/students/${selectedDropStudent.id}/drop`, {
        reason: dropReason
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        alert("Student dropped successfully!");
        setShowDropModal(false);
        fetchStudents();
        if (viewMode === 'report' && selectedStudent?.id === selectedDropStudent.id) {
          setViewMode('list');
          setSelectedStudent(null);
        }
      } else {
        alert(response.data.message || "Drop failed");
      }
    } catch (error) {
      console.error("Error dropping student:", error);
      alert(error.response?.data?.message || "Failed to drop student");
    } finally {
      setActionLoading(false);
    }
  };

  const calculateSubjectAverage = (grades) => {
    if (!grades || grades.length === 0) return null;
    let total = 0;
    let count = 0;
    grades.forEach(grade => {
      if (grade && !isNaN(parseFloat(grade))) {
        total += parseFloat(grade);
        count++;
      }
    });
    return count > 0 ? (total / count).toFixed(1) : null;
  };

  const getOverallAverage = () => {
    if (!studentGrades || studentGrades.length === 0) return null;
    let total = 0;
    let count = 0;
    studentGrades.forEach(subject => {
      const avg = calculateSubjectAverage([subject.q1, subject.q2, subject.q3, subject.q4]);
      if (avg) {
        total += parseFloat(avg);
        count++;
      }
    });
    return count > 0 ? (total / count).toFixed(1) : null;
  };

  const getPassingStatus = (grade) => {
    if (!grade) return null;
    const numGrade = parseFloat(grade);
    if (numGrade >= 75) return { text: 'Passed', color: 'text-green-600', bg: 'bg-green-100' };
    return { text: 'Failed', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const downloadPDF = () => {
    if (!selectedStudent) return;
    
    const doc = new jsPDF();
    
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('STUDENT PROGRESS REPORT', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Laguindingan Central School', 105, 35, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    
    doc.text(`Student Name: ${selectedStudent.last_name}, ${selectedStudent.first_name} ${selectedStudent.middle_name || ''}`, 14, 60);
    doc.text(`LRN: ${selectedStudent.lrn || 'N/A'}`, 14, 68);
    doc.text(`Grade & Section: ${getGradeName(selectedStudent.current_enrollment?.grade_level)} - ${selectedStudent.current_enrollment?.section || 'N/A'}`, 14, 76);
    doc.text(`Gender: ${selectedStudent.gender}`, 14, 84);
    doc.text(`Birthdate: ${formatDate(selectedStudent.birthdate)}`, 14, 92);
    doc.text(`Guardian: ${selectedStudent.guardian_name || 'N/A'}`, 14, 100);
    
    const tableRows = studentGrades.map(subject => {
      const q1 = subject.q1 || '-';
      const q2 = subject.q2 || '-';
      const q3 = subject.q3 || '-';
      const q4 = subject.q4 || '-';
      const avg = subject.average || calculateSubjectAverage([subject.q1, subject.q2, subject.q3, subject.q4]) || '-';
      return [subject.subject_name, q1, q2, q3, q4, avg];
    });

    if (tableRows.length === 0) {
      tableRows.push(['No grades available yet', '-', '-', '-', '-', '-']);
    }

    autoTable(doc, {
      startY: 110,
      head: [['SUBJECT', 'Q1', 'Q2', 'Q3', 'Q4', 'AVG']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [249, 250, 251] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    const overallAvg = getOverallAverage();
    const passingStatus = getPassingStatus(overallAvg);
    
    doc.setFontSize(10);
    doc.text(`Overall Average: ${overallAvg ? overallAvg + '%' : 'N/A'}`, 14, finalY);
    if (overallAvg) {
      doc.text(`Status: ${passingStatus?.text || 'N/A'}`, 14, finalY + 8);
    }
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, finalY + 16);
    doc.text(`Generated by: Admin System`, 14, finalY + 24);
    
    doc.save(`Student_Report_${selectedStudent.lrn || selectedStudent.id}.pdf`);
  };

  const getSectionsByGrade = (gradeValue) => {
    if (gradeValue === 'all') {
      return [...new Set(students.map(s => s.section).filter(Boolean))];
    }
    const gradeNum = parseInt(gradeValue);
    const sectionsInGrade = students
      .filter(s => s.grade_level === gradeNum && s.section)
      .map(s => s.section);
    return [...new Set(sectionsInGrade)];
  };

  const filteredSections = getSectionsByGrade(filterGrade);

  useEffect(() => {
    setFilterSection('all');
  }, [filterGrade]);

  const filteredStudents = students.filter(student => {
    const lrnStr = student.lrn ? student.lrn.toString() : '';
    const fullNameStr = student.full_name || `${student.last_name}, ${student.first_name} ${student.middle_name || ''}`;
    const nameStr = `${student.first_name} ${student.last_name}`;
    
    const matchesSearch = 
      lrnStr.includes(searchTerm) ||
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullNameStr.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesGrade = filterGrade === 'all' || student.grade_level === parseInt(filterGrade);
    const matchesSection = filterSection === 'all' || student.section === filterSection;
    const matchesGender = filterGender === 'all' || student.gender === filterGender;
    
    return matchesSearch && matchesGrade && matchesSection && matchesGender;
  });

  const getGradeName = (grade) => {
    if (grade === undefined || grade === null) return 'N/A';
    if (grade === 0) return 'Kinder';
    return `Grade ${grade}`;
  };

  const getStatsByGrade = (grade) => {
    return students.filter(s => s.grade_level === grade).length;
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

const getAvailableSectionsForTransfer = () => {
  if (!selectedTransferStudent) return [];
  
  const studentGradeLevel = selectedTransferStudent.grade_level;
  const schoolYearId = selectedTransferStudent.current_enrollment?.school_year_id;
  const currentSectionId = selectedTransferStudent.section_id;
  
  if (!schoolYearId) return [];
  
  return sections.filter(s => 
    s.school_year_id === schoolYearId && 
    s.grade_level === studentGradeLevel &&
    s.id !== currentSectionId
  );
};

  const availableSections = getAvailableSectionsForTransfer();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                {viewMode === 'list' ? 'Student Records' : 'Student Profile'}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {viewMode === 'list' 
                  ? 'Manage and monitor all student academic records (Kinder to Grade 6)' 
                  : 'Detailed student information and academic progress'}
              </p>
            </div>
            {viewMode === 'list' && (
              <button 
                onClick={() => navigate('/admin/students/enroll')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                <User size={16} />
                <span className="text-sm font-medium">Enroll New Student</span>
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <p className="text-slate-500 text-sm mt-4">Loading student records...</p>
          </div>
        ) : viewMode === 'list' ? (
          /* LIST VIEW */
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Total</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalStudents}</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Users size={18} className="text-indigo-600" />
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">All Students</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Male</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.maleCount}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <User size={18} className="text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Female</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.femaleCount}</p>
                  </div>
                  <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
                    <User size={18} className="text-pink-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Sections</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalSections}</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <GraduationCap size={18} className="text-emerald-600" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 shadow-sm border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">Kinder</p>
                    <p className="text-2xl font-bold text-indigo-700">{getStatsByGrade(0)}</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-200 rounded-xl flex items-center justify-center">
                    <Award size={18} className="text-indigo-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Grade Level Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Enrollment by Grade Level</h3>
              <div className="grid grid-cols-7 gap-2">
                {gradeLevels.map(grade => {
                  const count = getStatsByGrade(grade.value);
                  const maxCount = Math.max(...gradeLevels.map(g => getStatsByGrade(g.value)), 1);
                  const percentage = (count / maxCount) * 100;
                  return (
                    <div key={grade.value} className="text-center">
                      <div className="text-[10px] font-medium text-slate-500 mb-1">
                        {grade.value === 0 ? 'K' : `G${grade.value}`}
                      </div>
                      <div className="relative h-16 bg-slate-100 rounded-lg overflow-hidden">
                        <div 
                          className="absolute bottom-0 left-0 w-full bg-indigo-500 rounded-lg transition-all duration-500"
                          style={{ height: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs font-bold text-slate-700 mt-1">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search by name or LRN..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  <option value="all">All Grade Levels</option>
                  {gradeLevels.map(grade => (
                    <option key={grade.value} value={grade.value}>{grade.label}</option>
                  ))}
                </select>
                <select 
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  <option value="all">All Sections</option>
                  {filteredSections.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select 
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  <option value="all">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Student Directory</h3>
                  <p className="text-xs text-slate-400">{filteredStudents.length} students found</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">LRN</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade & Section</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Guardian</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm uppercase shadow-sm overflow-hidden ${
                              student.grade_level === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-indigo-500 to-purple-500'
                            }`}>
                              {student.profile_picture ? (
                                <img src={student.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                <span className="w-full h-full flex items-center justify-center">
                                  {getInitials(student.first_name, student.last_name)}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">
                                {student.last_name}, {student.first_name} {student.middle_name}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">ID: {student.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-slate-600">{student.lrn || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                            student.grade_level === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <GraduationCap size={10} />
                            {getGradeName(student.grade_level)} - {student.section || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm text-slate-700">{student.guardian_name || 'N/A'}</p>
                            <p className="text-[10px] text-slate-400">{student.guardian_contact_number || 'No contact'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                            <CheckCircle size={10} />
                            {student.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleViewStudent(student)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View Profile"
                            >
                              <Eye size={13} />
                              View
                            </button>
                            {student.current_enrollment && student.status === 'Active' && (
                              <>
                                <button 
                                  onClick={() => openTransferModal(student)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Transfer Student"
                                >
                                  <Edit2 size={13} />
                                  Transfer
                                </button>
                                <button 
                                  onClick={() => openDropModal(student)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Drop Student"
                                >
                                  <Trash2 size={13} />
                                  Drop
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center">
                            <Users size={40} className="text-slate-300 mb-3" />
                            <p className="text-slate-400 font-medium">No student records found</p>
                            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* REPORT VIEW */
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            <button 
              onClick={() => {
                setViewMode('list');
                setSelectedStudent(null);
                setStudentGrades([]);
              }} 
              className="group flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-6"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              Back to Directory
            </button>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              
              {/* Profile Header */}
              <div className={`relative px-6 py-8 ${
                selectedStudent?.current_enrollment?.grade_level === 0 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600'
              }`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                      {selectedStudent?.profile_picture ? (
                        <img src={selectedStudent.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-indigo-600 uppercase">
                          {getInitials(selectedStudent?.first_name, selectedStudent?.last_name)}
                        </span>
                      )}
                    </div>
                    <div className="text-white">
                      <h2 className="text-2xl font-bold">
                        {selectedStudent?.last_name}, {selectedStudent?.first_name} {selectedStudent?.middle_name || ''}
                      </h2>
                      <p className="text-indigo-100 text-sm mt-1">
                        LRN: {selectedStudent?.lrn || 'N/A'} • {getGradeName(selectedStudent?.current_enrollment?.grade_level)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {selectedStudent?.current_enrollment && selectedStudent?.current_enrollment?.status === 'Active' && (
                      <>
                        <button 
                          onClick={() => openTransferModal(selectedStudent)}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors"
                        >
                          <Edit2 size={16} />
                          Transfer
                        </button>
                        <button 
                          onClick={() => openDropModal(selectedStudent)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors"
                        >
                          <Trash2 size={16} />
                          Drop
                        </button>
                      </>
                    )}
                    <button 
                      onClick={downloadPDF} 
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-xl transition-colors backdrop-blur-sm"
                    >
                      <Download size={16} />
                      Export PDF
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-xl transition-colors backdrop-blur-sm"
                    >
                      <Printer size={16} />
                      Print
                    </button>
                  </div>
                </div>
              </div>

              {/* Student Information Cards */}
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <User size={18} className="text-indigo-500" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Calendar size={16} className="text-indigo-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Birthdate</p>
                      <p className="text-sm text-slate-700 font-medium">{formatDate(selectedStudent?.birthdate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Shield size={16} className="text-indigo-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Gender</p>
                      <p className="text-sm text-slate-700 font-medium">{selectedStudent?.gender || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Phone size={16} className="text-indigo-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Contact Number</p>
                      <p className="text-sm text-slate-700 font-medium">{selectedStudent?.contact_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl col-span-2">
                    <MapPin size={16} className="text-indigo-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Address</p>
                      <p className="text-sm text-slate-700 font-medium">{selectedStudent?.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guardian Information */}
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Users size={18} className="text-indigo-500" />
                  Guardian Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase">Father's Name</p>
                    <p className="text-sm text-slate-700 font-medium">{selectedStudent?.father_name || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase">Mother's Name</p>
                    <p className="text-sm text-slate-700 font-medium">{selectedStudent?.mother_name || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase">Guardian's Name</p>
                    <p className="text-sm text-slate-700 font-medium">{selectedStudent?.guardian_name || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase">Guardian's Contact</p>
                    <p className="text-sm text-slate-700 font-medium">{selectedStudent?.guardian_contact_number || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Current Enrollment Info */}
              {selectedStudent?.current_enrollment && (
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <BookOpen size={18} className="text-indigo-500" />
                    Current Enrollment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase">School Year</p>
                      <p className="text-sm text-slate-700 font-medium">{selectedStudent.current_enrollment.school_year || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase">Grade & Section</p>
                      <p className="text-sm text-slate-700 font-medium">
                        {getGradeName(selectedStudent.current_enrollment.grade_level)} - {selectedStudent.current_enrollment.section}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase">Status</p>
                      <p className="text-sm font-medium text-green-600">{selectedStudent.current_enrollment.status}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Academic Performance */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                    <BookOpen size={18} className="text-indigo-500" />
                    Academic Performance
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span>Passing: 75%</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                        <th className="text-center pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Q1</th>
                        <th className="text-center pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Q2</th>
                        <th className="text-center pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Q3</th>
                        <th className="text-center pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Q4</th>
                        <th className="text-center pb-3 text-xs font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50/50 rounded-lg">Average</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {studentGrades.length > 0 ? (
                        studentGrades.map((subject, idx) => {
                          const q1 = subject.q1 || '-';
                          const q2 = subject.q2 || '-';
                          const q3 = subject.q3 || '-';
                          const q4 = subject.q4 || '-';
                          const avg = subject.average || calculateSubjectAverage([subject.q1, subject.q2, subject.q3, subject.q4]) || '-';
                          const passingStatus = getPassingStatus(avg);
                          return (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-3 text-sm font-medium text-gray-800">{subject.subject_name}</td>
                              <td className="py-3 text-center text-sm">{q1 !== '-' ? `${q1}%` : '-'}</td>
                              <td className="py-3 text-center text-sm">{q2 !== '-' ? `${q2}%` : '-'}</td>
                              <td className="py-3 text-center text-sm">{q3 !== '-' ? `${q3}%` : '-'}</td>
                              <td className="py-3 text-center text-sm">{q4 !== '-' ? `${q4}%` : '-'}</td>
                              <td className="py-3 text-center">
                                {avg !== '-' ? (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${passingStatus?.bg} ${passingStatus?.color}`}>
                                    {avg}%
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            No grades available yet. Grades will appear here once encoded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {studentGrades.length > 0 && (
                      <tfoot className="bg-gray-50/50">
                        <tr className="border-t border-gray-200">
                          <td className="py-3 text-sm font-semibold text-gray-800">Overall Average</td>
                          <td colSpan="4"></td>
                          <td className="py-3 text-center">
                            {getOverallAverage() ? (
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${
                                parseFloat(getOverallAverage()) >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {getOverallAverage()}%
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && selectedTransferStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Edit2 size={20} className="text-amber-600" />
                Transfer Student
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg">
  <p className="text-sm text-gray-700">
    Student: <span className="font-semibold">{selectedTransferStudent.last_name}, {selectedTransferStudent.first_name}</span>
  </p>
  <p className="text-xs text-gray-500 mt-1">
    Current Section: <span className="font-medium">{selectedTransferStudent.section || 'N/A'}</span>
  </p>
  <p className="text-xs text-gray-500">
    Grade Level: <span className="font-medium">{getGradeName(selectedTransferStudent.grade_level)}</span>
  </p>
</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Section *</label>
                <select
                  value={newSectionId}
                  onChange={(e) => setNewSectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  required
                >
                  <option value="">Select New Section</option>
                  {availableSections.length > 0 ? (
                    availableSections.map(section => (
                      <option key={section.id} value={section.id}>
                        {section.section_name} (Grade {section.grade_level === 0 ? 'Kinder' : section.grade_level})
                      </option>
                    ))
                  ) : (
                    <option disabled>No sections available</option>
                  )}
                </select>
                {availableSections.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No sections found for this school year. Please add sections first.
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferStudent}
                  disabled={actionLoading || !newSectionId || availableSections.length === 0}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Confirm Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drop Modal */}
      {showDropModal && selectedDropStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-600" />
                Drop Student
              </h3>
              <button onClick={() => setShowDropModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  Student: <span className="font-semibold">{selectedDropStudent.last_name}, {selectedDropStudent.first_name}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Current Section: {selectedDropStudent.section || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Dropping *</label>
                <textarea
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  placeholder="Enter reason for dropping (e.g., Transferred to other school, Financial issues, etc.)"
                  rows="3"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-400 outline-none text-sm"
                  required
                />
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-700">
                  ⚠️ Warning: This action will mark the student as "Dropped" and they will no longer be considered active. This can be reversed by re-enrolling the student.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDropModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDropStudent}
                  disabled={actionLoading || !dropReason}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Confirm Drop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRecord;