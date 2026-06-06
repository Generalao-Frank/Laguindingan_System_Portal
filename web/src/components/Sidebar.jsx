import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, UserPlus, Users, LogOut, ShieldCheck, UserCheck, Settings, PieChart,
  Briefcase, Calendar, Award, TrendingUp, Activity, GraduationCap, BookOpen,
  ChevronDown, ChevronLeft, ChevronRight, School, Clock, FileText, QrCode,
  Video, MessageSquare, Database, Download, CheckCircle, AlertCircle, Camera, X, Upload,
  Cake, Gift, Star, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import axios from 'axios';
import lesLogo from '../assets/les_logo1.png';
import API_URL from '../config';

const Sidebar = ({ onLogout, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [userData, setUserData] = useState(null);
  const fileInputRef = useRef(null);

  // System Overview Data
  const [systemStats, setSystemStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeSections: 0,
    schoolYear: 'Loading...',
    currentTerm: 'Loading...'
  });

  // Birthday Data
  const [birthdayData, setBirthdayData] = useState({
    today: [],
    upcoming: [],
    all: []
  });
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [modalType, setModalType] = useState('upcoming'); // 'today' or 'upcoming'

  // Load user data and profile picture from server on mount
  useEffect(() => {
    fetchUserProfile();
    fetchSystemStats();
    fetchBirthdays();
  }, []);

  const fetchUserProfile = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setUserData(response.data.user);
        if (response.data.user.profile_picture_url) {
          setProfileImage(response.data.user.profile_picture_url);
        }
        localStorage.setItem('userData', JSON.stringify(response.data.user));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      const savedUserData = localStorage.getItem('userData');
      if (savedUserData) {
        const user = JSON.parse(savedUserData);
        setUserData(user);
        setProfileImage(user.profile_picture_url || null);
      }
    }
  };

  const fetchSystemStats = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSystemStats({
          totalStudents: response.data.stats.totalStudents || 0,
          totalTeachers: response.data.stats.totalTeachers || 0,
          activeSections: response.data.stats.totalSections || 0,
          schoolYear: response.data.activeSchoolYear || 'N/A',
          currentTerm: response.data.activeQuarter || 'N/A'
        });
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const fetchBirthdays = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/admin/birthdays`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        // Filter upcoming birthdays (within 30 days, excluding today)
        const upcomingWithin30Days = (response.data.upcoming || []).filter(b => b.days_until <= 30 && b.days_until > 0);
        
        setBirthdayData({
          today: response.data.today || [],
          upcoming: upcomingWithin30Days,
          all: response.data.all || []
        });
      } else {
        setBirthdayData({
          today: [],
          upcoming: [],
          all: []
        });
      }
    } catch (error) {
      console.error('Error fetching birthdays:', error);
      setBirthdayData({
        today: [],
        upcoming: [],
        all: []
      });
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) setOpenSubmenus({});
  };

  const toggleSubmenu = (menuName) => {
    if (isCollapsed) return;
    setOpenSubmenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, GIF)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('profile_picture', file);
    const token = localStorage.getItem('userToken');

    try {
      const response = await axios.post(`${API_URL}/upload-profile`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setProfileImage(response.data.profile_picture_url);
        if (userData) {
          const updatedUser = { ...userData, profile_picture_url: response.data.profile_picture_url };
          setUserData(updatedUser);
          localStorage.setItem('userData', JSON.stringify(updatedUser));
        }
        setShowUploadModal(false);
        alert('Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const removeProfileImage = async () => {
    const token = localStorage.getItem('userToken');

    try {
      await axios.delete(`${API_URL}/remove-profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProfileImage(null);
      if (userData) {
        const updatedUser = { ...userData, profile_picture_url: null };
        setUserData(updatedUser);
        localStorage.setItem('userData', JSON.stringify(updatedUser));
      }
      setShowUploadModal(false);
      alert('Profile picture removed successfully');
    } catch (error) {
      console.error('Remove error:', error);
      alert('Failed to remove profile picture');
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    navigate('/');
  };

  const getUserDisplayName = () => {
    try {
      const storedUser = localStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return `${user.first_name || 'Admin'} ${user.last_name || 'User'}`;
      }
    } catch (e) {
      console.error('Error parsing user data', e);
    }
    return 'Admin User';
  };

  const getAdminRole = () => {
    try {
      const storedUser = localStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user.role || 'Administrator';
      }
    } catch (e) {
      return 'Administrator';
    }
    return 'Administrator';
  };

  const getInitials = () => {
    try {
      const storedUser = localStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.first_name && user.last_name) {
          return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
        }
      }
    } catch (e) {
      return 'AD';
    }
    return 'AD';
  };

  const adminName = getUserDisplayName();
  const adminRole = getAdminRole();

  // Helper to format days without decimals
  const formatDays = (days) => {
    if (days === undefined || days === null) return '';
    return Math.floor(days);
  };

  // Birthday icons and colors
  const getBirthdayIcon = (role) => {
    switch(role) {
      case 'Student': return <GraduationCap size={12} className="text-emerald-400" />;
      case 'Teacher': return <BookOpen size={12} className="text-blue-400" />;
      case 'Admin': return <ShieldCheck size={12} className="text-purple-400" />;
      default: return <Star size={12} className="text-yellow-400" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  // Open modal with specific type
  const openBirthdayModal = (type) => {
    setModalType(type);
    setShowBirthdayModal(true);
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutGrid size={18} /> },
    { 
      name: 'User Management', icon: <Users size={18} />, submenu: true,
      children: [
        { name: 'Manage Teachers', path: '/admin/teachers', icon: <UserPlus size={16} /> },
        { name: 'Enroll Student', path: '/admin/students/enroll', icon: <UserCheck size={16} /> },
        { name: 'Student Records', path: '/admin/students', icon: <Users size={16} /> },
        { name: 'Student Status History', path: '/admin/students/history', icon: <Database size={16} />, badge: 'Audit' },
      ]
    },
    { 
      name: 'Academic Structure', icon: <School size={18} />, submenu: true,
      children: [
        { name: 'Grade Levels', path: '/admin/grade-levels', icon: <GraduationCap size={16} /> },
        { name: 'Sections', path: '/admin/sections', icon: <Users size={16} /> },
        { name: 'Subjects', path: '/admin/subjects', icon: <BookOpen size={16} /> },
        { name: 'Rooms', path: '/admin/rooms', icon: <LayoutGrid size={16} /> },
        { name: 'Teacher Assignments', path: '/admin/teacher-assignments', icon: <Briefcase size={16} /> },
      ]
    },
    { 
      name: 'School Year', icon: <Calendar size={18} />, submenu: true,
      children: [
        { name: 'Manage School Years', path: '/admin/school-years', icon: <Calendar size={16} /> },
        { name: 'Manage Quarters', path: '/admin/quarters', icon: <Clock size={16} /> },
        { name: 'Set Active Term', path: '/admin/active-term', icon: <Activity size={16} /> },
      ]
    },
    { 
      name: 'Grading System', icon: <FileText size={18} />, submenu: true,
      children: [
        { name: 'Grade Approvals', path: '/admin/grade-approvals', icon: <CheckCircle size={16} /> },
        { name: 'View All Grades', path: '/admin/grades', icon: <Database size={16} /> },
        { name: 'Grade Reports', path: '/admin/grades/reports', icon: <Download size={16} /> },
      ]
    },
    { 
      name: 'Attendance', icon: <QrCode size={18} />, submenu: true,
      children: [
        { name: 'Generate QR Codes', path: '/admin/qr/generate', icon: <QrCode size={16} /> },
        { name: 'View Attendance', path: '/admin/attendance', icon: <Activity size={16} /> },
        { name: 'Attendance Reports', path: '/admin/attendance/reports', icon: <Download size={16} /> },
      ]
    },
    { 
      name: 'Enrollment', icon: <UserCheck size={18} />, submenu: true,
      children: [
        { name: 'Active Enrollments', path: '/admin/enrollments/active', icon: <Users size={16} /> },
        { name: 'Enrollment History', path: '/admin/enrollments/history', icon: <Database size={16} /> },
        { name: 'Bulk Enrollment', path: '/admin/enrollments/bulk', icon: <Download size={16} />, badge: 'Import' },
      ]
    },
    { 
      name: 'Announcement Management', icon: <Video size={18} />, submenu: true,
      children: [
        { name: 'Meetings', path: '/admin/meetings', icon: <MessageSquare size={16} /> },
      ]
    },
    { 
      name: 'Reports', icon: <PieChart size={18} />, submenu: true,
      children: [
        { name: 'Analytics Dashboard', path: '/admin/analytics', icon: <PieChart size={16} /> },
        { name: 'Student Performance', path: '/admin/reports/performance', icon: <TrendingUp size={16} /> },
        { name: 'Enrollment Reports', path: '/admin/reports/enrollment', icon: <Users size={16} /> },
        { name: 'Graduation Reports', path: '/admin/reports/graduation', icon: <Award size={16} /> },
        { name: 'Audit Logs', path: '/admin/audit-logs', icon: <Database size={16} />, badge: 'Activity' },
      ]
    },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={18} /> },
    { name: 'System Health', path: '/admin/system-health', icon: <AlertCircle size={18} />, badge: 'Monitor' },
  ];

  const isActive = (path) => location.pathname === path;

  const renderMenuItem = (item) => {
    const active = item.path && isActive(item.path);
    
    if (item.submenu) {
      return (
        <div key={item.name} className="submenu-container">
          <button
            onClick={() => toggleSubmenu(item.name)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group ${
              openSubmenus[item.name] 
                ? 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white' 
                : 'text-indigo-200/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`transition-colors ${openSubmenus[item.name] ? 'text-indigo-300' : 'group-hover:text-indigo-300'}`}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="text-xs tracking-wide">{item.name}</span>}
            </div>
            {!isCollapsed && (
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-200 ${openSubmenus[item.name] ? 'rotate-180' : ''}`}
              />
            )}
          </button>
          
          {!isCollapsed && openSubmenus[item.name] && (
            <div className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-2">
              {item.children.map(child => (
                <Link
                  key={child.name}
                  to={child.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                    isActive(child.path)
                      ? 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white'
                      : 'text-indigo-200/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-indigo-300/70">{child.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span className="text-xs">{child.name}</span>
                      {child.badge && (
                        <span className="ml-auto text-[8px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 px-1.5 py-0.5 rounded-full text-white shadow-sm">
                          {child.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <Link
        key={item.name}
        to={item.path}
        className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all duration-200 group ${
          active 
            ? 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-indigo-400/30 shadow-lg backdrop-blur-sm' 
            : 'text-indigo-200/70 hover:text-white hover:bg-white/10 backdrop-blur-sm'
        }`}
      >
        {active && !isCollapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-indigo-400 to-purple-400 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
        )}
        
        <span className={`transition-colors ${active ? 'text-indigo-300' : 'group-hover:text-indigo-300'}`}>
          {item.icon}
        </span>
        {!isCollapsed && <span className="text-xs tracking-wide">{item.name}</span>}
        
        {item.badge && !isCollapsed && (
          <span className="ml-auto text-[8px] font-bold bg-gradient-to-r from-indigo-500 to-purple-500 px-1.5 py-0.5 rounded-full text-white shadow-sm">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full bg-gradient-to-br from-[#1E1B4B] via-[#2D2A5A] to-[#0F0C3F] flex flex-col shadow-2xl border-r border-white/10 backdrop-blur-sm transition-all duration-300 z-50 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 z-50 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-1.5 shadow-lg transition-all duration-300 hover:scale-110"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        
        {/* Logo Section */}
        <div className={`relative px-4 pt-6 mb-6 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="relative w-10 h-10 flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-xl blur-md opacity-60"></div>
              <div className="relative w-full h-full bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg overflow-hidden border border-white/20">
                <img src={lesLogo} alt="School Logo" className="w-8 h-8 object-contain" />
              </div>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight drop-shadow-md">Laguindingan Central School</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <p className="text-[8px] font-medium text-indigo-200/80 uppercase tracking-wider">Admin Portal</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 relative z-10 overflow-y-auto">
          <div className="h-full overflow-y-auto custom-scrollbar pb-4">
            {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold text-indigo-300/60 uppercase tracking-[0.2em]">Main Menu</p>}
            {menuItems.map(renderMenuItem)}
            {!isCollapsed && (
              <>
                <div className="my-4 px-3"><div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div></div>
                <p className="px-3 mb-2 text-[10px] font-bold text-indigo-300/60 uppercase tracking-[0.2em]">System Overview</p>
                <div className="px-3 space-y-2 mb-4">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-1.5 text-indigo-200/70 text-[10px]"><Users size={12} /><span>Total Students</span></div>
                    <span className="text-white font-bold text-xs">{systemStats.totalStudents}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-1.5 text-indigo-200/70 text-[10px]"><Briefcase size={12} /><span>Total Teachers</span></div>
                    <span className="text-white font-bold text-xs">{systemStats.totalTeachers}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-1.5 text-indigo-200/70 text-[10px]"><GraduationCap size={12} /><span>Active Sections</span></div>
                    <span className="text-white font-bold text-xs">{systemStats.activeSections}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-1.5 text-indigo-200/70 text-[10px]"><Calendar size={12} /><span>School Year</span></div>
                    <span className="text-white font-bold text-xs">{systemStats.schoolYear}</span>
                  </div>

                  {/* Today's Birthdays Section */}
                  {birthdayData.today.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Cake size={10} className="text-pink-400" />
                          <span className="text-[8px] font-bold text-pink-300/80 uppercase tracking-wider">🎂 Today's Birthdays</span>
                        </div>
                        {birthdayData.today.length > 3 && (
                          <button 
                            onClick={() => openBirthdayModal('today')}
                            className="flex items-center gap-0.5 text-[7px] font-medium text-indigo-300 hover:text-white transition-colors"
                          >
                            See All <ChevronRightIcon size={8} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {birthdayData.today.slice(0, 3).map((birthday, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-1.5 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30"
                          >
                            <div className="flex items-center gap-1.5">
                              {getBirthdayIcon(birthday.role)}
                              <div>
                                <p className="text-[9px] font-medium text-white">{birthday.name}</p>
                                <p className="text-[7px] text-indigo-300/70">
                                  {birthday.role === 'Student' ? birthday.grade_section : 
                                   birthday.role === 'Teacher' ? birthday.subject : birthday.position}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Gift size={8} className="text-pink-400" />
                              <span className="text-[8px] font-bold text-pink-300">Today!</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upcoming Birthdays Section (within 30 days, excluding today) */}
                  {birthdayData.upcoming.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Cake size={10} className="text-pink-400" />
                          <span className="text-[8px] font-bold text-pink-300/80 uppercase tracking-wider"> Upcoming Birthdays</span>
                        </div>
                        {birthdayData.upcoming.length > 3 && (
                          <button 
                            onClick={() => openBirthdayModal('upcoming')}
                            className="flex items-center gap-0.5 text-[7px] font-medium text-indigo-300 hover:text-white transition-colors"
                          >
                            See All <ChevronRightIcon size={8} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {birthdayData.upcoming.slice(0, 3).map((birthday, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-1.5 rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20"
                          >
                            <div className="flex items-center gap-1.5">
                              {getBirthdayIcon(birthday.role)}
                              <div>
                                <p className="text-[9px] font-medium text-white">{birthday.name}</p>
                                <p className="text-[7px] text-indigo-300/70">
                                  {birthday.role === 'Student' ? birthday.grade_section : 
                                   birthday.role === 'Teacher' ? birthday.subject : birthday.position}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Gift size={8} className="text-pink-400" />
                              <span className="text-[8px] font-bold text-pink-300">
                                in {formatDays(birthday.days_until)}d
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Profile Section */}
        <div className="p-3 mt-auto border-t border-white/10">
          {!isCollapsed && (
            <div className="mb-3 p-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm rounded-lg border border-indigo-400/30">
              <div className="flex items-center gap-1.5 text-indigo-200/80 text-[10px] font-medium"><Calendar size={10} /><span>Current Term</span></div>
              <p className="text-white text-xs font-medium mt-0.5">📚 {systemStats.currentTerm}</p>
            </div>
          )}
          
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20 shadow-lg">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} mb-2 pb-2 border-b border-white/20`}>
              <div className="relative flex-shrink-0 group">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {getInitials()}
                  </div>
                )}
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-indigo-500 hover:bg-indigo-600 rounded-full flex items-center justify-center transition-all duration-200 border border-white/50"
                >
                  <Camera size={7} className="text-white" />
                </button>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-[#1E1B4B] animate-pulse"></div>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{adminName}</p>
                  <p className="text-[8px] text-indigo-300/70 font-medium truncate">{adminRole}</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center justify-between mb-2 p-1.5 rounded-md bg-white/5">
                <div className="flex items-center gap-1"><ShieldCheck size={10} className="text-indigo-300" /><span className="text-[8px] text-indigo-200/70">Role</span></div>
                <span className="text-[8px] text-white font-medium">{adminRole}</span>
              </div>
            )}

            <button 
              onClick={handleLogoutClick}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-all group border border-red-500/30 backdrop-blur-sm`}
            >
              <div className="flex items-center gap-1.5"><LogOut size="12" />{!isCollapsed && <span className="text-[10px] font-semibold uppercase tracking-wide">Sign Out</span>}</div>
              {!isCollapsed && <ChevronRight size="10" className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />}
            </button>
          </div>
          
          <div className="mt-2 flex items-center justify-center gap-1">
            <div className="w-1 h-1 rounded-full bg-indigo-400/50"></div>
            <p className="text-center text-[8px] text-indigo-300/40 tracking-wider">{isCollapsed ? 'v4.2' : 'LES Portal v4.2.0'}</p>
            <div className="w-1 h-1 rounded-full bg-indigo-400/50"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 transition-all duration-300 bg-gray-50 min-h-screen" style={{ marginLeft: isCollapsed ? '5rem' : '18rem' }}>
        {children}
      </div>

      {/* Birthday Modal - Dynamic based on type */}
      {showBirthdayModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-[#1E1B4B] to-[#2D2A5A] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-white/20">
            <div className="flex items-center justify-between p-5 border-b border-white/20">
              <div className="flex items-center gap-2">
                <Cake size={20} className="text-pink-400" />
                <h3 className="text-white font-bold text-lg">
                  {modalType === 'today' ? "Today's Birthdays" : "Upcoming Birthdays"}
                </h3>
                {modalType === 'upcoming' && (
                  <span className="text-xs text-pink-300">(next 30 days)</span>
                )}
              </div>
              <button onClick={() => setShowBirthdayModal(false)} className="text-indigo-300 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              {(modalType === 'today' ? birthdayData.today : birthdayData.upcoming).length > 0 ? (
                (modalType === 'today' ? birthdayData.today : birthdayData.upcoming).map((birthday, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                        {getBirthdayIcon(birthday.role)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{birthday.name}</p>
                        <p className="text-[10px] text-indigo-300/70">
                          {birthday.role === 'Student' ? birthday.grade_section : 
                           birthday.role === 'Teacher' ? birthday.subject : birthday.position}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-pink-300 font-medium">
                        {modalType === 'today' ? '🎉 Today!' : `in ${formatDays(birthday.days_until)} days`}
                      </p>
                      <p className="text-[9px] text-indigo-400">
                        {formatDate(birthday.birthdate)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Cake size={40} className="text-indigo-400 mx-auto mb-3" />
                  <p className="text-indigo-300">
                    {modalType === 'today' ? 'No birthdays today' : 'No upcoming birthdays in the next 30 days'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-white/20 bg-white/5">
              <div className="flex items-center justify-between text-[10px] text-indigo-300">
                <span>Total: {(modalType === 'today' ? birthdayData.today : birthdayData.upcoming).length} celebrants</span>
                <span>{modalType === 'today' ? '🎂 Happy Birthday!' : 'Sorted by upcoming date'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-gradient-to-br from-[#1E1B4B] to-[#2D2A5A] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Upload Profile Picture</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-indigo-300 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <div className="flex justify-center mb-4">
              <div className="relative">
                {profileImage ? (
                  <img src={profileImage} alt="Current Profile" className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-400 shadow-lg" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl">
                    {getInitials()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1"><Camera size={12} className="text-white" /></div>
              </div>
            </div>
            
            <p className="text-indigo-200 text-xs text-center mb-4">Upload a profile picture (JPEG, PNG, GIF). Max size 2MB.</p>
            
            <div className="space-y-3">
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl transition-all duration-200">
                <Upload size={16} /><span className="text-sm font-medium">Choose Image</span>
              </button>
              {profileImage && (
                <button onClick={removeProfileImage} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl transition-all duration-200 border border-red-500/30">
                  <X size={16} /><span className="text-sm font-medium">Remove Picture</span>
                </button>
              )}
            </div>
            
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            
            {uploading && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-indigo-200 text-xs">Uploading...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
        @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
};

export default Sidebar;