import React, { useState, useEffect } from 'react';
import {
  Settings, User, Shield, Bell, Database, Globe, Lock, Mail,
  Phone, MapPin, Calendar, Clock, Save, RefreshCw, Loader2,
  Eye, EyeOff, CheckCircle, AlertCircle, X, Upload, Camera,
  Users, GraduationCap, BookOpen, School, Calendar as CalendarIcon,
  Download, Trash2, Server, HardDrive, Activity, BarChart3
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    school_name: 'Laguindingan Central School',
    school_address: 'Laguindingan, Misamis Oriental',
    school_contact: '09123456789',
    school_email: 'admin@laguindingan.edu.ph',
    principal_name: 'Dr. Maria Santos',
    current_school_year: '',
    current_quarter: '',
  });

  // Profile Settings - UPDATED with birthdate and gender
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    contact_number: '',
    address: '',
    birthdate: '',
    gender: '',
    profile_picture: null,
  });

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    enable_qr_attendance: true,
    enable_grade_approval: true,
    enable_parent_portal: false,
    enable_activity_logs: true,
    maintenance_mode: false,
    auto_backup: true,
    backup_frequency: 'daily',
    max_file_size: 5,
    session_timeout: 30,
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    two_factor_auth: false,
    login_notifications: true,
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const token = localStorage.getItem('userToken');
  const [schoolYears, setSchoolYears] = useState([]);
  const [quarters, setQuarters] = useState([]);

  useEffect(() => {
    fetchSettings();
    fetchSchoolYears();
    fetchQuarters();
    fetchProfile();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        if (response.data.general) {
          setGeneralSettings(prev => ({ ...prev, ...response.data.general }));
        }
        if (response.data.system) {
          setSystemSettings(prev => ({ ...prev, ...response.data.system }));
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setProfile({
          first_name: response.data.user.first_name || '',
          last_name: response.data.user.last_name || '',
          middle_name: response.data.user.middle_name || '',
          email: response.data.user.email || '',
          contact_number: response.data.user.contact_number || '',
          address: response.data.user.address || '',
          birthdate: response.data.user.birthdate || '',
          gender: response.data.user.gender || '',
          profile_picture: response.data.user.profile_picture_url || null,
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchSchoolYears = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/school-years`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSchoolYears(response.data.school_years);
        const active = response.data.school_years.find(sy => sy.is_active);
        if (active) {
          setGeneralSettings(prev => ({ ...prev, current_school_year: active.id.toString() }));
        }
      }
    } catch (err) {
      console.error('Error fetching school years:', err);
    }
  };

  const fetchQuarters = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/quarters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setQuarters(response.data.quarters);
        const active = response.data.quarters.find(q => q.is_active);
        if (active) {
          setGeneralSettings(prev => ({ ...prev, current_quarter: active.id.toString() }));
        }
      }
    } catch (err) {
      console.error('Error fetching quarters:', err);
    }
  };

  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.put(`${API_URL}/admin/settings/general`, generalSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSuccess('General settings updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to update general settings');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.put(`${API_URL}/profile/update`, profile, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
        // Refresh profile data
        fetchProfile();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSystemSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.put(`${API_URL}/admin/settings/system`, systemSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSuccess('System settings updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    if (securitySettings.new_password !== securitySettings.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.put(`${API_URL}/profile/change-password`, {
        current_password: securitySettings.current_password,
        new_password: securitySettings.new_password,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSuccess('Password changed successfully!');
        setSecuritySettings({
          current_password: '',
          new_password: '',
          confirm_password: '',
          two_factor_auth: securitySettings.two_factor_auth,
          login_notifications: securitySettings.login_notifications,
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to change password');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profile_picture', file);

    try {
      const response = await axios.post(`${API_URL}/upload-profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data.success) {
        setProfile(prev => ({ ...prev, profile_picture: response.data.profile_picture_url }));
        setSuccess('Profile picture updated!');
        setTimeout(() => setSuccess(''), 3000);
        // Refresh profile to get updated data
        fetchProfile();
      }
    } catch (err) {
      setError('Failed to upload profile picture');
    }
  };

  const backupDatabase = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/backup`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.sql`;
      a.click();
      setSuccess('Database backup downloaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to backup database');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/admin/clear-cache`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSuccess('Cache cleared successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Settings size={18} /> },
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'system', label: 'System', icon: <Database size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={40} />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings size={24} className="text-indigo-600" />
            Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage system configuration, profile, and security preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-500" />
            <p className="text-sm text-green-700">{success}</p>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
              <X size={16} />
            </button>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* GENERAL SETTINGS TAB */}
          {activeTab === 'general' && (
            <form onSubmit={handleGeneralSubmit} className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <School size={20} className="text-indigo-500" />
                School Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                  <input
                    type="text"
                    value={generalSettings.school_name}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, school_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Address</label>
                  <input
                    type="text"
                    value={generalSettings.school_address}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, school_address: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={generalSettings.school_contact}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, school_contact: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={generalSettings.school_email}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, school_email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
                  <input
                    type="text"
                    value={generalSettings.principal_name}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, principal_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current School Year</label>
                  <select
                    value={generalSettings.current_school_year || ''}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, current_school_year: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  >
                    <option value="">Select School Year</option>
                    {schoolYears.map(sy => (
                      <option key={sy.id} value={sy.id}>{sy.year_start}-{sy.year_end}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Quarter</label>
                  <select
                    value={generalSettings.current_quarter || ''}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, current_quarter: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  >
                    <option value="">Select Quarter</option>
                    {quarters.map(q => (
                      <option key={q.id} value={q.id}>{q.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save General Settings
                </button>
              </div>
            </form>
          )}

          {/* PROFILE SETTINGS TAB - UPDATED with birthdate and gender */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User size={20} className="text-indigo-500" />
                Personal Information
              </h2>
              
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  {profile.profile_picture ? (
                    <img src={profile.profile_picture} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-indigo-400" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
                      {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 rounded-full cursor-pointer hover:bg-indigo-700">
                    <Camera size={14} className="text-white" />
                    <input type="file" accept="image/*" onChange={handleProfilePictureUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={profile.middle_name}
                    onChange={(e) => setProfile({ ...profile, middle_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={profile.contact_number}
                    onChange={(e) => setProfile({ ...profile, contact_number: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
                  <input
                    type="date"
                    value={profile.birthdate || ''}
                    onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={profile.gender || ''}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Update Profile
                </button>
              </div>
            </form>
          )}

          {/* SYSTEM SETTINGS TAB */}
          {activeTab === 'system' && (
            <form onSubmit={handleSystemSubmit} className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Database size={20} className="text-indigo-500" />
                System Configuration
              </h2>

              <div className="space-y-5 mb-6">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">QR Code Attendance</p>
                    <p className="text-xs text-gray-500">Enable QR code scanning for student attendance</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.enable_qr_attendance}
                      onChange={(e) => setSystemSettings({ ...systemSettings, enable_qr_attendance: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Grade Approval System</p>
                    <p className="text-xs text-gray-500">Require admin approval before grades are finalized</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.enable_grade_approval}
                      onChange={(e) => setSystemSettings({ ...systemSettings, enable_grade_approval: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Parent Portal</p>
                    <p className="text-xs text-gray-500">Allow parents to view student progress</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.enable_parent_portal}
                      onChange={(e) => setSystemSettings({ ...systemSettings, enable_parent_portal: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Activity Logs</p>
                    <p className="text-xs text-gray-500">Record all system activities for audit trail</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.enable_activity_logs}
                      onChange={(e) => setSystemSettings({ ...systemSettings, enable_activity_logs: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Maintenance Mode</p>
                    <p className="text-xs text-gray-500">Put system under maintenance (only admins can access)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.maintenance_mode}
                      onChange={(e) => setSystemSettings({ ...systemSettings, maintenance_mode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Auto Database Backup</p>
                    <p className="text-xs text-gray-500">Automatically backup database on schedule</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.auto_backup}
                      onChange={(e) => setSystemSettings({ ...systemSettings, auto_backup: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {systemSettings.auto_backup && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Backup Frequency</label>
                    <select
                      value={systemSettings.backup_frequency}
                      onChange={(e) => setSystemSettings({ ...systemSettings, backup_frequency: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max File Size (MB)</label>
                    <input
                      type="number"
                      value={systemSettings.max_file_size}
                      onChange={(e) => setSystemSettings({ ...systemSettings, max_file_size: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={systemSettings.session_timeout}
                      onChange={(e) => setSystemSettings({ ...systemSettings, session_timeout: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={backupDatabase}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                >
                  <Download size={16} />
                  Backup Database
                </button>
                <button
                  type="button"
                  onClick={clearCache}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                >
                  <RefreshCw size={16} />
                  Clear Cache
                </button>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save System Settings
                </button>
              </div>
            </form>
          )}

          {/* SECURITY SETTINGS TAB */}
          {activeTab === 'security' && (
            <form onSubmit={handleSecuritySubmit} className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Shield size={20} className="text-indigo-500" />
                Security & Authentication
              </h2>

              <div className="space-y-5 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-3">Change Password</h3>
                  <div className="space-y-3">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.current ? 'text' : 'password'}
                          value={securitySettings.current_password}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, current_password: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.new ? 'text' : 'password'}
                          value={securitySettings.new_password}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, new_password: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.confirm ? 'text' : 'password'}
                          value={securitySettings.confirm_password}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, confirm_password: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Two-Factor Authentication (2FA)</p>
                    <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.two_factor_auth}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, two_factor_auth: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Login Notifications</p>
                    <p className="text-xs text-gray-500">Receive email notifications for new login attempts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.login_notifications}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, login_notifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Security Settings
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-400">
          System Version 4.2.0 • Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;