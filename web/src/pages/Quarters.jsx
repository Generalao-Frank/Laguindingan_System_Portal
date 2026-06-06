import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, Edit2, Trash2, Save, X, Loader2, 
  Calendar, CheckCircle, AlertCircle, Search, 
  RefreshCw, ArrowLeft, Lock, Unlock, Eye, 
  ChevronRight, Clock, Award, Zap, TrendingUp,
  Play, Pause, FileText, Users, BookOpen,
  Rocket
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const Quarters = () => {
  const navigate = useNavigate();
  const { schoolYearId } = useParams();
  const [quarters, setQuarters] = useState([]);
  const [schoolYear, setSchoolYear] = useState(null);
  const [schoolYears, setSchoolYears] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingQuarter, setEditingQuarter] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);
  const [stats, setStats] = useState({
    totalQuarters: 0,
    activeQuarter: null,
    lockedQuarters: 0,
    ongoingQuarters: 0
  });
  
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_active: false,
    is_locked: false,
    school_year_id: schoolYearId || '',
  });

  const token = localStorage.getItem('userToken');

  useEffect(() => {
    if (schoolYearId) {
      fetchSchoolYearDetails();
      fetchQuarters();
    } else {
      fetchSchoolYears();
      fetchAllQuarters();
    }
  }, [schoolYearId]);

  // Auto-update quarters when component mounts (optional)
  useEffect(() => {
    // Uncomment if you want auto-update on page load
    // handleAutoUpdate();
  }, []);

  const fetchSchoolYearDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/school-years/${schoolYearId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSchoolYear(response.data.school_year);
      }
    } catch (error) {
      console.error('Error fetching school year:', error);
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
    }
  };

  const fetchQuarters = async () => {
    setIsLoading(true);
    try {
      let response;
      if (schoolYearId) {
        response = await axios.get(`${API_URL}/admin/school-years/${schoolYearId}/quarters`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        response = await axios.get(`${API_URL}/admin/quarters`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      if (response.data.success) {
        setQuarters(response.data.quarters);
        calculateStats(response.data.quarters);
      }
    } catch (error) {
      console.error('Error fetching quarters:', error);
      showAlert('Failed to load quarters', 'error');
      // Fallback data
      const fallbackData = [
        { id: 1, name: '1st Quarter', start_date: '2024-06-03', end_date: '2024-08-16', is_active: true, is_locked: false, school_year: '2024-2025', grades_count: 0, students_count: 0 },
        { id: 2, name: '2nd Quarter', start_date: '2024-08-19', end_date: '2024-10-25', is_active: true, is_locked: false, school_year: '2024-2025', grades_count: 0, students_count: 0 },
        { id: 3, name: '3rd Quarter', start_date: '2024-10-28', end_date: '2025-01-10', is_active: true, is_locked: false, school_year: '2024-2025', grades_count: 0, students_count: 0 },
        { id: 4, name: '4th Quarter', start_date: '2025-01-13', end_date: '2025-03-28', is_active: true, is_locked: false, school_year: '2024-2025', grades_count: 0, students_count: 0 },
      ];
      setQuarters(fallbackData);
      calculateStats(fallbackData);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllQuarters = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/quarters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setQuarters(response.data.quarters);
        calculateStats(response.data.quarters);
      }
    } catch (error) {
      console.error('Error fetching all quarters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (quartersData) => {
    const active = quartersData.find(q => q.is_active);
    const locked = quartersData.filter(q => q.is_locked).length;
    const ongoing = quartersData.filter(q => {
      const today = new Date();
      const start = new Date(q.start_date);
      const end = new Date(q.end_date);
      return today >= start && today <= end;
    }).length;
    
    setStats({
      totalQuarters: quartersData.length,
      activeQuarter: active ? active.name : null,
      lockedQuarters: locked,
      ongoingQuarters: ongoing
    });
  };

  const showAlert = (message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage('');
      }, 3000);
    } else {
      setErrorMessage(message);
      setError(true);
      setTimeout(() => {
        setError(false);
        setErrorMessage('');
      }, 3000);
    }
  };

  const validateDates = () => {
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    
    if (start >= end) {
      showAlert('End date must be after start date', 'error');
      return false;
    }
    
    return true;
  };

  // ✅ AUTO-UPDATE FUNCTION - IDINAGDAG ITO
  const handleAutoUpdate = async () => {
    if (!window.confirm(
      "Auto-update quarters based on current date?\n\n" +
      "This will automatically:\n" +
      "✓ Activate quarter that matches today's date\n" +
      "✓ Deactivate quarters that are outside date range\n\n" +
      "Do you want to continue?"
    )) {
      return;
    }
    
    setIsAutoUpdating(true);
    try {
      const response = await axios.post(`${API_URL}/admin/quarters/auto-update`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        // Show summary of changes
        const activatedCount = response.data.activated_count || 0;
        const deactivatedCount = response.data.deactivated_count || 0;
        
        let message = 'Quarter statuses updated successfully!\n\n';
        if (activatedCount > 0) message += `✓ Activated: ${activatedCount} quarter(s)\n`;
        if (deactivatedCount > 0) message += `✗ Deactivated: ${deactivatedCount} quarter(s)\n`;
        if (response.data.current_active) {
          message += `\n📌 Current Active: ${response.data.current_active.name}`;
        }
        
        showAlert(message.replace(/\n/g, ' '), 'success');
        
        // Refresh the list
        if (schoolYearId) {
          fetchQuarters();
        } else {
          fetchAllQuarters();
        }
      } else {
        showAlert(response.data.message || 'Failed to auto-update quarters', 'error');
      }
    } catch (error) {
      console.error('Error auto-updating quarters:', error);
      showAlert(error.response?.data?.message || 'Failed to auto-update quarters', 'error');
    } finally {
      setIsAutoUpdating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateDates()) {
      return;
    }
    
    setIsLoading(true);

    // Check for duplicate quarter name within same school year
    const selectedSchoolYearId = parseInt(formData.school_year_id);
    
    if (!editingQuarter) {
      const existing = quarters.find(q => 
        q.name === formData.name && 
        q.school_year_id === selectedSchoolYearId
      );
      
      if (existing) {
        showAlert(`${formData.name} already exists in this school year!`, 'error');
        setIsLoading(false);
        return;
      }
    } else {
      const existing = quarters.find(q => 
        q.name === formData.name && 
        q.school_year_id === selectedSchoolYearId &&
        q.id !== editingQuarter.id
      );
      
      if (existing) {
        showAlert(`${formData.name} already exists in this school year!`, 'error');
        setIsLoading(false);
        return;
      }
    }

    try {
      let response;
      const submitData = {
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
        is_locked: formData.is_locked,
        school_year_id: parseInt(formData.school_year_id),
      };

      if (editingQuarter) {
        response = await axios.put(`${API_URL}/admin/quarters/${editingQuarter.id}`, submitData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        response = await axios.post(`${API_URL}/admin/quarters`, submitData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (response.data.success) {
        showAlert(
          editingQuarter ? 'Quarter updated successfully!' : 'Quarter added successfully!', 
          'success'
        );
        setShowModal(false);
        setFormData({
          name: '',
          start_date: '',
          end_date: '',
          is_active: false,
          is_locked: false,
          school_year_id: schoolYearId || '',
        });
        setEditingQuarter(null);
        
        if (schoolYearId) {
          fetchQuarters();
        } else {
          fetchAllQuarters();
        }
      }
    } catch (error) {
      console.error('Error saving quarter:', error);
      
      if (error.response?.status === 422) {
        const errors = error.response?.data?.errors;
        if (errors && errors.name) {
          showAlert(errors.name[0], 'error');
        } else if (errors && errors.start_date) {
          showAlert(errors.start_date[0], 'error');
        } else if (errors && errors.end_date) {
          showAlert(errors.end_date[0], 'error');
        } else {
          showAlert(error.response?.data?.message || 'Failed to save quarter', 'error');
        }
      } else if (error.response?.data?.message?.includes('already exists')) {
        showAlert(error.response.data.message, 'error');
      } else {
        showAlert(error.response?.data?.message || 'Failed to save quarter', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (quarter) => {
    if (!window.confirm(`Set ${quarter.name} as the active quarter?\n\nThe previous active quarter will be deactivated.`)) {
      return;
    }

    try {
      const response = await axios.put(`${API_URL}/admin/quarters/${quarter.id}`, {
        ...quarter,
        is_active: true,
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        showAlert(`${quarter.name} is now the active quarter!`, 'success');
        if (schoolYearId) {
          fetchQuarters();
        } else {
          fetchAllQuarters();
        }
      }
    } catch (error) {
      console.error('Error setting active quarter:', error);
      showAlert(error.response?.data?.message || 'Failed to set active quarter', 'error');
    }
  };

  const handleToggleLock = async (quarter) => {
    const action = quarter.is_locked ? 'lock' : 'unlock';
    const newLockState = !quarter.is_locked;
    
    if (!window.confirm(`Are you sure you want to ${action} ${quarter.name}?\n\n${newLockState ? 'Locking will prevent any grade edits.' : 'Unlocking will allow grade edits.'}`)) {
      return;
    }

    try {
      const response = await axios.put(`${API_URL}/admin/quarters/${quarter.id}`, {
        ...quarter,
        is_locked: newLockState,
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        showAlert(`${quarter.name} has been ${newLockState ? 'unlocked' : 'locked'}!`, 'success');
        if (schoolYearId) {
          fetchQuarters();
        } else {
          fetchAllQuarters();
        }
      }
    } catch (error) {
      console.error('Error toggling lock:', error);
      showAlert(error.response?.data?.message || 'Failed to update quarter', 'error');
    }
  };

  const handleDelete = async (quarter) => {
    if (quarter.grades_count > 0) {
      showAlert(`Cannot delete ${quarter.name} because it has ${quarter.grades_count} grade records.`, 'error');
      return;
    }
    
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to delete ${quarter.name}?\n\nThis action cannot be undone!`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/admin/quarters/${quarter.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (schoolYearId) {
        fetchQuarters();
      } else {
        fetchAllQuarters();
      }
      showAlert(`${quarter.name} deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting quarter:', error);
      showAlert(error.response?.data?.message || 'Failed to delete quarter', 'error');
    }
  };

  const getQuarterStatusBadge = (quarter) => {
    const today = new Date();
    const start = new Date(quarter.start_date);
    const end = new Date(quarter.end_date);
    const isOngoing = today >= start && today <= end;
    
    if (quarter.is_locked) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600"><Lock size={10} /> Locked</span>;
    }
    if (quarter.is_active) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700"><Zap size={10} /> Active</span>;
    }
    if (isOngoing) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700"><Play size={10} /> Ongoing</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">Inactive</span>;
  };

  const filteredQuarters = quarters.filter(q => 
    q.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.school_year?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedQuarters = [...filteredQuarters].sort((a, b) => {
    const order = { '1st Quarter': 1, '2nd Quarter': 2, '3rd Quarter': 3, '4th Quarter': 4 };
    return (order[a.name] || 0) - (order[b.name] || 0);
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              {schoolYearId && (
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={() => navigate('/admin/school-years')}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to School Years
                  </button>
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <Clock size={24} className="text-indigo-600" />
                {schoolYear ? `Quarters - ${schoolYear.year_start}-${schoolYear.year_end}` : 'Quarters Management'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Manage academic quarters, set active quarter, and lock grades
              </p>
            </div>
            
            <div className="flex gap-3">
              {/* ✅ AUTO-UPDATE BUTTON - IDINAGDAG ITO */}
              <button 
                onClick={handleAutoUpdate}
                disabled={isAutoUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium disabled:opacity-50"
                title="Auto-update quarters based on current date"
              >
                {isAutoUpdating ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                {isAutoUpdating ? 'Updating...' : 'Auto-Update'}
              </button>
              
              <button 
                onClick={() => {
                  setEditingQuarter(null);
                  setFormData({
                    name: '',
                    start_date: '',
                    end_date: '',
                    is_active: false,
                    is_locked: false,
                    school_year_id: schoolYearId || '',
                  });
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium"
              >
                <Plus size={16} />
                Add Quarter
              </button>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {showSuccess && (
          <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right-5 duration-300">
            <div className="bg-green-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[300px]">
              <CheckCircle size={18} />
              <span className="text-sm font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right-5 duration-300">
            <div className="bg-red-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[300px]">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{errorMessage}</span>
              <button onClick={() => setError(false)} className="ml-auto hover:text-red-200">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total Quarters</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalQuarters}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Clock size={18} className="text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Active Quarter</p>
                <p className="text-lg font-bold text-green-600 mt-1 truncate">{stats.activeQuarter || 'None'}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Locked Quarters</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.lockedQuarters}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Lock size={18} className="text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Ongoing Quarters</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.ongoingQuarters}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Play size={18} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search quarters..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Quarters Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-gray-500 text-sm mt-4">Loading quarters...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sortedQuarters.map((quarter) => (
              <div 
                key={quarter.id} 
                className={`bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 group ${
                  quarter.is_active ? 'border-green-200 ring-1 ring-green-200' : 'border-gray-100'
                }`}
              >
                <div className={`p-4 ${
                  quarter.is_active 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : quarter.is_locked
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                } text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar size={20} className="text-white/90" />
                      <h3 className="text-lg font-bold">{quarter.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      {!quarter.is_locked && !quarter.is_active && (
                        <button
                          onClick={() => handleToggleActive(quarter)}
                          className="p-1.5 bg-white/20 hover:bg-green-500/70 rounded-lg transition-all"
                          title="Set as Active"
                        >
                          <Zap size={14} className="text-white" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleLock(quarter)}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                        title={quarter.is_locked ? 'Unlock' : 'Lock'}
                      >
                        {quarter.is_locked ? <Unlock size={14} className="text-white" /> : <Lock size={14} className="text-white" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingQuarter(quarter);
                          setFormData({
                            name: quarter.name,
                            start_date: quarter.start_date,
                            end_date: quarter.end_date,
                            is_active: quarter.is_active,
                            is_locked: quarter.is_locked,
                            school_year_id: quarter.school_year_id,
                          });
                          setShowModal(true);
                        }}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                      >
                        <Edit2 size={14} className="text-white" />
                      </button>
                      <button
                        onClick={() => handleDelete(quarter)}
                        className="p-1.5 bg-white/20 hover:bg-red-500/50 rounded-lg transition-all"
                      >
                        <Trash2 size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar size={14} />
                        <span className="text-xs">Period</span>
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {new Date(quarter.start_date).toLocaleDateString()} - {new Date(quarter.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-500">
                        <BookOpen size={14} />
                        <span className="text-xs">Grades</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{quarter.grades_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Users size={14} />
                        <span className="text-xs">Students</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{quarter.students_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-500">
                        <FileText size={14} />
                        <span className="text-xs">Status</span>
                      </div>
                      {getQuarterStatusBadge(quarter)}
                    </div>
                    {!schoolYearId && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar size={14} />
                          <span className="text-xs">School Year</span>
                        </div>
                        <span className="text-xs font-medium text-gray-700">{quarter.school_year}</span>
                      </div>
                    )}
                  </div>

                  <div className="my-3 border-t border-gray-100"></div>

                  <button 
                    onClick={() => navigate(`/admin/quarters/${quarter.id}/grades`)}
                    className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    View Grades
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && sortedQuarters.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Quarters Found</h3>
            <p className="text-gray-400 text-sm mb-4">
              {schoolYear 
                ? `No quarters added for ${schoolYear.year_start}-${schoolYear.year_end} yet`
                : 'No quarters added yet'}
            </p>
            <button 
              onClick={() => {
                setEditingQuarter(null);
                setFormData({
                  name: '',
                  start_date: '',
                  end_date: '',
                  is_active: false,
                  is_locked: false,
                  school_year_id: schoolYearId || '',
                });
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm"
            >
              <Plus size={16} />
              Add Quarter
            </button>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingQuarter ? 'Edit Quarter' : 'Add New Quarter'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Quarter Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quarter Name *
                  </label>
                  <select
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all text-sm"
                    required
                  >
                    <option value="">Select Quarter</option>
                    <option value="1st Quarter">1st Quarter</option>
                    <option value="2nd Quarter">2nd Quarter</option>
                    <option value="3rd Quarter">3rd Quarter</option>
                    <option value="4th Quarter">4th Quarter</option>
                  </select>
                </div>

                {/* School Year (only if not in context) */}
                {!schoolYearId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      School Year *
                    </label>
                    <select
                      value={formData.school_year_id}
                      onChange={(e) => setFormData({ ...formData, school_year_id: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all text-sm"
                      required
                    >
                      <option value="">Select School Year</option>
                      {schoolYears.map(sy => (
                        <option key={sy.id} value={sy.id}>
                          {sy.year_start}-{sy.year_end} {sy.is_active ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all text-sm"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all text-sm"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1">End date must be after start date</p>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Set as active quarter
                  </label>
                </div>

                {/* Locked Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_locked"
                    checked={formData.is_locked}
                    onChange={(e) => setFormData({ ...formData, is_locked: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="is_locked" className="text-sm text-gray-700">
                    Lock grades (prevents editing)
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {isLoading ? 'Saving...' : (editingQuarter ? 'Update' : 'Save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quarters;