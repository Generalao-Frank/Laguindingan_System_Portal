import React, { useState, useEffect } from 'react';
import {
  Database, Search, Filter, Download, Printer, Calendar,
  User, Users, GraduationCap, BookOpen, Settings, LogIn,
  LogOut, Upload, FileText, CheckCircle, XCircle, AlertCircle,
  Loader2, Eye, ChevronLeft, ChevronRight, RefreshCw,
  Clock, Activity, Shield, UserCheck, UserX, Trash2, Edit,
  PlusCircle, X, BarChart3, TrendingUp, Award
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const AuditLogs = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [stats, setStats] = useState({
    totalLogs: 0,
    byActionType: {},
    recentActivity: 0
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [users, setUsers] = useState([]);

  const token = localStorage.getItem('userToken');

  const actionTypes = [
    { value: 'CREATE', label: 'Create', icon: <PlusCircle size={14} />, color: 'text-green-600', bg: 'bg-green-50' },
    { value: 'UPDATE', label: 'Update', icon: <Edit size={14} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { value: 'DELETE', label: 'Delete', icon: <Trash2 size={14} />, color: 'text-red-600', bg: 'bg-red-50' },
    { value: 'LOGIN', label: 'Login', icon: <LogIn size={14} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { value: 'LOGOUT', label: 'Logout', icon: <LogOut size={14} />, color: 'text-gray-600', bg: 'bg-gray-50' },
    { value: 'UPLOAD', label: 'Upload', icon: <Upload size={14} />, color: 'text-purple-600', bg: 'bg-purple-50' },
    { value: 'TRANSFER', label: 'Transfer', icon: <Users size={14} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { value: 'ENROLL', label: 'Enroll', icon: <UserCheck size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { value: 'DROP', label: 'Drop', icon: <UserX size={14} />, color: 'text-rose-600', bg: 'bg-rose-50' },
    { value: 'GRADE_UPDATE', label: 'Grade Update', icon: <GraduationCap size={14} />, color: 'text-yellow-600', bg: 'bg-yellow-50' }
  ];

  const actionMap = Object.fromEntries(actionTypes.map(a => [a.value, a]));

  useEffect(() => {
    fetchAuditLogs();
    fetchUsers();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, filterAction, filterUser, filterDate, dateRange, logs]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setLogs(response.data.logs);
        setStats(response.data.stats);
        setFilteredLogs(response.data.logs);
      } else {
        setMockData();
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setMockData();
    } finally {
      setLoading(false);
    }
  };

    

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.user_name?.toLowerCase().includes(term) ||
        log.description?.toLowerCase().includes(term) ||
        log.action_type?.toLowerCase().includes(term) ||
        log.table_name?.toLowerCase().includes(term) ||
        log.ip_address?.includes(term)
      );
    }

    // Action type filter
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action_type === filterAction);
    }

    // User filter
    if (filterUser !== 'all') {
      filtered = filtered.filter(log => log.user_name === filterUser);
    }

    // Date filters
    if (dateRange.startDate) {
      filtered = filtered.filter(log => log.created_at?.split(' ')[0] >= dateRange.startDate);
    }
    if (dateRange.endDate) {
      filtered = filtered.filter(log => log.created_at?.split(' ')[0] <= dateRange.endDate);
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterAction('all');
    setFilterUser('all');
    setDateRange({ startDate: '', endDate: '' });
    setFilterDate('');
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Action Type', 'Description', 'Table', 'Record ID', 'IP Address'];
    const rows = filteredLogs.map(log => [
      log.created_at,
      log.user_name,
      log.action_type,
      log.description,
      log.table_name,
      log.record_id,
      log.ip_address
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const getActionBadge = (actionType) => {
    const action = actionMap[actionType] || { label: actionType, color: 'text-gray-600', bg: 'bg-gray-50' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${action.bg} ${action.color}`}>
        {action.icon}
        {action.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={40} />
          <p className="text-gray-500">Loading audit logs...</p>
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
                <Database size={24} className="text-indigo-600" />
                Audit Logs
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Track and monitor all system activities and user actions
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
                onClick={fetchAuditLogs}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
              >
                <RefreshCw size={16} />
                Refresh
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Total Logs</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalLogs}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Database size={18} className="text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Action Types</p>
                <p className="text-2xl font-bold text-gray-800">{Object.keys(stats.byActionType).length}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Activity size={18} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Recent Activity</p>
                <p className="text-2xl font-bold text-blue-600">{stats.recentActivity}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Clock size={18} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Unique Users</p>
                <p className="text-2xl font-bold text-gray-800">{new Set(logs.map(l => l.user_name)).size}</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Users size={18} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Filter Options</h3>
              <div className="flex gap-2">
                <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-700">Clear All</button>
                <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
              >
                <option value="all">All Actions</option>
                {actionTypes.map(action => (
                  <option key={action.value} value={action.value}>{action.label}</option>
                ))}
              </select>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
              >
                <option value="all">All Users</option>
                {[...new Set(logs.map(l => l.user_name))].map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="date"
                  placeholder="Start Date"
                  className="w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
                <input
                  type="date"
                  placeholder="End Date"
                  className="w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Activity size={16} className="text-indigo-500" />
              System Activity Logs
            </h3>
            <p className="text-xs text-gray-400">
              Showing {filteredLogs.length} of {logs.length} records
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Table</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">IP Address</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentLogs.length > 0 ? (
                  currentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User size={12} className="text-indigo-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-800">{log.user_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">{getActionBadge(log.action_type)}</td>
                      <td className="px-6 py-3 text-sm text-gray-600 max-w-md truncate">
                        {log.description}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-mono text-gray-500">{log.table_name}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-mono text-gray-500">{log.ip_address || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => viewLogDetails(log)}
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Database size={40} className="text-gray-300 mb-3" />
                        <p className="text-gray-400">No audit logs found</p>
                        <button onClick={clearFilters} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700">
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredLogs.length)} of {filteredLogs.length} entries
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-4 text-center text-xs text-gray-400">
          Logs retained for 30 days • Generated on {new Date().toLocaleString()}
        </div>
      </div>

      {/* Log Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Eye size={20} className="text-indigo-600" />
                Log Details
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Timestamp</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">User</p>
                  <p className="text-sm font-medium text-gray-800">{selectedLog.user_name}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Action Type</p>
                  <p className="text-sm font-medium text-gray-800">{getActionBadge(selectedLog.action_type)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">IP Address</p>
                  <p className="text-sm font-medium text-gray-800">{selectedLog.ip_address || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Table Name</p>
                  <p className="text-sm font-medium text-gray-800">{selectedLog.table_name}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Record ID</p>
                  <p className="text-sm font-medium text-gray-800">{selectedLog.record_id}</p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Description</p>
                <p className="text-sm text-gray-700">{selectedLog.description}</p>
              </div>

              {selectedLog.old_values && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600 font-medium mb-2 flex items-center gap-1">
                    <XCircle size={12} /> Old Values
                  </p>
                  <pre className="text-xs text-red-700 whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 font-medium mb-2 flex items-center gap-1">
                    <CheckCircle size={12} /> New Values
                  </p>
                  <pre className="text-xs text-green-700 whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                Close
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

export default AuditLogs;