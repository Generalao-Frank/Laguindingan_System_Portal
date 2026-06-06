import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode, Download, Printer, Search, Filter, Calendar, 
  Users, GraduationCap, ChevronRight, Loader2, X,
  CheckCircle, AlertCircle, Eye, RefreshCw, Copy,
  UserCheck, Shield, Clock, FileText, Zap, Award
} from 'lucide-react';
import axios from 'axios';
import QRCode from 'qrcode';
import API_URL from '../config';

const ViewQR = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [sections, setSections] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    hasQRCode: 0,
    noQRCode: 0,
    generatedToday: 0
  });

 
  const token = localStorage.getItem('userToken');

  useEffect(() => {
    fetchStudents();
    fetchSections();
    fetchStats();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setStudents(response.data.students);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      showAlert('Failed to load students', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/sections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSections(response.data.sections);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/qr/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showAlert = (message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage('');
      }, 3000);
    } else {
      setErrorMessage(message);
      setError(true);
      setTimeout(() => {
        setError(false);
        setErrorMessage('');
      }, 3000);
    }
  };

  // View QR code (no generation needed, just display)
  const viewQRCode = async (student) => {
    setIsLoading(true);
    setSelectedStudent(student);
    
    try {
      // Check if student has QR code in database
      let qrData = null;
      
      if (student.has_qr) {
        // Fetch existing QR code from backend
        const response = await axios.get(`${API_URL}/admin/qr/student/${student.student_info_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.success && response.data.qr_code) {
          qrData = response.data.qr_code.qr_data;
        }
      }
      
      if (qrData) {
        // Generate QR code from existing data
        const qrDataUrl = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#1E1B4B',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qrDataUrl);
      } else {
        showAlert('QR code not found for this student', 'error');
      }
    } catch (error) {
      console.error('Error viewing QR code:', error);
      showAlert('Failed to load QR code', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `qr_${selectedStudent?.lrn || selectedStudent?.id}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const printQRCode = () => {
    if (!qrCodeUrl) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${selectedStudent?.full_name}</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .container {
              text-align: center;
            }
            img {
              width: 300px;
              height: 300px;
            }
            h2 {
              margin-top: 20px;
            }
            p {
              margin: 5px 0;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${qrCodeUrl}" alt="QR Code" />
            <h2>${selectedStudent?.first_name} ${selectedStudent?.last_name}</h2>
            <p>LRN: ${selectedStudent?.lrn || 'N/A'}</p>
            <p>Grade ${selectedStudent?.grade_level} - ${selectedStudent?.section}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredStudents = students.filter(student => {
    const lrnStr = student.lrn ? String(student.lrn) : '';
    const fullName = student.full_name || `${student.last_name}, ${student.first_name} ${student.middle_name || ''}`;
    const firstNameLastName = `${student.first_name} ${student.last_name}`;
    
    const matchesSearch = 
      lrnStr.includes(searchTerm) ||
      firstNameLastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGrade = filterGrade === 'all' || student.grade_level === parseInt(filterGrade);
    const matchesSection = filterSection === 'all' || student.section === filterSection;
    
    return matchesSearch && matchesGrade && matchesSection;
  });

  const uniqueSections = [...new Set(students.map(s => s.section).filter(Boolean))];
  const gradeLevels = [0, 1, 2, 3, 4, 5, 6];

  const getGradeDisplay = (grade) => {
    if (grade === 0) return 'Kinder';
    return `Grade ${grade}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <QrCode size={24} className="text-indigo-600" />
                Student QR Codes
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                View and download QR codes for all students (automatically generated)
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
              >
                <Printer size={16} />
                Print List
              </button>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {showSuccess && (
          <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right-5 duration-300">
            <div className="bg-green-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[300px]">
              <CheckCircle size={18} />
              <span className="text-sm font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right-5 duration-300">
            <div className="bg-red-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[300px]">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{errorMessage}</span>
              <button onClick={() => setError(false)} className="ml-auto hover:text-red-200">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Total Students</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalStudents || students.length}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Users size={18} className="text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">With QR Code</p>
                <p className="text-2xl font-bold text-green-600">{stats.hasQRCode || students.filter(s => s.has_qr).length}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <QrCode size={18} className="text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Ready to Print</p>
                <p className="text-2xl font-bold text-amber-600">{stats.hasQRCode || students.filter(s => s.has_qr).length}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Printer size={18} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase">Auto-Generated</p>
                <p className="text-2xl font-bold text-purple-600">✓</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Search by name or LRN..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400 outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select 
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
            >
              <option value="all">All Grade Levels</option>
              {gradeLevels.map(g => (
                <option key={g} value={g}>{getGradeDisplay(g)}</option>
              ))}
            </select>
            
            <select 
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
            >
              <option value="all">All Sections</option>
              {uniqueSections.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Students Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-gray-500 text-sm mt-4">Loading students...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredStudents.map((student) => (
              <div 
                key={student.id} 
                className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 group"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{student.full_name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{student.lrn || 'No LRN'}</p>
                      </div>
                    </div>
                    {student.has_qr ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-green-100 text-green-700">
                        <CheckCircle size={9} />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-yellow-100 text-yellow-700">
                        <Loader2 size={9} className="animate-spin" />
                        Syncing
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Grade & Section</span>
                      <span className="font-medium text-gray-700">
                        {getGradeDisplay(student.grade_level)} - {student.section}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => viewQRCode(student)}
                    disabled={!student.has_qr}
                    className={`w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                      student.has_qr
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Eye size={14} />
                    View QR Code
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredStudents.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Students Found</h3>
            <p className="text-gray-400 text-sm">No students match your search criteria</p>
          </div>
        )}

        {/* QR Code View Modal */}
        {qrCodeUrl && selectedStudent && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Student QR Code</h3>
                <button
                  onClick={() => {
                    setQrCodeUrl(null);
                    setSelectedStudent(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="text-center">
                <div className="bg-gray-50 rounded-xl p-6 mb-4">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                
                <h4 className="font-semibold text-gray-800">{selectedStudent.full_name}</h4>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  LRN: {selectedStudent.lrn || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">
                  {getGradeDisplay(selectedStudent.grade_level)} - {selectedStudent.section}
                </p>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={downloadQRCode}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    onClick={printQRCode}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all text-sm font-medium"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewQR;