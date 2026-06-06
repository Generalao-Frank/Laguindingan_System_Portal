import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Download, Printer, Filter, Users, 
  GraduationCap, Clock, CheckCircle, XCircle, AlertCircle,
  Loader2, ChevronRight, Eye, TrendingUp, Award, BarChart3,
  Activity, UserCheck, UserX, Zap, Target, FileText,
  PieChart as PieChartIcon, LineChart as LineChartIcon,
  RefreshCw, Info, X
} from 'lucide-react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import API_URL from '../config';

const AttendanceReport = () => {
  const navigate = useNavigate();
  const [schoolYears, setSchoolYears] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [sections, setSections] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [selectedGradeLevelFilter, setSelectedGradeLevelFilter] = useState('');
  const [selectedSection, setSelectedSection] = useState(null);
  const [reportType, setReportType] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  const token = localStorage.getItem('userToken');

  // Format date function - converts ISO date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // I‑filter ang mga section ayon sa napiling grade level
  const filteredSectionsByGrade = sections.filter(
    sec => sec.grade_level === parseInt(selectedGradeLevelFilter)
  );

  useEffect(() => {
    fetchSchoolYears();
    fetchGradeLevels();
    setStartDate(getDefaultStartDate());
    setEndDate(getDefaultEndDate());
  }, []);

  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const fetchSchoolYears = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/school-years`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSchoolYears(response.data.school_years);
        const active = response.data.school_years.find(sy => sy.is_active);
        if (active) {
          setSelectedSchoolYear(active);
          fetchQuarters(active.id);
        }
      }
    } catch (error) {
      console.error('Error fetching school years:', error);
    }
  };

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
      // Fallback
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

  const fetchQuarters = async (schoolYearId) => {
    try {
      const response = await axios.get(`${API_URL}/admin/school-years/${schoolYearId}/quarters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setQuarters(response.data.quarters);
      }
    } catch (error) {
      console.error('Error fetching quarters:', error);
    }
  };

  const fetchSections = async () => {
    if (!selectedSchoolYear) return;
    
    try {
      const response = await axios.get(`${API_URL}/admin/sections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        const filtered = response.data.sections.filter(s => s.school_year_id === selectedSchoolYear.id);
        setSections(filtered);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedSection) {
      setError('Please select a section');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const params = {
        section_id: selectedSection.id,
        report_type: reportType,
      };
      
      if (reportType === 'custom') {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      
      if (reportType === 'quarterly' && selectedQuarter) {
        params.quarter_id = selectedQuarter.id;
      }
      
      const response = await axios.get(`${API_URL}/admin/attendance/report`, {
        params,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setReportData(response.data.report);
      } else {
        setError(response.data.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to generate report';
      setError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Kapag nagbago ang school year, i‑refresh ang mga section at i‑reset ang grade level at section
  useEffect(() => {
    if (selectedSchoolYear) {
      fetchSections();
      setSelectedGradeLevelFilter('');
      setSelectedSection(null);
    }
  }, [selectedSchoolYear]);

  // Kapag nagbago ang grade level, i‑reset ang napiling section at ang reportData
  useEffect(() => {
    setSelectedSection(null);
    setReportData(null);
  }, [selectedGradeLevelFilter]);

  // Kapag may napiling section, awtomatikong bumuo ng report
  useEffect(() => {
    if (selectedSection) {
      generateReport();
    }
  }, [selectedSection, reportType, startDate, endDate, selectedQuarter]);

  const downloadCSV = () => {
    if (!reportData) return;
    
    let headers = [];
    let rows = [];
    
    if (reportType === 'daily' && reportData.dailyStats?.length > 0) {
      headers = ['Date', 'Present', 'Late', 'Absent', 'Attendance Rate (%)'];
      rows = reportData.dailyStats.map(day => [
        formatDate(day.date),
        day.present,
        day.late,
        day.absent,
        day.rate.toFixed(1)
      ]);
    } else if ((reportType === 'weekly' || reportType === 'quarterly') && reportData.weeklyStats?.length > 0) {
      headers = ['Week', 'Present', 'Late', 'Absent', 'Attendance Rate (%)'];
      rows = reportData.weeklyStats.map(week => [
        week.week,
        week.present,
        week.late,
        week.absent,
        week.rate.toFixed(1)
      ]);
    } else if (reportType === 'monthly' && reportData.monthlyStats?.length > 0) {
      headers = ['Month', 'Present', 'Late', 'Absent', 'Attendance Rate (%)'];
      rows = reportData.monthlyStats.map(month => [
        month.month,
        month.present,
        month.late,
        month.absent,
        month.rate.toFixed(1)
      ]);
    }
    
    if (headers.length === 0) return;
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${selectedSection?.section_name}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    window.print();
  };

  const getGradeDisplay = (grade) => {
    if (grade === 0) return 'Kinder';
    return `Grade ${grade}`;
  };

  const pieData = reportData ? [
    { name: 'Present', value: reportData.statusBreakdown?.present || 0, color: '#10B981' },
    { name: 'Late', value: reportData.statusBreakdown?.late || 0, color: '#F59E0B' },
    { name: 'Absent', value: reportData.statusBreakdown?.absent || 0, color: '#EF4444' }
  ] : [];

  const getRateColor = (rate) => {
    if (rate >= 90) return 'text-green-600 bg-green-50';
    if (rate >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <FileText size={24} className="text-indigo-600" />
                Attendance Report
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Generate and analyze comprehensive attendance reports
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={downloadCSV}
                disabled={!reportData}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button 
                onClick={downloadPDF}
                disabled={!reportData}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={16} />
                Print Report
              </button>
              <button 
                onClick={generateReport}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium"
              >
                <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Report Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
              >
                <option value="daily">Daily Report</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="quarterly">Quarterly Report</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* School Year */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">School Year</label>
              <select
                value={selectedSchoolYear?.id || ''}
                onChange={(e) => {
                  const sy = schoolYears.find(s => s.id === parseInt(e.target.value));
                  setSelectedSchoolYear(sy);
                  setSelectedSection(null);
                  setSelectedGradeLevelFilter('');
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
              >
                <option value="">Select School Year</option>
                {schoolYears.map(sy => (
                  <option key={sy.id} value={sy.id}>
                    {sy.year_start}-{sy.year_end} {sy.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Quarter (only for quarterly report) */}
            {reportType === 'quarterly' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quarter</label>
                <select
                  value={selectedQuarter?.id || ''}
                  onChange={(e) => {
                    const q = quarters.find(q => q.id === parseInt(e.target.value));
                    setSelectedQuarter(q);
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
                >
                  <option value="">Select Quarter</option>
                  {quarters.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Grade Level */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Grade Level</label>
              <select
                value={selectedGradeLevelFilter}
                onChange={(e) => setSelectedGradeLevelFilter(e.target.value)}
                disabled={!selectedSchoolYear}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none disabled:opacity-50"
              >
                <option value="">All Grade Levels</option>
                {gradeLevels.map(gl => (
                  <option key={gl.id} value={gl.grade_level}>
                    {gl.grade_display || getGradeDisplay(gl.grade_level)}
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
              <select
                value={selectedSection?.id || ''}
                onChange={(e) => {
                  const sec = sections.find(s => s.id === parseInt(e.target.value));
                  setSelectedSection(sec);
                }}
                disabled={!selectedSchoolYear || (!selectedGradeLevelFilter && sections.length === 0)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none disabled:opacity-50"
              >
                <option value="">Select Section</option>
                {filteredSectionsByGrade.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.section_name}
                  </option>
                ))}
              </select>
              {selectedGradeLevelFilter && filteredSectionsByGrade.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">No sections for this grade level</p>
              )}
            </div>

            {/* Custom range (two fields) */}
            {reportType === 'custom' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <p className="text-gray-500 text-sm mt-4">Generating report...</p>
          </div>
        )}

        {/* No Selection State */}
        {!isGenerating && !selectedSection && (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Select Filters</h3>
            <p className="text-gray-400 text-sm">Please select school year, grade level, and section to generate report</p>
          </div>
        )}

        {/* Report Content */}
        {!isGenerating && reportData && selectedSection && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase">Total Days</p>
                <p className="text-2xl font-bold text-gray-800">{reportData.summary?.totalDays || 0}</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase">Total Students</p>
                <p className="text-2xl font-bold text-gray-800">{reportData.summary?.totalStudents || 0}</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase">Total Attendance</p>
                <p className="text-2xl font-bold text-indigo-600">{reportData.summary?.totalAttendance || 0}</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase">Daily Average</p>
                <p className="text-2xl font-bold text-gray-800">{reportData.summary?.averageDailyAttendance || 0}</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase">Overall Rate</p>
                <p className="text-2xl font-bold text-green-600">{reportData.summary?.overallAttendanceRate || 0}%</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase">Best Day</p>
                <p className="text-xs font-bold text-gray-700">{formatDate(reportData.summary?.topPerformingDay) || 'N/A'}</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase">Worst Day</p>
                <p className="text-xs font-bold text-gray-700">{formatDate(reportData.summary?.lowPerformingDay) || 'N/A'}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attendance Trend */}
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Attendance Trend</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportType === 'monthly' ? reportData.monthlyStats : (reportType === 'weekly' || reportType === 'quarterly' ? reportData.weeklyStats : reportData.dailyStats?.slice(0, 14))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={reportType === 'monthly' ? 'month' : (reportType === 'weekly' || reportType === 'quarterly' ? 'week' : 'date')} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="rate" stroke="#6366F1" name="Attendance Rate (%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Breakdown Pie Chart */}
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Status Breakdown</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Stats Table */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/30">
                <h3 className="text-base font-semibold text-gray-800">
                  {reportType === 'daily' ? 'Daily Attendance' : reportType === 'weekly' || reportType === 'quarterly' ? 'Weekly Summary' : 'Monthly Summary'}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        {reportType === 'daily' ? 'Date' : (reportType === 'weekly' || reportType === 'quarterly' ? 'Week' : 'Month')}
                      </th>
                      <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Present</th>
                      <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Late</th>
                      <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Absent</th>
                      <th className="text-center px-5 py-3 text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(reportType === 'daily' ? reportData.dailyStats : (reportType === 'weekly' || reportType === 'quarterly' ? reportData.weeklyStats : reportData.monthlyStats))?.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-gray-800">
                          {reportType === 'daily' ? formatDate(item.date) : (reportType === 'weekly' || reportType === 'quarterly' ? item.week : item.month)}
                        </td>
                        <td className="px-5 py-3 text-center text-sm text-green-600 font-semibold">{item.present}</td>
                        <td className="px-5 py-3 text-center text-sm text-yellow-600">{item.late}</td>
                        <td className="px-5 py-3 text-center text-sm text-red-600">{item.absent}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${getRateColor(item.rate)}`}>
                            {item.rate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Student Rankings */}
            {reportData.studentRankings && reportData.studentRankings.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/30">
                  <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <Award size={18} className="text-yellow-500" />
                    Student Attendance Ranking
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Student Name</th>
                        <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Present</th>
                        <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Late</th>
                        <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Absent</th>
                        <th className="text-center px-5 py-3 text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Rate (%)</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reportData.studentRankings.map((student, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-200 text-gray-600' :
                            index === 2 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            #{index + 1}
                          </div>
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-800">{student.name}</td>
                        <td className="px-5 py-3 text-center text-green-600">{student.present}</td>
                        <td className="px-5 py-3 text-center text-yellow-600">{student.late}</td>
                        <td className="px-5 py-3 text-center text-red-600">{student.absent}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${getRateColor(student.rate)}`}>
                            {student.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReport;