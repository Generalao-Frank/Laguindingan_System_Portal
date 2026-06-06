import React, { useState, useEffect } from 'react';
import {
  Server, Database, HardDrive, Activity, Wifi, Shield, 
  CheckCircle, AlertCircle, Loader2, RefreshCw, Cpu, 
  Clock, Calendar, Users, BarChart3, PieChart, TrendingUp,
  Zap, Coffee, Battery, Thermometer, Cloud, Smartphone,
  Globe, Lock, Eye, EyeOff, X, Download, Printer, Key
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const SystemHealth = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [systemStatus, setSystemStatus] = useState({
    status: 'healthy',
    lastChecked: null,
    services: {
      database: { status: 'checking', message: '', responseTime: 0 },
      cache: { status: 'checking', message: '', responseTime: 0 },
      storage: { status: 'checking', message: '', usage: 0, total: 0, free: 0 },
      api: { status: 'checking', message: '', responseTime: 0 },
      authentication: { status: 'checking', message: '' },
      queue: { status: 'checking', message: '' }
    },
    serverInfo: {
      php_version: null,
      laravel_version: null,
      os: null,
      server_software: null
    },
    performance: {
      cpu_usage: 0,
      memory_usage: 0,
      disk_usage: 0,
      uptime: 0
    },
    recentActivity: [],
    lastBackup: null
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const token = localStorage.getItem('userToken');

  useEffect(() => {
    fetchSystemHealth();
    fetchApiKey();
  }, []);

  const fetchSystemHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/admin/system-health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSystemStatus(response.data.status);
      } else {
        setError('Failed to load system health data');
      }
    } catch (err) {
      console.error('Error fetching system health:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchApiKey = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/api-key`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setApiKey(response.data.api_key);
      }
    } catch (err) {
      console.error('Error fetching API key:', err);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchSystemHealth();
    await fetchApiKey();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const regenerateApiKey = async () => {
    if (!window.confirm('⚠️ WARNING: Regenerating API key will invalidate the current key. All applications using this key will need to be updated. Continue?')) {
      return;
    }
    
    try {
      const response = await axios.post(`${API_URL}/admin/regenerate-api-key`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setApiKey(response.data.api_key);
        alert('API key regenerated successfully!');
      } else {
        alert('Failed to regenerate API key');
      }
    } catch (err) {
      console.error('Error regenerating API key:', err);
      alert('Failed to regenerate API key');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle size={16} className="text-green-400" />;
      case 'warning': return <AlertCircle size={16} className="text-yellow-400" />;
      case 'error': return <AlertCircle size={16} className="text-red-400" />;
      default: return <Loader2 size={16} className="animate-spin text-gray-400" />;
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'healthy': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={40} />
          <p className="text-gray-500">Loading system health data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-800">Connection Error</h2>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <button
            onClick={refreshData}
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
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Activity size={24} className="text-indigo-600" />
                System Health
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Monitor system performance, service status, and server health
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={refreshData} 
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium">
                <Download size={16} />
                Export Report
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium">
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div className={`rounded-xl p-4 mb-6 flex items-center justify-between ${getStatusBg(systemStatus.status)} border`}>
          <div className="flex items-center gap-3">
            {getStatusIcon(systemStatus.status)}
            <div>
              <p className="font-semibold text-gray-800">
                System Status: <span className="capitalize">{systemStatus.status}</span>
              </p>
              <p className="text-xs text-gray-500">Last checked: {systemStatus.lastChecked ? new Date(systemStatus.lastChecked).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={12} />
            <span>Auto-refresh every 5 minutes</span>
          </div>
        </div>

        {/* Services Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-indigo-600" />
                <h3 className="font-semibold text-gray-800">Database</h3>
              </div>
              {getStatusIcon(systemStatus.services.database.status)}
            </div>
            <p className="text-sm text-gray-600">{systemStatus.services.database.message}</p>
            {systemStatus.services.database.responseTime > 0 && (
              <p className="text-xs text-gray-400 mt-2">Response: {systemStatus.services.database.responseTime}ms</p>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-yellow-600" />
                <h3 className="font-semibold text-gray-800">Cache</h3>
              </div>
              {getStatusIcon(systemStatus.services.cache.status)}
            </div>
            <p className="text-sm text-gray-600">{systemStatus.services.cache.message}</p>
            {systemStatus.services.cache.responseTime > 0 && (
              <p className="text-xs text-gray-400 mt-2">Response: {systemStatus.services.cache.responseTime}ms</p>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive size={18} className="text-blue-600" />
                <h3 className="font-semibold text-gray-800">Storage</h3>
              </div>
              {getStatusIcon(systemStatus.services.storage.status)}
            </div>
            <p className="text-sm text-gray-600">{systemStatus.services.storage.message}</p>
            {systemStatus.services.storage.usage > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Usage</span>
                  <span>{systemStatus.services.storage.usage}GB / {systemStatus.services.storage.total}GB</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full" 
                    style={{ width: `${(systemStatus.services.storage.usage / systemStatus.services.storage.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-green-600" />
                <h3 className="font-semibold text-gray-800">API</h3>
              </div>
              {getStatusIcon(systemStatus.services.api.status)}
            </div>
            <p className="text-sm text-gray-600">{systemStatus.services.api.message}</p>
            {systemStatus.services.api.responseTime > 0 && (
              <p className="text-xs text-gray-400 mt-2">Response: {systemStatus.services.api.responseTime}ms</p>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-purple-600" />
                <h3 className="font-semibold text-gray-800">Authentication</h3>
              </div>
              {getStatusIcon(systemStatus.services.authentication.status)}
            </div>
            <p className="text-sm text-gray-600">{systemStatus.services.authentication.message}</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-orange-600" />
                <h3 className="font-semibold text-gray-800">Queue Worker</h3>
              </div>
              {getStatusIcon(systemStatus.services.queue.status)}
            </div>
            <p className="text-sm text-gray-600">{systemStatus.services.queue.message}</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 uppercase">CPU Usage</p>
              <Cpu size={14} className="text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{systemStatus.performance.cpu_usage}%</p>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${systemStatus.performance.cpu_usage}%` }}></div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 uppercase">Memory Usage</p>
              <Database size={14} className="text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{systemStatus.performance.memory_usage}%</p>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-600 rounded-full" style={{ width: `${systemStatus.performance.memory_usage}%` }}></div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 uppercase">Disk Usage</p>
              <HardDrive size={14} className="text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{systemStatus.performance.disk_usage}%</p>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${systemStatus.performance.disk_usage}%` }}></div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 uppercase">Uptime</p>
              <TrendingUp size={14} className="text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-green-600">{systemStatus.performance.uptime}%</p>
            <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
          </div>
        </div>

        {/* Server Info & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Server size={18} className="text-indigo-500" />
              Server Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">PHP Version</span>
                <span className="text-sm font-medium text-gray-800">{systemStatus.serverInfo.php_version || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Laravel Version</span>
                <span className="text-sm font-medium text-gray-800">{systemStatus.serverInfo.laravel_version || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Operating System</span>
                <span className="text-sm font-medium text-gray-800">{systemStatus.serverInfo.os || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Web Server</span>
                <span className="text-sm font-medium text-gray-800">{systemStatus.serverInfo.server_software || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Last Backup</span>
                <span className="text-sm font-medium text-gray-800">{systemStatus.lastBackup ? new Date(systemStatus.lastBackup).toLocaleString() : 'Never'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-indigo-500" />
              Recent Activity
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {systemStatus.recentActivity.length > 0 ? (
                systemStatus.recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'warning' ? 'bg-yellow-500' :
                      activity.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{activity.event}</p>
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Activity size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* API Key Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Key size={18} className="text-indigo-500" />
            API Configuration
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">API Key</label>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm bg-white px-3 py-2 rounded border border-gray-200 flex-1">
                    {showApiKey ? apiKey : '•'.repeat(40)}
                  </code>
                  <button 
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Use this key to authenticate API requests. Keep it secure and never share it publicly.
                </p>
              </div>
              <button 
                onClick={regenerateApiKey}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Regenerate Key
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>System Health Monitor v1.0</span>
            <span>Auto-refresh: 5 minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Monitoring active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;