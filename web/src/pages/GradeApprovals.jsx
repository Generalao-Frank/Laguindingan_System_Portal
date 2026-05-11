import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, XCircle, Clock, Loader2, AlertCircle, X,
  Eye, Search, Filter, RefreshCw, ShieldCheck, Calendar, BookOpen,
  Award, TrendingUp, UserCheck, Zap, ChevronRight, User, GraduationCap
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const GradeApprovals = () => {
  const navigate = useNavigate();
  const [pendingGrades, setPendingGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    section_id: '',
    subject_id: '',
    search: ''
  });
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const token = localStorage.getItem('userToken');

  useEffect(() => {
    fetchPendingGrades();
    fetchSections();
    fetchSubjects();
    fetchStats();
  }, [filters.section_id, filters.subject_id, filters.search]);

  const fetchPendingGrades = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.section_id) params.section_id = filters.section_id;
      if (filters.subject_id) params.subject_id = filters.subject_id;
      if (filters.search) params.search = filters.search;
      
      const response = await axios.get(`${API_URL}/admin/grades/pending`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      if (response.data.success) {
        setPendingGrades(response.data.grades);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/grades/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error(err);
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
      console.error(err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSubjects(response.data.subjects);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (gradeId) => {
    try {
      await axios.post(`${API_URL}/admin/grades/${gradeId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPendingGrades();
      fetchStats();
    } catch (err) {
      alert('Failed to approve grade');
    }
  };

  const handleReject = async (gradeId) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    try {
      await axios.post(`${API_URL}/admin/grades/${gradeId}/reject`, {
        remarks: rejectReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setRejectReason('');
      fetchPendingGrades();
      fetchStats();
    } catch (err) {
      alert('Failed to reject grade');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 shadow-sm">
          <CheckCircle size={12} className="text-emerald-500" />
          Approved
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border border-rose-200 shadow-sm">
          <XCircle size={12} className="text-rose-500" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200 shadow-sm">
        <Clock size={12} className="text-amber-500" />
        Pending
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <ShieldCheck size={20} />
                <span className="text-xs font-semibold uppercase tracking-wider">Admin Panel</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Grade Approvals</h1>
              <p className="text-slate-500 text-sm mt-1">Review and approve grades submitted by teachers</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Award size={20} className="text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-200/50 p-5 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Awaiting Review</p>
                <p className="text-3xl font-bold text-amber-700 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock size={22} className="text-amber-600" />
              </div>
            </div>
            <div className="mt-3">
              <div className="h-1.5 w-full bg-amber-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stats.pending_percentage || 0}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-200/50 p-5 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-400/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Approved</p>
                <p className="text-3xl font-bold text-emerald-700 mt-1">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={22} className="text-emerald-600" />
              </div>
            </div>
            <div className="mt-3">
              <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats.approved / (stats.pending + stats.approved + stats.rejected)) * 100 || 0}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/10 to-red-500/5 border border-rose-200/50 p-5 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-rose-400/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Rejected</p>
                <p className="text-3xl font-bold text-rose-700 mt-1">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                <XCircle size={22} className="text-rose-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-700">Filter Approvals</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Section</label>
              <select
                value={filters.section_id}
                onChange={(e) => setFilters({...filters, section_id: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
              >
                <option value="">All Sections</option>
                {sections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.grade_display || sec.section_name} - {sec.section_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
              <select
                value={filters.subject_id}
                onChange={(e) => setFilters({...filters, subject_id: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
              >
                <option value="">All Subjects</option>
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.subject_name}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Search</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student name or LRN..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pending Grades List - with Teacher Name */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-slate-500 text-sm mt-4">Loading pending approvals...</p>
          </div>
        ) : pendingGrades.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">All Caught Up!</h3>
            <p className="text-slate-400 text-sm">No pending grades to approve</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {pendingGrades.map((grade, index) => (
              <div 
                key={grade.id} 
                className="group bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-6">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                          <span className="text-white font-bold text-sm">
                            {grade.student_name?.charAt(0) || 'S'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800 text-lg">{grade.student_name}</h3>
                          <p className="text-sm text-slate-500 font-mono">LRN: {grade.lrn}</p>
                        </div>
                      </div>
                      
                      {/* Teacher Name Section - Added */}
                      <div className="flex items-center gap-2 mt-2 text-sm bg-slate-50 inline-flex px-3 py-1.5 rounded-full">
                        <User size={12} className="text-indigo-500" />
                        <span className="text-slate-600">Teacher:</span>
                        <span className="font-medium text-slate-800">{grade.teacher_name || 'N/A'}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <BookOpen size={14} className="text-indigo-500" />
                          <span>{grade.subject_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <UserCheck size={14} className="text-indigo-500" />
                          <span>{grade.section_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Award size={14} className="text-amber-500" />
                          <span className="font-medium">Final: {grade.final_grade}%</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={12} />
                        Submitted: {new Date(grade.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getStatusBadge(grade.status)}
                      <button
                        onClick={() => {
                          setSelectedGrade(grade);
                          setShowModal(true);
                        }}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 hover:border-indigo-200 transition-all flex items-center gap-2"
                      >
                        <Eye size={14} /> Review
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex gap-3">
                    <button
                      onClick={() => handleApprove(grade.id)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-green-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CheckCircle size={16} /> Approve Grade
                    </button>
                    <button
                      onClick={() => {
                        setSelectedGrade(grade);
                        setShowModal(true);
                      }}
                      className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl text-sm font-semibold hover:from-rose-700 hover:to-red-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <XCircle size={16} /> Reject Grade
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal - with Teacher Name */}
        {showModal && selectedGrade && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Award size={20} className="text-white" />
                    <h2 className="text-lg font-bold text-white">Grade Details</h2>
                  </div>
                  <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white transition">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Student</p>
                    <p className="font-medium text-slate-800 mt-0.5">{selectedGrade.student_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">LRN</p>
                    <p className="font-medium font-mono text-slate-800 mt-0.5">{selectedGrade.lrn}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Subject</p>
                    <p className="font-medium text-slate-800 mt-0.5">{selectedGrade.subject_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Section</p>
                    <p className="font-medium text-slate-800 mt-0.5">{selectedGrade.section_name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Teacher</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User size={12} className="text-indigo-600" />
                      </div>
                      <p className="font-medium text-slate-800">{selectedGrade.teacher_name || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Grade Components</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Written Works</span>
                      <span className="font-semibold text-indigo-600">{selectedGrade.written_works}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedGrade.written_works}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-slate-500">Performance Tasks</span>
                      <span className="font-semibold text-indigo-600">{selectedGrade.performance_tasks}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedGrade.performance_tasks}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-slate-500">Quarterly Assessment</span>
                      <span className="font-semibold text-indigo-600">{selectedGrade.quarterly_assessment}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${selectedGrade.quarterly_assessment}%` }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Final Grade:</span>
                  <span className={`text-2xl font-bold ${
                    selectedGrade.final_grade >= 90 ? 'text-emerald-600' :
                    selectedGrade.final_grade >= 80 ? 'text-blue-600' :
                    selectedGrade.final_grade >= 75 ? 'text-indigo-600' : 'text-rose-600'
                  }`}>{selectedGrade.final_grade}%</span>
                </div>

                {selectedGrade.status === 'pending' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Rejection Reason (if rejecting)</label>
                    <textarea
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all resize-none"
                      rows="3"
                      placeholder="Why is this grade being rejected? Provide specific feedback for the teacher..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all"
                  >
                    Close
                  </button>
                  {selectedGrade.status === 'pending' && (
                    <button
                      onClick={() => {
                        if (rejectReason.trim()) {
                          handleReject(selectedGrade.id);
                        } else {
                          alert('Please provide a reason for rejection');
                        }
                      }}
                      className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl text-sm font-semibold hover:from-rose-700 hover:to-red-700 transition-all"
                    >
                      Confirm Rejection
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradeApprovals;