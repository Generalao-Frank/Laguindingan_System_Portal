import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, GraduationCap, Calendar, Award, Download,
  Printer, Filter, Search, ChevronDown, X, AlertCircle, Loader2,
  BarChart3, PieChart as PieChartIcon, Clock, UserCheck, School,
  Star, Trophy, Target, CheckCircle, XCircle, Eye, FileText
} from 'lucide-react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import API_URL from '../config';

const GraduationReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState({
    summary: {
      totalGraduates: 0,
      totalEnrollments: 0,
      graduationRate: 0,
      maleGraduates: 0,
      femaleGraduates: 0,
      withHonors: 0,
      withHighHonors: 0,
      withHighestHonors: 0
    },
    yearlyGraduationTrend: [],
    gradeLevelCompleters: [],
    sectionBreakdown: [],
    honorDistribution: [],
    recentGraduates: [],
    topPerformers: []
  });
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [reportType, setReportType] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGraduate, setSelectedGraduate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const token = localStorage.getItem('userToken');

  const honorColors = {
    'With Highest Honors': '#F59E0B',
    'With High Honors': '#10B981',
    'With Honors': '#3B82F6',
    'Regular Graduate': '#6B7280'
  };

  useEffect(() => {
    fetchSchoolYears();
    fetchGraduationReport();
  }, []);

  useEffect(() => {
    fetchGraduationReport();
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

  const fetchGraduationReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedSchoolYear) params.school_year_id = selectedSchoolYear;
      if (reportType === 'custom' && dateRange.startDate && dateRange.endDate) {
        params.start_date = dateRange.startDate;
        params.end_date = dateRange.endDate;
      }

      const response = await axios.get(`${API_URL}/admin/reports/graduation`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setReportData(response.data.report);
      } else {
        setMockData();
      }
    } catch (err) {
      console.error('Error fetching graduation report:', err);
      setMockData();
    } finally {
      setLoading(false);
    }
  };


  const exportToCSV = () => {
    const headers = ['Student Name', 'LRN', 'Section', 'Average Grade', 'Honor'];
    const rows = reportData.recentGraduates.map(graduate => [
      graduate.name,
      graduate.lrn,
      graduate.section,
      graduate.average,
      graduate.honor
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graduation_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const viewGraduateDetails = (graduate) => {
    setSelectedGraduate(graduate);
    setShowDetailModal(true);
  };

  const getHonorBadge = (honor) => {
    switch (honor) {
      case 'With Highest Honors':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><Star size={10} /> Highest Honors</span>;
      case 'With High Honors':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"><Trophy size={10} /> High Honors</span>;
      case 'With Honors':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 flex items-center gap-1"><Award size={10} /> Honors</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Regular Graduate</span>;
    }
  };

  const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#6B7280'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={40} />
          <p className="text-gray-500">Loading graduation reports...</p>
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
                <Trophy size={24} className="text-amber-500" />
                Graduation Reports
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Track graduation rates, completers, and academic honors
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Total Graduates</p>
                <p className="text-2xl font-bold text-gray-800">{reportData.summary.totalGraduates}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Award size={18} className="text-amber-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Graduation Rate</p>
                <p className="text-2xl font-bold text-green-600">{reportData.summary.graduationRate}%</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Target size={18} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Male / Female</p>
                <p className="text-2xl font-bold text-gray-800">{reportData.summary.maleGraduates} / {reportData.summary.femaleGraduates}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users size={18} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">With Honors</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.summary.withHonors}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Award size={18} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">High Honors</p>
                <p className="text-2xl font-bold text-emerald-600">{reportData.summary.withHighHonors}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Trophy size={18} className="text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Highest Honors</p>
                <p className="text-2xl font-bold text-amber-600">{reportData.summary.withHighestHonors}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Star size={18} className="text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Graduation Trend Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500" />
              Graduation Trend Over Years
            </h3>
            {reportData.yearlyGraduationTrend.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.yearlyGraduationTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="graduates" stroke="#3B82F6" strokeWidth={2} name="Graduates" />
                  <Line type="monotone" dataKey="enrollment" stroke="#F59E0B" strokeWidth={2} name="Enrollment" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>

          {/* Honor Distribution Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <PieChartIcon size={18} className="text-pink-500" />
              Honor Distribution
            </h3>
            {reportData.honorDistribution.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.honorDistribution}
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
                    {reportData.honorDistribution.map((entry, idx) => (
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
          {/* Section Breakdown Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <School size={18} className="text-emerald-500" />
              Graduation by Section
            </h3>
            {reportData.sectionBreakdown.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.sectionBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="section" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completers" fill="#10B981" name="Completers" />
                  <Bar dataKey="total" fill="#F59E0B" name="Total Enrolled" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>

          {/* Grade Level Completers Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <GraduationCap size={18} className="text-purple-500" />
              Completion Rate by Grade Level
            </h3>
            {reportData.gradeLevelCompleters.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.gradeLevelCompleters}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completers" fill="#8B5CF6" name="Completers" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>
        </div>

        {/* Top Performers Section */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-yellow-50">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Star size={16} className="text-amber-500" />
              Top Performers (With Honors)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rank</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">LRN</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Average Grade</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Honor</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.topPerformers.length > 0 ? (
                  reportData.topPerformers.map((performer, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' :
                          idx === 1 ? 'bg-gray-100 text-gray-600' :
                          idx === 2 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                        }`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-800">{performer.name}</td>
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs text-gray-600">{performer.lrn}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-semibold text-gray-800">{performer.average}%</span>
                      </td>
                      <td className="px-6 py-3">{getHonorBadge(performer.honor)}</td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => viewGraduateDetails(performer)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye size={13} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Users size={40} className="text-gray-300 mb-3" />
                        <p className="text-gray-400">No top performers data available</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Graduates Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" />
              Recent Graduates
            </h3>
            <span className="text-xs text-gray-400">{reportData.recentGraduates.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">LRN</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Section</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Average Grade</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Honor</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.recentGraduates.length > 0 ? (
                  reportData.recentGraduates.map((graduate, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-gray-800">{graduate.name}</td>
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs text-gray-600">{graduate.lrn}</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{graduate.section}</td>
                      <td className="px-6 py-3">
                        <span className="font-semibold text-gray-800">{graduate.average}%</span>
                      </td>
                      <td className="px-6 py-3">{getHonorBadge(graduate.honor)}</td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => viewGraduateDetails(graduate)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye size={13} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Users size={40} className="text-gray-300 mb-3" />
                        <p className="text-gray-400">No recent graduates found</p>
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

      {/* Graduate Detail Modal */}
      {showDetailModal && selectedGraduate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Graduate Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <Award size={24} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{selectedGraduate.name}</p>
                  <p className="text-xs text-gray-500">LRN: {selectedGraduate.lrn}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Section</p>
                  <p className="text-sm font-medium text-gray-800">{selectedGraduate.section}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Average Grade</p>
                  <p className="text-sm font-medium text-gray-800">{selectedGraduate.average}%</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500">Honor Received</p>
                  <p className="text-sm font-medium text-amber-600">{selectedGraduate.honor}</p>
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-600 font-medium">Certificate of Recognition</p>
                <p className="text-xs text-amber-700 mt-1">
                  This graduate has successfully completed elementary education 
                  {selectedGraduate.honor !== 'Regular Graduate' ? ` with ${selectedGraduate.honor}` : ''}.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Generate certificate PDF functionality can be added here
                  alert('Certificate generation feature coming soon!');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
              >
                <FileText size={16} />
                Generate Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 shadow-lg">
          <AlertCircle size={20} className="text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default GraduationReports;