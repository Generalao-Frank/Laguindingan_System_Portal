import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Mail, ShieldCheck, Save, Loader2, Users, BookOpen, Award, 
  Lock, TrendingUp, CheckCircle, X, Search, Edit2, Trash2, 
  MoreVertical, Filter, Calendar, Phone, MapPin, GraduationCap,
  Eye, ChevronRight, AlertCircle, RefreshCw, Download, Info,
  User, Briefcase, IdCard, Calendar as CalendarIcon, Home, Smartphone
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const ManageTeacher = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'Female',
    birthdate: '',
    address: '',
    contactNumber: '',
    employeeId: '',
    email: '',
    password: ''
  });
  
  const [editFormData, setEditFormData] = useState({
    id: null,
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'Female',
    birthdate: '',
    address: '',
    contactNumber: '',
    email: '',
    password: ''
  });
  
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [showForm, setShowForm] = useState(true);
  const [error, setError] = useState('');


  
  const getToken = () => localStorage.getItem('userToken');

  // Tamang computation ng age
  const calculateAge = (birthdate) => {
    if (!birthdate) return 'N/A';
    try {
      const birthDate = new Date(birthdate);
      const today = new Date();
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      return 'N/A';
    }
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
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

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };

  // Fetch teachers on load
  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setIsFetching(true);
    setError('');
    try {
      const token = getToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await axios.get(`${API_URL}/admin/teachers`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.data.success) {
        setTeachers(response.data.teachers);
      } else {
        setError(response.data.message || 'Failed to fetch teachers');
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setError(error.response?.data?.message || 'Failed to connect to server');
      
      // Fallback to demo data if API fails
      setTeachers([
        { id: 1, first_name: 'Maria', middle_name: 'C', last_name: 'Santos', gender: 'Female', birthdate: '1990-08-22', address: 'Laguindingan, Misamis Oriental', contact_number: '09179876543', employee_id: 'TCH-2024-001', email: 'maria.santos@school.edu.ph', status: 'Active' },
        { id: 2, first_name: 'John', middle_name: 'R', last_name: 'Reyes', gender: 'Male', birthdate: '1988-03-15', address: 'Cagayan de Oro City', contact_number: '09171234567', employee_id: 'TCH-2024-002', email: 'john.reyes@school.edu.ph', status: 'Active' },
        { id: 3, first_name: 'Ana', middle_name: 'M', last_name: 'Cruz', gender: 'Female', birthdate: '1995-11-20', address: 'Laguindingan, Misamis Oriental', contact_number: '09174567890', employee_id: 'TCH-2024-003', email: 'ana.cruz@school.edu.ph', status: 'Active' },
      ]);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        setError('Not authenticated. Please login again.');
        return;
      }

      const response = await axios.post(`${API_URL}/admin/teachers`, {
        first_name: formData.firstName,
        middle_name: formData.middleName,
        last_name: formData.lastName,
        gender: formData.gender,
        birthdate: formData.birthdate,
        address: formData.address,
        contact_number: formData.contactNumber,
        employee_id: formData.employeeId,
        email: formData.email,
        password: formData.password,
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setFormData({
          firstName: '',
          middleName: '',
          lastName: '',
          gender: 'Female',
          birthdate: '',
          address: '',
          contactNumber: '',
          employeeId: '',
          email: '',
          password: ''
        });
        fetchTeachers();
      }
    } catch (error) {
      console.error("Error saving teacher:", error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.errors || "Failed to create teacher account";
      if (typeof errorMessage === 'object') {
        const firstError = Object.values(errorMessage)[0];
        setError(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        setError('Not authenticated. Please login again.');
        return;
      }

      const response = await axios.put(`${API_URL}/admin/teachers/${editFormData.id}`, {
        first_name: editFormData.firstName,
        middle_name: editFormData.middleName,
        last_name: editFormData.lastName,
        gender: editFormData.gender,
        birthdate: editFormData.birthdate,
        address: editFormData.address,
        contact_number: editFormData.contactNumber,
        email: editFormData.email,
        password: editFormData.password || undefined,
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setShowEditModal(false);
        setEditFormData({
          id: null,
          firstName: '',
          middleName: '',
          lastName: '',
          gender: 'Female',
          birthdate: '',
          address: '',
          contactNumber: '',
          email: '',
          password: ''
        });
        fetchTeachers();
      }
    } catch (error) {
      console.error("Error updating teacher:", error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.errors || "Failed to update teacher account";
      if (typeof errorMessage === 'object') {
        const firstError = Object.values(errorMessage)[0];
        setError(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTeacher) return;
    
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/admin/teachers/${selectedTeacher.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setShowDeleteModal(false);
      setSelectedTeacher(null);
      fetchTeachers();
    } catch (error) {
      console.error('Error deleting teacher:', error);
      setError(error.response?.data?.message || 'Failed to delete teacher');
    }
  };

  const handleViewDetails = (teacher) => {
    setSelectedTeacher(teacher);
    setShowViewModal(true);
  };

  const handleEditClick = (teacher) => {
    setEditFormData({
      id: teacher.id,
      firstName: teacher.first_name || '',
      middleName: teacher.middle_name || '',
      lastName: teacher.last_name || '',
      gender: teacher.gender || 'Female',
      birthdate: formatDateForInput(teacher.birthdate),
      address: teacher.address || '',
      contactNumber: teacher.contact_number || '',
      email: teacher.email || '',
      password: ''
    });
    setShowEditModal(true);
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = `${teacher.first_name} ${teacher.last_name} ${teacher.employee_id} ${teacher.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = filterGender === 'all' || teacher.gender === filterGender;
    return matchesSearch && matchesGender;
  });

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
      
      <div className="max-w-[1600px] mx-auto">
        
        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right-5 duration-300">
            <div className="bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <CheckCircle size={18} />
              <span className="text-sm font-medium">Teacher account created successfully!</span>
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

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Manage Teachers</h1>
              <p className="text-slate-500 mt-1 text-sm">Create, manage, and authorize teacher accounts for the mobile application.</p>
            </div>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <UserPlus size={16} />
              <span className="text-sm font-medium">{showForm ? 'Hide Form' : 'Add Teacher'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Form Card */}
          {showForm && (
            <div className="lg:col-span-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden sticky top-24">
                <div className="px-5 py-4 border-b border-white/20 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <UserPlus size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-800">New Teacher Registration</h2>
                      <p className="text-[10px] text-slate-500">Fill in the details to create a teacher account</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  {/* Name Fields */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">First Name *</label>
                      <input 
                        type="text" 
                        placeholder="First"
                        value={formData.firstName}
                        className="w-full px-3 py-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all text-sm"
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Middle</label>
                      <input 
                        type="text" 
                        placeholder="Middle"
                        value={formData.middleName}
                        className="w-full px-3 py-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                        onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Last Name *</label>
                      <input 
                        type="text" 
                        placeholder="Last"
                        value={formData.lastName}
                        className="w-full px-3 py-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  {/* Gender & Birthdate */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Gender *</label>
                      <select 
                        value={formData.gender}
                        className="w-full px-3 py-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        required
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Birthdate</label>
                      <input 
                        type="date" 
                        value={formData.birthdate}
                        className="w-full px-3 py-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                        onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Address</label>
                    <input 
                      type="text" 
                      placeholder="Complete address"
                      value={formData.address}
                      className="w-full px-3 py-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>

                  {/* Contact Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Contact Number</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="tel" 
                        placeholder="09171234567"
                        value={formData.contactNumber}
                        className="w-full pl-9 pr-3 py-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                        onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Employee ID */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Employee ID (Username) *</label>
                    <div className="relative">
                      <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="TCH-2024-001"
                        value={formData.employeeId}
                        className="w-full pl-9 pr-3 py-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none font-mono text-sm"
                        onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Email Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="email" 
                        placeholder="teacher@school.edu.ph"
                        value={formData.email}
                        className="w-full pl-9 pr-3 py-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Initial Password *</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={formData.password}
                        className="w-full pl-9 pr-3 py-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                      />
                    </div>
                    <p className="text-[9px] text-slate-400">Minimum 6 characters. Teacher can change after first login.</p>
                  </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2.5 mt-2 ${
                      isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
                    } text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg`}
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isLoading ? 'Creating...' : 'Register Teacher'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Right Column: Teacher List */}
          <div className={showForm ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {/* Search and Filter Bar */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name, employee ID, or email..."
                    value={searchTerm}
                    className="w-full pl-9 pr-3 py-2 bg-white/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={filterGender}
                    className="px-3 py-2 bg-white/50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                    onChange={(e) => setFilterGender(e.target.value)}
                  >
                    <option value="all">All Genders</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                  <button 
                    onClick={fetchTeachers}
                    className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    title="Refresh list"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isFetching && (
              <div className="text-center py-12">
                <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-3" />
                <p className="text-gray-500">Loading teachers...</p>
              </div>
            )}

            {/* Teachers Grid */}
            {!isFetching && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredTeachers.map((teacher) => (
                  <div key={teacher.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden group">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-base shadow-md overflow-hidden">
                            {teacher.profile_picture ? (
                              <img 
                                src={teacher.profile_picture} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(teacher.first_name, teacher.last_name)
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">
                              {teacher.first_name} {teacher.middle_name} {teacher.last_name}
                            </h3>
                            <p className="text-xs text-indigo-600 font-mono mt-0.5">{teacher.employee_id}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail size={12} />
                          <span>{teacher.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Phone size={12} />
                          <span>{teacher.contact_number || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>{formatDate(teacher.birthdate) !== 'Not set' ? formatDate(teacher.birthdate) : 'Birthdate not set'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPin size={12} />
                          <span className="truncate">{teacher.address || 'Address not set'}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="text-[10px] font-medium text-emerald-600">{teacher.status || 'Active'}</span>
                        </div>
                        <button 
                          onClick={() => handleViewDetails(teacher)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                        >
                          View Details <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isFetching && filteredTeachers.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500">No teachers found</p>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      {showViewModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden">
                  {selectedTeacher.profile_picture ? (
                    <img 
                      src={selectedTeacher.profile_picture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(selectedTeacher.first_name, selectedTeacher.last_name)
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Teacher Details</h2>
                  <p className="text-indigo-100 text-sm">{selectedTeacher.employee_id}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowViewModal(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Personal Information Section */}
              <div>
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <User size={18} className="text-indigo-500" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Full Name</p>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedTeacher.first_name} {selectedTeacher.middle_name} {selectedTeacher.last_name}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Gender</p>
                    <p className="text-sm font-medium text-gray-800">{selectedTeacher.gender}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Birthdate</p>
                    <p className="text-sm font-medium text-gray-800">{formatDate(selectedTeacher.birthdate)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Age</p>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedTeacher.birthdate ? 
                        `${calculateAge(selectedTeacher.birthdate)} years old` : 
                        'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div>
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <Smartphone size={18} className="text-indigo-500" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Email Address</p>
                    <p className="text-sm font-medium text-gray-800">{selectedTeacher.email || 'Not provided'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Contact Number</p>
                    <p className="text-sm font-medium text-gray-800">{selectedTeacher.contact_number || 'Not provided'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 md:col-span-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Address</p>
                    <p className="text-sm font-medium text-gray-800">{selectedTeacher.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Employment Information Section */}
              <div>
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <Briefcase size={18} className="text-indigo-500" />
                  Employment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Employee ID</p>
                    <p className="text-sm font-medium text-gray-800 font-mono">{selectedTeacher.employee_id}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Status</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <p className="text-sm font-medium text-emerald-600">{selectedTeacher.status || 'Active'}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Date Registered</p>
                    <p className="text-sm font-medium text-gray-800">{formatDate(selectedTeacher.created_at) || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditClick(selectedTeacher);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Edit2 size={14} />
                Edit Teacher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Edit2 size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Edit Teacher</h2>
                  <p className="text-amber-100 text-sm">Update teacher information</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateTeacher} className="p-6 space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">First Name *</label>
                  <input 
                    type="text" 
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Middle Name</label>
                  <input 
                    type="text" 
                    value={editFormData.middleName}
                    onChange={(e) => setEditFormData({...editFormData, middleName: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Last Name *</label>
                  <input 
                    type="text" 
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              {/* Gender & Birthdate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Gender *</label>
                  <select 
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({...editFormData, gender: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                    required
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Birthdate</label>
                  <input 
                    type="date" 
                    value={editFormData.birthdate}
                    onChange={(e) => setEditFormData({...editFormData, birthdate: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Address</label>
                <input 
                  type="text" 
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                />
              </div>

              {/* Contact Number & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Contact Number</label>
                  <input 
                    type="tel" 
                    value={editFormData.contactNumber}
                    onChange={(e) => setEditFormData({...editFormData, contactNumber: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Password (optional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">New Password (optional)</label>
                <input 
                  type="password" 
                  placeholder="Leave blank to keep current password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                />
                <p className="text-[9px] text-gray-400 mt-1">Only fill this if you want to change the password</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Delete Teacher</h3>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              Are you sure you want to delete <span className="font-semibold">{selectedTeacher.first_name} {selectedTeacher.last_name}</span>?
            </p>
            <p className="text-gray-500 text-xs mb-6">This action cannot be undone. All associated data will be removed.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTeacher;