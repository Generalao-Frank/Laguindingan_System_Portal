import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, Filter, Calendar, Users, GraduationCap,
  Clock, AlertCircle, CheckCircle, UserCheck,
  UserX, UserMinus, Award, TrendingUp, RefreshCw,
  Eye, Loader2, History
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const StudentStatusHistory = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSchoolYear, setFilterSchoolYear] = useState('all');
  const [schoolYears, setSchoolYears] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [stats, setStats] = useState({
    totalEnrolled: 0,
    totalGraduated: 0,
    totalTransferred: 0,
    totalDropped: 0,
    totalPromoted: 0,
    totalRetained: 0,
    totalOnLeave: 0
  });


  const token = localStorage.getItem('userToken');

  const statusConfig = {
    'Enrolled': { color: 'green', bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle size={12} />, label: 'Enrolled' },
    'Transferred Out': { color: 'blue', bg: 'bg-blue-50', text: 'text-blue-700', icon: <UserX size={12} />, label: 'Transferred Out' },
    'Dropped': { color: 'red', bg: 'bg-red-50', text: 'text-red-700', icon: <UserMinus size={12} />, label: 'Dropped' },
    'Graduated': { color: 'purple', bg: 'bg-purple-50', text: 'text-purple-700', icon: <Award size={12} />, label: 'Graduated' },
    'Promoted': { color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: <TrendingUp size={12} />, label: 'Promoted' },
    'Retained': { color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', icon: <Clock size={12} />, label: 'Retained' },
    'On Leave': { color: 'orange', bg: 'bg-orange-50', text: 'text-orange-700', icon: <Clock size={12} />, label: 'On Leave' }
  };

  useEffect(() => {
    fetchStudents();
    fetchSchoolYears();
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
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchoolYears = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/school-years`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSchoolYears(response.data.school_years);
      }
    } catch (error) {
      console.error('Error fetching school years:', error);
      setSchoolYears([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/students/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setStats({
          totalEnrolled: response.data.stats.totalStudents || 0,
          totalGraduated: 0,
          totalTransferred: 0,
          totalDropped: 0,
          totalPromoted: 0,
          totalRetained: 0,
          totalOnLeave: 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchStudentHistory = async (studentId) => {
    setIsLoading(true);
    try {
      const studentRes = await axios.get(`${API_URL}/admin/students/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (studentRes.data.success) setSelectedStudent(studentRes.data.student);

      const historyRes = await axios.get(`${API_URL}/admin/students/${studentId}/status-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (historyRes.data.success && historyRes.data.history.length > 0) {
        setStatusHistory(historyRes.data.history.map(item => ({
          id: item.id,
          status: item.status,
          school_year: item.school_year || `${item.school_year_start}-${item.school_year_end}`,
          grade_level: item.grade_level,
          grade_display: item.grade_level === 0 ? 'Kinder' : `Grade ${item.grade_level}`,
          section: item.section || 'N/A',
          effective_date: item.effective_date,
          remarks: item.remarks,
          changed_by: item.changed_by_name || 'System'
        })));
      } else if (studentRes.data.student) {
        const currentGrade = studentRes.data.student?.current_enrollment?.grade_level;
        const currentSection = studentRes.data.student?.current_enrollment?.section;
        const currentSchoolYear = studentRes.data.student?.current_enrollment?.school_year || 
          (new Date().getFullYear() + '-' + (new Date().getFullYear() + 1));
        
        setStatusHistory([{
          id: 1,
          status: 'Enrolled',
          school_year: currentSchoolYear,
          grade_level: currentGrade,
          grade_display: getGradeDisplay(currentGrade),
          section: currentSection || 'N/A',
          effective_date: new Date().toISOString().split('T')[0],
          remarks: 'Currently enrolled (No history records found)',
          changed_by: 'System'
        }]);
      }
      setViewMode('detail');
    } catch (error) {
      console.error('Error fetching student history:', error);
      if (selectedStudent) {
        setStatusHistory([{
          id: 1,
          status: 'Enrolled',
          school_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
          grade_level: selectedStudent.grade_level,
          grade_display: getGradeDisplay(selectedStudent.grade_level),
          section: selectedStudent.section || 'N/A',
          effective_date: new Date().toISOString().split('T')[0],
          remarks: 'Current enrollment (Unable to load history)',
          changed_by: 'System'
        }]);
        setViewMode('detail');
      }
    } finally {
      setIsLoading(false);
    }
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

  // FIXED: Filter students based on status and school year
  const filteredStudents = students.filter(student => {
    const lrnStr = student.lrn ? String(student.lrn) : '';
    const fullName = student.full_name || `${student.last_name}, ${student.first_name} ${student.middle_name || ''}`;
    const firstNameLastName = `${student.first_name} ${student.last_name}`;
    
    const matchesSearch = 
      lrnStr.includes(searchTerm) ||
      firstNameLastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // FIX: Status filtering - handle both 'Active' status and other status types
    let matchesStatus = true;
    if (filterStatus !== 'all') {
      // Get the label from statusConfig for comparison
      const statusLabel = statusConfig[filterStatus]?.label;
      // Compare student.status with the filter value or its label
      if (statusLabel) {
        matchesStatus = student.status === filterStatus || student.status === statusLabel;
      } else {
        matchesStatus = student.status === filterStatus;
      }
    }
    
    // FIX: School Year filtering - check if student's enrollment school year matches
    let matchesSchoolYear = true;
    if (filterSchoolYear !== 'all') {
      const selectedYear = schoolYears.find(sy => sy.id === parseInt(filterSchoolYear));
      if (selectedYear) {
        const selectedYearString = `${selectedYear.year_start}-${selectedYear.year_end}`;
        matchesSchoolYear = student.school_year === selectedYearString || 
                           student.current_enrollment?.school_year === selectedYearString;
      }
    }
    
    return matchesSearch && matchesStatus && matchesSchoolYear;
  });

  const getGradeDisplay = (grade) => {
    if (grade === undefined || grade === null) return 'N/A';
    return grade === 0 ? 'Kinder' : `Grade ${grade}`;
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color === 'green' ? 'bg-green-50' : color === 'purple' ? 'bg-purple-50' : color === 'indigo' ? 'bg-indigo-50' : color === 'blue' ? 'bg-blue-50' : color === 'red' ? 'bg-red-50' : color === 'amber' ? 'bg-amber-50' : 'bg-orange-50'}`}>
          <Icon size={18} className={`${color === 'green' ? 'text-green-600' : color === 'purple' ? 'text-purple-600' : color === 'indigo' ? 'text-indigo-600' : color === 'blue' ? 'text-blue-600' : color === 'red' ? 'text-red-600' : color === 'amber' ? 'text-amber-600' : 'text-orange-600'}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <History size={24} className="text-indigo-600" />
                Student Status History
              </h1>
              <p className="text-gray-500 text-sm mt-1">Track academic milestones and status changes over time</p>
            </div>
            {viewMode === 'detail' && (
              <button 
                onClick={() => { setViewMode('list'); setSelectedStudent(null); setStatusHistory([]); }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm"
              >
                <ArrowLeft size={16} /> Back to Directory
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-gray-500 text-sm mt-4">Loading data...</p>
          </div>
        ) : viewMode === 'list' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
              <StatCard title="ENROLLED" value={stats.totalEnrolled} icon={UserCheck} color="green" />
              <StatCard title="GRADUATED" value={stats.totalGraduated} icon={Award} color="purple" />
              <StatCard title="PROMOTED" value={stats.totalPromoted} icon={TrendingUp} color="indigo" />
              <StatCard title="TRANSFERRED" value={stats.totalTransferred} icon={UserX} color="blue" />
              <StatCard title="DROPPED" value={stats.totalDropped} icon={UserMinus} color="red" />
              <StatCard title="RETAINED" value={stats.totalRetained} icon={AlertCircle} color="amber" />
              <StatCard title="ON LEAVE" value={stats.totalOnLeave} icon={Clock} color="orange" />
            </div>

            {/* Search & Filter */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name or LRN..." 
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)} 
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <select 
                  value={filterSchoolYear} 
                  onChange={(e) => setFilterSchoolYear(e.target.value)} 
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="all">All School Years</option>
                  {schoolYears.map(sy => (
                    <option key={sy.id} value={sy.id}>{sy.year_start}-{sy.year_end}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Student Directory</h3>
                  <p className="text-xs text-gray-400">{filteredStudents.length} students</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">LRN</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Current Grade</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                      const status = statusConfig[student.status] || statusConfig['Enrolled'];
                      return (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm overflow-hidden">
                                {student.profile_picture ? (
                                  <img src={student.profile_picture} alt="Profile" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  getInitials(student.first_name, student.last_name)
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{student.full_name || `${student.last_name}, ${student.first_name}`}</p>
                                <p className="text-[10px] text-gray-400">ID: {student.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3"><span className="font-mono text-xs text-gray-600">{student.lrn || 'N/A'}</span></td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <GraduationCap size={12} className="text-gray-400" />
                              <span className="text-xs text-gray-600">{getGradeDisplay(student.grade_level)} - {student.section || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.bg} ${status.text}`}>
                              {status.icon} {status.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button 
                              onClick={() => fetchStudentHistory(student.id)} 
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Eye size={12} /> View History
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="5" className="px-5 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <Users size={32} className="text-gray-300 mb-2" />
                            <p className="text-gray-400 text-sm">No student records found</p>
                            <button 
                              onClick={() => {
                                setFilterStatus('all');
                                setFilterSchoolYear('all');
                                setSearchTerm('');
                              }}
                              className="mt-3 text-xs text-indigo-600 hover:text-indigo-700"
                            >
                              Clear all filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Detail View */
          <div>
            {/* Student Profile Summary */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-5">
              <div className="px-5 py-4 bg-gray-50/30 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden">
                    {selectedStudent?.profile_picture ? (
                      <img src={selectedStudent.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-indigo-600 uppercase">
                        {getInitials(selectedStudent?.first_name, selectedStudent?.last_name)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{selectedStudent?.full_name || `${selectedStudent?.last_name}, ${selectedStudent?.first_name}`}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">LRN: {selectedStudent?.lrn || 'N/A'} • Current: {getGradeDisplay(selectedStudent?.current_enrollment?.grade_level || selectedStudent?.grade_level)} - {selectedStudent?.current_enrollment?.section || selectedStudent?.section || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/30">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Clock size={16} className="text-gray-500" /> Academic Milestones</h3>
              </div>
              <div className="p-5">
                {statusHistory.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gray-200"></div>
                    <div className="space-y-4">
                      {statusHistory.map((item, idx) => {
                        const status = statusConfig[item.status] || statusConfig['Enrolled'];
                        const isLatest = idx === 0;
                        return (
                          <div key={item.id} className="relative pl-10">
                            <div className={`absolute left-2.5 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${status.bg}`}></div>
                            <div className={`${status.bg} rounded-lg p-4 border border-gray-100`}>
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.bg} ${status.text}`}>
                                    {status.icon} {status.label}
                                  </span>
                                  {isLatest && <span className="text-[9px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Current</span>}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                  <Calendar size={11} /> {formatDate(item.effective_date)}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 mt-2 pt-2 border-t border-gray-100">
                                <div><p className="text-[9px] text-gray-400 uppercase">School Year</p><p className="text-xs font-medium text-gray-700">{item.school_year}</p></div>
                                <div><p className="text-[9px] text-gray-400 uppercase">Grade</p><p className="text-xs font-medium text-gray-700">{item.grade_display || getGradeDisplay(item.grade_level)}</p></div>
                                <div><p className="text-[9px] text-gray-400 uppercase">Section</p><p className="text-xs font-medium text-gray-700">{item.section || 'N/A'}</p></div>
                              </div>
                              {item.remarks && (
                                <div className="mt-2 pt-1">
                                  <p className="text-[9px] text-gray-400 uppercase">Remarks</p>
                                  <p className="text-xs text-gray-500 italic">"{item.remarks}"</p>
                                </div>
                              )}
                              {item.changed_by && (
                                <div className="mt-2 pt-1 text-right">
                                  <p className="text-[8px] text-gray-400">Updated by: {item.changed_by}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History size={32} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No status history found for this student</p>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            {statusHistory.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-5">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-green-600 font-medium">Enrollments</p>
                  <p className="text-lg font-bold text-green-700">{statusHistory.filter(h => h.status === 'Enrolled' || h.status === 'Active').length}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-indigo-600 font-medium">Promotions</p>
                  <p className="text-lg font-bold text-indigo-700">{statusHistory.filter(h => h.status === 'Promoted' || h.status === 'Completed').length}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-purple-600 font-medium">Levels</p>
                  <p className="text-lg font-bold text-purple-700">{[...new Set(statusHistory.map(h => h.grade_level))].filter(g => g !== null && g !== undefined).length}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-blue-600 font-medium">School Years</p>
                  <p className="text-lg font-bold text-blue-700">{[...new Set(statusHistory.map(h => h.school_year))].filter(sy => sy && sy !== 'N/A').length}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentStatusHistory;