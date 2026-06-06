import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, UserCheck, Calendar, UserCircle, 
  Users, BookOpen, Shield, Award, CheckCircle, 
  AlertCircle, UserPlus, GraduationCap, Phone, MapPin,
  Mail, Heart, Loader2, RefreshCw, X, Eye, EyeOff,
  ClipboardList, TrendingUp, School, Clock, ChevronRight,
  Lock, Key
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const EnrollStudent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sections, setSections] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [currentTerm, setCurrentTerm] = useState({
    schoolYear: 'Loading...',
    quarter: 'Loading...',
    status: 'Loading...'
  });
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState('');
  const [stats, setStats] = useState({
    totalEnrolled: 0,
    thisMonth: 0,
    maleCount: 0,
    femaleCount: 0
  });
  
  const [formData, setFormData] = useState({
    lrn: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'Male',
    birthdate: '',
    address: '',
    contact_number: '',
    guardian_name: '',
    guardian_contact_number: '',
    grade_level: '0',
    section_id: '',
    psa_number: '',
    father_name: '',
    mother_name: '',
    password: ''
  });

 
  const token = localStorage.getItem('userToken');

  // Validate contact number (max 11 digits)
  const validateContactNumber = (value) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length > 11) {
      return digitsOnly.slice(0, 11);
    }
    return digitsOnly;
  };

  useEffect(() => {
    fetchGradeLevels();
    fetchSections();
    fetchStats();
    fetchCurrentTerm();
  }, []);

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
      // Fallback with correct id mapping
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
    setIsFetching(true);
    try {
      const response = await axios.get(`${API_URL}/admin/sections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSections(response.data.sections);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/students/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCurrentTerm = async () => {
    try {
      // Fetch active school year
      const schoolYearResponse = await axios.get(`${API_URL}/admin/school-years`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (schoolYearResponse.data.success) {
        const activeSchoolYear = schoolYearResponse.data.school_years.find(sy => sy.is_active);
        if (activeSchoolYear) {
          setSchoolYears(schoolYearResponse.data.school_years);
          
          // Fetch quarters for the active school year
          const quartersResponse = await axios.get(`${API_URL}/admin/school-years/${activeSchoolYear.id}/quarters`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (quartersResponse.data.success) {
            setQuarters(quartersResponse.data.quarters);
            const activeQuarter = quartersResponse.data.quarters.find(q => q.is_active);
            
            setCurrentTerm({
              schoolYear: `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}`,
              quarter: activeQuarter ? activeQuarter.name : 'No Active Quarter',
              status: 'Active'
            });
          } else {
            setCurrentTerm({
              schoolYear: `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}`,
              quarter: 'No quarter set',
              status: 'Active'
            });
          }
        } else {
          setCurrentTerm({
            schoolYear: 'No Active School Year',
            quarter: 'N/A',
            status: 'Inactive'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching current term:', error);
      setCurrentTerm({
        schoolYear: '2025-2026',
        quarter: '3rd Quarter',
        status: 'Active'
      });
    }
  };

  // Filter sections based on selected grade level ID (not numeric value)
  const filteredSections = sections.filter(
    section => section.grade_level_id === selectedGradeLevelId
  );

  const getGradeLevelName = (gradeLevel) => {
    if (gradeLevel === 0) return 'Kinder';
    return `Grade ${gradeLevel}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate LRN
    if (!formData.lrn || formData.lrn.length !== 12) {
      setError('LRN is required and must be exactly 12 digits. This will be used as the student\'s username.');
      setLoading(false);
      return;
    }

    // Validate password
    if (!formData.password || formData.password.length < 6) {
      setError('Password is required and must be at least 6 characters.');
      setLoading(false);
      return;
    }

    // Validate guardian contact number (must be exactly 11 digits if provided)
    if (formData.guardian_contact_number) {
      const digitsOnly = formData.guardian_contact_number.replace(/\D/g, '');
      if (digitsOnly.length !== 11) {
        setError('Guardian\'s contact number must be exactly 11 digits (e.g., 09171234567).');
        setLoading(false);
        return;
      }
    }

    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.birthdate || 
        !formData.guardian_name || !formData.guardian_contact_number || !formData.section_id) {
      setError('Please fill in all required fields marked with *');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/admin/students`, {
        lrn: formData.lrn,
        first_name: formData.first_name,
        middle_name: formData.middle_name || null,
        last_name: formData.last_name,
        gender: formData.gender,
        birthdate: formData.birthdate,
        address: formData.address || null,
        contact_number: formData.contact_number || null,
        guardian_name: formData.guardian_name,
        guardian_contact_number: formData.guardian_contact_number,
        grade_level: parseInt(formData.grade_level),
        section_id: parseInt(formData.section_id),
        psa_number: formData.psa_number || null,
        father_name: formData.father_name || null,
        mother_name: formData.mother_name || null,
        password: formData.password,
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        // Reset form
        setFormData({
          lrn: '',
          first_name: '',
          middle_name: '',
          last_name: '',
          gender: 'Male',
          birthdate: '',
          address: '',
          contact_number: '',
          guardian_name: '',
          guardian_contact_number: '',
          grade_level: '0',
          section_id: '',
          psa_number: '',
          father_name: '',
          mother_name: '',
          password: ''
        });
        setSelectedGradeLevelId('');
        
        // Refresh stats and term
        fetchStats();
        fetchCurrentTerm();
        
        // Redirect after 2 seconds
        setTimeout(() => navigate('/admin/students'), 2000);
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Failed to enroll student";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    if (status === 'Active') return 'text-emerald-600';
    if (status === 'Inactive') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
      
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Enroll New Student</h1>
              <p className="text-slate-500 text-sm mt-1">Register a new student to the system with complete information</p>
            </div>
            <button 
              onClick={() => navigate('/admin/students')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Back to Students
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right-5 duration-300">
            <div className="bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <CheckCircle size={18} />
              <span className="text-sm font-medium">Student enrolled successfully!</span>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right-5 duration-300">
            <div className="bg-red-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{error}</span>
              <button onClick={() => setError('')} className="ml-2">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              
              {/* Form Header */}
              <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <UserPlus size={22} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-lg">Student Registration Form</h2>
                    <p className="text-indigo-200 text-xs mt-0.5">Fill in all required information marked with *</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                
                {/* LRN and PSA Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Shield size={12} className="text-indigo-500" />
                      Learner Reference Number (LRN) *
                    </label>
                    <input 
                      required
                      type="text" 
                      maxLength="12"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-mono text-sm"
                      placeholder="Enter 12-digit LRN"
                      value={formData.lrn}
                      onChange={(e) => setFormData({...formData, lrn: e.target.value.replace(/\D/g, '')})}
                    />
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Key size={10} />
                      This will be used as the student's username
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <ClipboardList size={12} className="text-indigo-500" />
                      PSA Number
                    </label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                      placeholder="Enter PSA Certificate Number (optional)"
                      value={formData.psa_number}
                      onChange={(e) => setFormData({...formData, psa_number: e.target.value})}
                    />
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">First Name *</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                      placeholder="First Name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Middle Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                      placeholder="Middle Name (optional)"
                      value={formData.middle_name}
                      onChange={(e) => setFormData({...formData, middle_name: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Last Name *</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                      placeholder="Last Name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>

                {/* Gender & Birthdate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Gender *</label>
                    <div className="flex gap-3">
                      {['Male', 'Female'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setFormData({...formData, gender: g})}
                          className={`flex-1 py-2.5 rounded-xl font-medium transition-all border ${
                            formData.gender === g 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar size={12} className="text-indigo-500" />
                      Birthdate *
                    </label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                      value={formData.birthdate}
                      onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin size={12} className="text-indigo-500" />
                    Address
                  </label>
                  <textarea 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm resize-none"
                    rows="2"
                    placeholder="Complete address of the student (optional)"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value.toUpperCase()})}
                  />
                </div>

                {/* Contact Number & Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Phone size={12} className="text-indigo-500" />
                      Student Contact Number
                    </label>
                    <input 
                      type="tel" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                      placeholder="09171234567 (optional)"
                      value={formData.contact_number}
                      onChange={(e) => setFormData({...formData, contact_number: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Lock size={12} className="text-indigo-500" />
                      Password *
                    </label>
                    <div className="relative">
                      <input 
                        required
                        type={showPassword ? "text" : "password"} 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                        placeholder="Enter password for student account"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock size={10} />
                      Minimum 6 characters. Student will use this to login with their LRN as username
                    </p>
                  </div>
                </div>

                {/* Parent/Guardian Information */}
                <div className="bg-indigo-50/30 rounded-xl p-5 border border-indigo-100">
                  <h3 className="text-sm font-semibold text-indigo-800 mb-4 flex items-center gap-2">
                    <Heart size={16} />
                    Parent/Guardian Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Father's Name</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                        placeholder="Father's Full Name (optional)"
                        value={formData.father_name}
                        onChange={(e) => setFormData({...formData, father_name: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Mother's Name</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                        placeholder="Mother's Full Name (optional)"
                        value={formData.mother_name}
                        onChange={(e) => setFormData({...formData, mother_name: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Guardian's Name *</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                        placeholder="Guardian's Full Name"
                        value={formData.guardian_name}
                        onChange={(e) => setFormData({...formData, guardian_name: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Guardian's Contact *</label>
                      <input 
                        required
                        type="tel" 
                        maxLength="11"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
                        placeholder="09171234567"
                        value={formData.guardian_contact_number}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 11) {
                            setFormData({...formData, guardian_contact_number: value});
                          }
                        }}
                      />
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Phone size={10} />
                        Exactly 11 digits (e.g., 09171234567)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grade Level & Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen size={12} className="text-indigo-500" />
                      Grade Level *
                    </label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm appearance-none cursor-pointer"
                      value={selectedGradeLevelId}
                      onChange={(e) => {
                        const gradeId = parseInt(e.target.value);
                        setSelectedGradeLevelId(gradeId);
                        const selectedGrade = gradeLevels.find(g => g.id === gradeId);
                        if (selectedGrade) {
                          setFormData(prev => ({ ...prev, grade_level: selectedGrade.grade_level.toString(), section_id: '' }));
                        } else {
                          setFormData(prev => ({ ...prev, grade_level: '', section_id: '' }));
                        }
                      }}
                      required
                    >
                      <option value="">Select Grade Level</option>
                      {gradeLevels.map(level => (
                        <option key={level.id} value={level.id}>
                          {level.grade_display || (level.grade_level === 0 ? 'Kinder' : `Grade ${level.grade_level}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Users size={12} className="text-indigo-500" />
                      Section *
                    </label>
                    <select 
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm appearance-none cursor-pointer"
                      value={formData.section_id}
                      onChange={(e) => setFormData({...formData, section_id: e.target.value})}
                      disabled={isFetching}
                    >
                      <option value="">Select Section</option>
                      {filteredSections.map(section => (
                        <option key={section.id} value={section.id}>
                          {section.section_name}
                        </option>
                      ))}
                    </select>
                    {filteredSections.length === 0 && selectedGradeLevelId && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
                        <AlertCircle size={10} />
                        No sections available for this grade level
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className={`w-full py-3.5 mt-4 ${
                    loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                  } text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Processing Enrollment...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Enroll Student
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-5">
            
            {/* Stats Cards */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap size={18} className="text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-700">School Overview</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Total Enrolled</span>
                  <span className="text-lg font-bold text-slate-800">{stats.totalEnrolled}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">New This Month</span>
                  <span className="text-lg font-bold text-emerald-600">+{stats.thisMonth}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                    <span className="text-xs text-slate-500">Male</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{stats.maleCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-xs text-slate-500">Female</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{stats.femaleCount}</span>
                </div>
              </div>
            </div>

            {/* Login Credentials Info */}
            <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <Key size={18} className="text-indigo-600" />
                <h3 className="text-sm font-semibold text-indigo-900">Student Login Credentials</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  <span><strong className="font-semibold">Username:</strong> 12-digit LRN number</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  <span><strong className="font-semibold">Password:</strong> The password you set above</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  <span>Students can change password after first login</span>
                </li>
              </ul>
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <Award size={18} className="text-indigo-600" />
                <h3 className="text-sm font-semibold text-indigo-900">Quick Tips</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  <span>LRN is REQUIRED (12 digits) - will be username</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  <span>Password must be at least 6 characters</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  <span>Guardian's contact must be exactly 11 digits</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  <span>Fields with * are required</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  <span>Use uppercase for names and sections</span>
                </li>
              </ul>
            </div>

            {/* Current Term Info - Updated with dynamic data */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-700">Current Term</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">School Year:</p>
                  <p className="text-xs font-semibold text-slate-700">{currentTerm.schoolYear}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">Quarter:</p>
                  <p className="text-xs font-semibold text-indigo-600">{currentTerm.quarter}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">Status:</p>
                  <p className={`text-xs font-semibold ${getStatusColor(currentTerm.status)}`}>{currentTerm.status}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollStudent;