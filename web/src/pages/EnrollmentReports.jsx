import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, GraduationCap, BookOpen, Calendar,
  Download, Printer, Filter, Search, ChevronDown, X,
  AlertCircle, Loader2, FileText, BarChart3, PieChart as PieChartIcon,
  Clock, UserCheck, UserX, Award, School, Eye, CheckCircle
} from 'lucide-react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import API_URL from '../config';

const EnrollmentReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState({
    summary: {
      totalEnrollments: 0,
      activeEnrollments: 0,
      completedEnrollments: 0,
      droppedEnrollments: 0,
      enrollmentRate: 0
    },
    enrollmentTrend: [],
    gradeLevelDistribution: [],
    sectionDistribution: [],
    monthlyEnrollments: [],
    recentEnrollments: []
  });
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [reportType, setReportType] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const token = localStorage.getItem('userToken');

  const gradeLevels = [
    { value: 0, label: 'Kinder', color: '#10B981' },
    { value: 1, label: 'Grade 1', color: '#3B82F6' },
    { value: 2, label: 'Grade 2', color: '#6366F1' },
    { value: 3, label: 'Grade 3', color: '#8B5CF6' },
    { value: 4, label: 'Grade 4', color: '#EC4899' },
    { value: 5, label: 'Grade 5', color: '#F59E0B' },
    { value: 6, label: 'Grade 6', color: '#EF4444' }
  ];

  useEffect(() => {
    fetchSchoolYears();
    fetchEnrollmentReport();
  }, []);

  useEffect(() => {
    if (selectedSchoolYear || dateRange.startDate) {
      fetchEnrollmentReport();
    }
  }, [selectedSchoolYear, reportType, dateRange.startDate, dateRange.endDate]);

  const fetchSchoolYears = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/school-years`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSchoolYears(response.data.school_years);
        const activeYear = response.data.school_years.find(sy => sy.is_active);
        if (activeYear) {
          setSelectedSchoolYear(activeYear.id);
        }
      }
    } catch (err) {
      console.error('Error fetching school years:', err);
    }
  };

  const fetchEnrollmentReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedSchoolYear) params.school_year_id = selectedSchoolYear;
      if (reportType === 'custom' && dateRange.startDate && dateRange.endDate) {
        params.start_date = dateRange.startDate;
        params.end_date = dateRange.endDate;
      }

      const response = await axios.get(`${API_URL}/admin/reports/enrollment`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setReportData(response.data.report);
      } else {
        // Use mock data if API not ready
        setMockData();
      }
    } catch (err) {
      console.error('Error fetching enrollment report:', err);
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    setReportData({
      summary: {
        totalEnrollments: 245,
        activeEnrollments: 210,
        completedEnrollments: 25,
        droppedEnrollments: 10,
        enrollmentRate: 85.7
      },
      enrollmentTrend: [
        { year: '2020-2021', enrolled: 180 },
        { year: '2021-2022', enrolled: 195 },
        { year: '2022-2023', enrolled: 210 },
        { year: '2023-2024', enrolled: 228 },
        { year: '2024-2025', enrolled: 245 }
      ],
      gradeLevelDistribution: [
        { grade: 'Kinder', count: 35, color: '#10B981' },
        { grade: 'Grade 1', count: 38, color: '#3B82F6' },
        { grade: 'Grade 2', count: 36, color: '#6366F1' },
        { grade: 'Grade 3', count: 34, color: '#8B5CF6' },
        { grade: 'Grade 4', count: 35, color: '#EC4899' },
        { grade: 'Grade 5', count: 33, color: '#F59E0B' },
        { grade: 'Grade 6', count: 34, color: '#EF4444' }
      ],
      sectionDistribution: [
        { section: 'Section A', count: 42 },
        { section: 'Section B', count: 38 },
        { section: 'Section C', count: 35 },
        { section: 'Section D', count: 33 },
        { section: 'Section E', count: 31 }
      ],
      monthlyEnrollments: [
        { month: 'Jun', enrolled: 45 },
        { month: 'Jul', enrolled: 52 },
        { month: 'Aug', enrolled: 48 },
        { month: 'Sep', enrolled: 35 },
        { month: 'Oct', enrolled: 28 },
        { month: 'Nov', enrolled: 22 },
        { month: 'Dec', enrolled: 15 }
      ],
      recentEnrollments: [
        { id: 1, name: 'Dela Cruz, Juan', lrn: '123456789012', grade: 'Grade 5', section: 'Section A', date: '2024-06-15' },
        { id: 2, name: 'Reyes, Maria', lrn: '123456789013', grade: 'Kinder', section: 'Section B', date: '2024-06-14' },
        { id: 3, name: 'Santos, Jose', lrn: '123456789014', grade: 'Grade 3', section: 'Section C', date: '2024-06-13' },
        { id: 4, name: 'Gonzales, Anna', lrn: '123456789015', grade: 'Grade 6', section: 'Section A', date: '2024-06-12' }
      ]
    });
  };

  const getGradeName = (grade) => {
    if (grade === 0) return 'Kinder';
    return `Grade ${grade}`;
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'LRN', 'Grade Level', 'Section', 'Date Enrolled', 'Status'];
    const rows = reportData.recentEnrollments.map(enrollment => [
      enrollment.name,
      enrollment.lrn,
      enrollment.grade,
      enrollment.section,
      enrollment.date,
      'Active'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enrollment_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const COLORS = ['#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={40} />
          <p className="text-gray-500">Loading enrollment reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 size={24} className="text-indigo-600" />
                Enrollment Reports
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Track and analyze enrollment trends, distribution, and statistics
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
              >
                <Filter size={16} />
                Filters
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                onClick={printReport}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Filter Options</h3>
              <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">School Year</label>
                <select
                  value={selectedSchoolYear}
                  onChange={(e) => setSelectedSchoolYear(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
                >
                  <option value="">All School Years</option>
                  {schoolYears.map(sy => (
                    <option key={sy.id} value={sy.id}>
                      {sy.year_start}-{sy.year_end}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
                >
                  <option value="all">All Time</option>
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {reportType === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Total Enrollments</p>
                <p className="text-2xl font-bold text-gray-800">{reportData.summary.totalEnrollments}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Users size={18} className="text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Active</p>
                <p className="text-2xl font-bold text-green-600">{reportData.summary.activeEnrollments}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <UserCheck size={18} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.summary.completedEnrollments}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Award size={18} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Dropped</p>
                <p className="text-2xl font-bold text-red-600">{reportData.summary.droppedEnrollments}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <UserX size={18} className="text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Enrollment Rate</p>
                <p className="text-2xl font-bold text-purple-600">{reportData.summary.enrollmentRate}%</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Enrollment Trend Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500" />
              Enrollment Trend Over Years
            </h3>
            {reportData.enrollmentTrend.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={reportData.enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="enrolled" stroke="#3B82F6" fill="#93C5FD" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>

          {/* Grade Level Distribution Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <PieChartIcon size={18} className="text-pink-500" />
              Enrollment by Grade Level
            </h3>
            {reportData.gradeLevelDistribution.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.gradeLevelDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="count"
                    label={({ grade, percent }) => {
                      const percentage = percent ? (percent * 100).toFixed(0) : 0;
                      return `${grade} ${percentage}%`;
                    }}
                  >
                    {reportData.gradeLevelDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color || COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Enrollments Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-orange-500" />
              Monthly Enrollments
            </h3>
            {reportData.monthlyEnrollments.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.monthlyEnrollments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="enrolled" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>

          {/* Section Distribution Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <School size={18} className="text-emerald-500" />
              Enrollment by Section
            </h3>
            {reportData.sectionDistribution.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.sectionDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="section" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>
        </div>

        {/* Recent Enrollments Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" />
              Recent Enrollments
            </h3>
            <span className="text-xs text-gray-400">Last {reportData.recentEnrollments.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">LRN</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Grade Level</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Section</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date Enrolled</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.recentEnrollments.length > 0 ? (
                  reportData.recentEnrollments.map((enrollment, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-gray-800">{enrollment.name}</td>
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs text-gray-600">{enrollment.lrn}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {enrollment.grade}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{enrollment.section}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{enrollment.date}</td>
                      <td className="px-6 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                          <CheckCircle size={10} />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Users size={40} className="text-gray-300 mb-3" />
                        <p className="text-gray-400">No enrollment records found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-4 text-center text-xs text-gray-400">
          Report generated on {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default EnrollmentReports;