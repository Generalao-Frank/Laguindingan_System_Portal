import React, { useState, useEffect } from 'react';
import {
  Users, GraduationCap, BookOpen, TrendingUp, Award,
  PieChart as PieChartIcon, BarChart3, Loader2, ArrowUp, Clock, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import API_URL from '../config';

// --- Type Definitions ---
interface GenderItem {
  name: string;
  value: number;
  fill: string;
}

interface GradeLevelItem {
  grade: string;
  students: number;
}

interface EnrollmentTrendItem {
  month: string;
  enrolled: number;
}

interface AttendanceQuarterItem {
  quarter: string;
  present: number;
  late: number;
  absent: number;
  rate: number;
}

interface SubjectPerformanceItem {
  subject: string;
  avg: number;
}

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  activeEnrollments: number;
  enrollmentRate: number;
  attendanceRate: number;
  graduationRate: number;
}

interface DashboardResponse {
  success: boolean;
  stats: DashboardStats;
  genderData: GenderItem[];
  gradeLevelData: GradeLevelItem[];
  enrollmentTrend: EnrollmentTrendItem[];
  attendanceByQuarter: AttendanceQuarterItem[];
  subjectPerformance: SubjectPerformanceItem[];
  activeSchoolYear: string | null;
  activeQuarter: string | null;
}

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeEnrollments: 0,
    maleCount: 0,
    femaleCount: 0,
    thisMonthEnrollments: 0
  });
  const [enrollmentTrend, setEnrollmentTrend] = useState<{ year: string; count: number }[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeLevelItem[]>([]);
  const [genderData, setGenderData] = useState<GenderItem[]>([]);
  const [attendanceData, setAttendanceData] = useState<{ month: string; present: number; absent: number }[]>([]);
  const [topSubjects, setTopSubjects] = useState<{ subject: string; avg: number }[]>([]);

  const token = localStorage.getItem('userToken');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get<DashboardResponse>(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const data = response.data;

        // Extract male/female counts
        const maleCount = data.genderData?.find((g: GenderItem) => g.name === 'Male')?.value || 0;
        const femaleCount = data.genderData?.find((g: GenderItem) => g.name === 'Female')?.value || 0;

        // Current month's enrollments from enrollmentTrend
        const currentMonthIndex = new Date().getMonth();
        const thisMonthEnrollments = data.enrollmentTrend?.[currentMonthIndex]?.enrolled || 0;

        setStats({
          totalStudents: data.stats.totalStudents,
          totalTeachers: data.stats.totalTeachers,
          activeEnrollments: data.stats.activeEnrollments,
          maleCount,
          femaleCount,
          thisMonthEnrollments
        });

        // Enrollment trend: map month names to year field for AreaChart
        const trend = (data.enrollmentTrend || []).map((item: EnrollmentTrendItem) => ({
          year: item.month,
          count: item.enrolled
        }));
        setEnrollmentTrend(trend);

        // Grade distribution
        setGradeDistribution(data.gradeLevelData || []);

        // Gender data
        setGenderData(data.genderData || []);

        // Attendance data: map quarter to month and take present/absent counts
        const attendance = (data.attendanceByQuarter || []).map((q: AttendanceQuarterItem) => ({
          month: q.quarter,
          present: q.present,
          absent: q.absent
        }));
        setAttendanceData(attendance);

        // Top subjects
        setTopSubjects(data.subjectPerformance || []);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to load data from server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={40} />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !stats.totalStudents) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-800">Connection Error</h2>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <PieChartIcon size={24} className="text-indigo-600" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-500 text-sm">School performance overview based on enrollment, attendance, and grades</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Total Students</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalStudents}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Total Teachers</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalTeachers}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <GraduationCap size={20} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Active Enrollments</p>
                <p className="text-2xl font-bold text-gray-800">{stats.activeEnrollments}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BookOpen size={20} className="text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <ArrowUp size={12} /> +{stats.thisMonthEnrollments} this month
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Male / Female</p>
                <p className="text-2xl font-bold text-gray-800">{stats.maleCount} / {stats.femaleCount}</p>
              </div>
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-pink-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500" />
              Enrollment Trend ({new Date().getFullYear()})
            </h3>
            {enrollmentTrend.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#93C5FD" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data</div>
            )}
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <PieChartIcon size={18} className="text-pink-500" />
              Gender Distribution
            </h3>
            {genderData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => {
                      const percentage = percent ? (percent * 100).toFixed(0) : 0;
                      return `${name} ${percentage}%`;
                    }}
                  >
                    {genderData.map((entry, idx) => (
                      <Cell 
                        key={`cell-${idx}`} 
                        fill={entry.fill || COLORS[idx % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data</div>
            )}
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <BarChart3 size={18} className="text-green-500" />
              Students per Grade Level
            </h3>
            {gradeDistribution.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="students" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data</div>
            )}
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Clock size={18} className="text-orange-500" />
              Attendance by Quarter
            </h3>
            {attendanceData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#3B82F6" strokeWidth={2} name="Present" />
                  <Line type="monotone" dataKey="absent" stroke="#EF4444" strokeWidth={2} name="Absent" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data</div>
            )}
          </div>
        </div>

        {/* Row 3 - Top Subjects */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Award size={18} className="text-yellow-500" />
            Top Performing Subjects (Average Final Grade)
          </h3>
          {topSubjects.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-gray-600">Subject</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-600">Average Grade</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-600">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topSubjects.map((subject, idx) => {
                    const grade = subject.avg;
                    let colorClass = 'text-green-600';
                    if (grade < 75) colorClass = 'text-red-600';
                    else if (grade < 85) colorClass = 'text-yellow-600';
                    return (
                      <tr key={idx}>
                        <td className="p-3 text-sm font-medium text-gray-800">{subject.subject}</td>
                        <td className={`p-3 text-sm font-semibold ${colorClass}`}>{grade}%</td>
                        <td className="p-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${grade}%` }}></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400">No grade data yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;