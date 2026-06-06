import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { 
  Users, TrendingUp, TrendingDown, Calendar, Award, Activity, 
  GraduationCap, School, UserCheck, Clock, Download, RefreshCw, 
  ChevronRight, Zap, Target, Globe, Star, UserPlus, AlertCircle, Loader,
  PlusCircle, Edit, Trash2, LogIn, LogOut, Upload, Move, MinusCircle, FileText
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSchoolYear, setActiveSchoolYear] = useState('');
  const [activeQuarter, setActiveQuarter] = useState('');
  
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalSections: 0,
    activeEnrollments: 0,
    enrollmentRate: 0,
    attendanceRate: 0,
    graduationRate: 0,
  });

  const [gradeLevelData, setGradeLevelData] = useState([]);
  const [enrollmentData, setEnrollmentData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentEnrollments, setRecentEnrollments] = useState([]);

  const token = localStorage.getItem('userToken');

  // Helper para mag-render ng Lucide Icon base sa enum action_type ng migration mo
  const getActivityIcon = (actionType) => {
    switch (actionType) {
      case 'CREATE': return <PlusCircle size={14} />;
      case 'UPDATE': return <Edit size={14} />;
      case 'DELETE': return <Trash2 size={14} />;
      case 'LOGIN': return <LogIn size={14} />;
      case 'LOGOUT': return <LogOut size={14} />;
      case 'UPLOAD': return <Upload size={14} />;
      case 'TRANSFER': return <Move size={14} />;
      case 'ENROLL': return <UserPlus size={14} />;
      case 'DROP': return <MinusCircle size={14} />;
      case 'GRADE_UPDATE': return <FileText size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Isang bagsakang tawag sa bagong controller endpoint mo
      const response = await axios.get(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const data = response.data;
        
        setStats(data.stats);
        setGradeLevelData(data.gradeLevelData);
        setEnrollmentData(data.enrollmentTrend);
        setAttendanceData(data.attendanceByQuarter);
        setSubjectPerformance(data.subjectPerformance);
        setActiveSchoolYear(data.activeSchoolYear || 'N/A');
        setActiveQuarter(data.activeQuarter || 'N/A');
        setRecentEnrollments(data.recentEnrollments);

        // Map ang dynamic icons nang hindi nawawala ang logs fields galing backend
        if (data.recentActivities) {
          setRecentActivities(data.recentActivities.map(log => ({
            ...log,
            // Pinapanatili natin ang orihinal na structure (id, user, summary/action, time)
            // At nagse-set lang ng hiwalay na UI element para sa icon render
            renderIcon: getActivityIcon(log.icon || log.action_type)
          })));
        }
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const COLORS = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

  // Safe Tailwind map para maiwasan ang mga isyu sa dynamic class interpolation
  const cardColorMap = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }) => {
    const colorClasses = cardColorMap[color] || cardColorMap.indigo;
    
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses.bg}`}>
            <Icon className={colorClasses.text} size={24} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
              {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span className="text-xs font-semibold">{trendValue}</span>
            </div>
          )}
        </div>
        <h3 className="text-2xl font-bold text-gray-800">
          {loading ? <Loader size={20} className="animate-spin" /> : value}
        </h3>
        <p className="text-sm text-gray-500 mt-1 font-medium">{title}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center text-red-600">
          <AlertCircle size={48} className="mx-auto mb-4" />
          <p className="font-semibold">{error}</p>
          <button onClick={fetchDashboardData} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
        <div className="max-w-[1600px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Welcome back, Administrator! Here's your school overview.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchDashboardData} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh Data">
                <RefreshCw size={18} className="text-gray-500" />
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                <Download size={16} />
                <span className="text-sm font-medium">Export Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Students" value={stats.totalStudents.toLocaleString()} icon={Users} trend="up" trendValue="+12%" color="indigo" />
          <StatCard title="Total Teachers" value={stats.totalTeachers} icon={GraduationCap} trend="up" trendValue="+5%" color="purple" />
          <StatCard title="Active Sections" value={stats.totalSections} icon={School} trend="up" trendValue="+2" color="emerald" />
          <StatCard title="Enrollment Rate" value={`${stats.enrollmentRate}%`} icon={UserCheck} trend="up" trendValue="+8%" color="blue" />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-lg p-2"><Target size={20} /></div>
              <Zap size={20} className="opacity-80" />
            </div>
            <p className="text-3xl font-bold">{stats.attendanceRate}%</p>
            <p className="text-indigo-100 text-sm mt-1">Average Attendance Rate</p>
            <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${stats.attendanceRate}%` }}></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-lg p-2"><Award size={20} /></div>
              <Star size={20} className="opacity-80" />
            </div>
            <p className="text-3xl font-bold">{stats.graduationRate}%</p>
            <p className="text-emerald-100 text-sm mt-1">Graduation Rate</p>
            <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${stats.graduationRate}%` }}></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-lg p-2"><Globe size={20} /></div>
              <ChevronRight size={20} className="opacity-80" />
            </div>
            <p className="text-3xl font-bold">SY {activeSchoolYear}</p>
            <p className="text-amber-100 text-sm mt-1">Current School Year</p>
            <p className="text-xs text-amber-100/90 font-semibold mt-2 bg-white/20 inline-block px-2 py-0.5 rounded-md">
              {activeQuarter || 'No Active Quarter'}
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Enrollment Trend */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Enrollment Trend</h3>
                <p className="text-xs text-gray-500 mt-1">Monthly registration numbers for current year</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                <span className="text-xs text-gray-600 font-medium">Enrolled</span>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="enrolled" stroke="#6366F1" fill="#6366F1" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grade Level Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Grade Level Distribution</h3>
                <p className="text-xs text-gray-500 mt-1">Active students count per level</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeLevelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="grade" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="students" fill="#8B5CF6" radius={[6, 6, 0, 0]} barSize={45}>
                    {gradeLevelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Subject Performance & Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Subject Performance */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Top Performing Subjects</h3>
                <p className="text-xs text-gray-500 mt-1">Average general final grades across levels</p>
              </div>
            </div>
            <div className="space-y-5">
              {subjectPerformance.length > 0 ? (
                subjectPerformance.map((sub, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold text-gray-700">{sub.subject}</span>
                      <span className="font-bold text-indigo-600">{sub.avg}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${sub.avg}%` }}></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No grading records found.</p>
              )}
            </div>
          </div>

          {/* Attendance Rate by Quarter */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Attendance Log Breakdown</h3>
                <p className="text-xs text-gray-500 mt-1">Total count records comparison per quarter</p>
              </div>
              <Clock size={18} className="text-gray-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="quarter" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="present" stackId="a" fill="#10B981" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="late" stackId="a" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="absent" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs text-gray-600 font-medium">Present</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-xs text-gray-600 font-medium">Late</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div><span className="text-xs text-gray-600 font-medium">Absent</span></div>
            </div>
          </div>
        </div>

        {/* Recent Activities & Enrollments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h3 className="text-lg font-semibold text-gray-800">Recent System Logs</h3><p className="text-xs text-gray-500 mt-1">Live audit trail activities</p></div>
              <Activity size={18} className="text-gray-400" />
            </div>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                      {activity.renderIcon}
                    </div>
                    <div className="flex-1">
                      {/* Dito natin pinalitan: Inuna natin i-render ang kumpletong log text/summary galing backend */}
                      <p className="text-sm font-medium text-gray-800">
                        {activity.summary || activity.action || "System event occurred"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 font-semibold">User ID: {activity.user_id || activity.user}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-xs text-gray-400">{activity.time || activity.created_at}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 self-center" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No recent logs recorded.</p>
              )}
            </div>
          </div>

          {/* Recent Enrollments */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h3 className="text-lg font-semibold text-gray-800">Recent Enrollments</h3><p className="text-xs text-gray-500 mt-1">Latest student section assignments</p></div>
              <UserPlus size={18} className="text-gray-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Name</th>
                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">LRN</th>
                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade & Section</th>
                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentEnrollments.length > 0 ? (
                    recentEnrollments.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 text-sm font-medium text-gray-800">{student.name}</td>
                        <td className="py-3 text-xs text-gray-500 font-mono">{student.lrn}</td>
                        <td className="py-3 text-sm text-gray-600">{student.grade} - {student.section}</td>
                        <td className="py-3 text-xs text-gray-400 font-medium">{student.date}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-sm text-gray-400 text-center py-8">No active enrollments for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">© 2026 Laguindingan Central School - Admin Portal. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400 font-medium">Last synced: {new Date().toLocaleTimeString()}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-gray-400 font-semibold">Gateway Live</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;