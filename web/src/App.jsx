import React, { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components & Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ManageTeacher from './pages/ManageTeacher';
import EnrollStudent from './pages/EnrollStudent';
import StudentRecord from './pages/StudentRecord';
import StudentStatusHistory from './pages/StudentStatusHistory';
import GradeLevels from './pages/GradeLevels';
import Sections from './pages/Sections';
import Subjects from './pages/Subjects';
import Rooms from './pages/Rooms';
import TeacherAssignments from './pages/TeacherAssignments';
import SchoolYears from './pages/SchoolYears';
import Quarters from './pages/Quarters';
import SetActiveTerm from './pages/SetActiveTerm';
// import GradeEncoding from './pages/GradeEncoding';
import GradeApprovals from './pages/GradeApprovals';
import ViewGrades from './pages/ViewGrades';
import GradeReports from './pages/GradeReports';
import GenerateQR from './pages/GenerateQR';
import ViewAttendance from './pages/ViewAttendance';
import AttendanceReport from './pages/AttendanceReport';
import ActiveEnrollments from './pages/ActiveEnrollments';
import EnrollmentHistory from './pages/EnrollmentHistory';
import BulkEnrollment from './pages/BulkEnrollment';
import Meetings from './pages/Meetings';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import StudentPerformance from './pages/StudentPerformance';
import EnrollmentReports from './pages/EnrollmentReports'
import GraduationReports from './pages/GraduationReports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import SystemHealth from './pages/SystemHealth';
// import Activities from './pages/Activities';


function App() {
  // Check localStorage for authentication
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  // Check token validity on mount
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      setIsAuthenticated(false);
      localStorage.removeItem('isLoggedIn');
    }
  }, []);

  // Handle Login
  const handleLogin = (status) => {
    setIsAuthenticated(status);
    if (status) {
      localStorage.setItem('isLoggedIn', 'true');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    localStorage.removeItem('adminProfileImage');
  };

  return (
    <Router>
      <div className="flex bg-[#F8FAFC] min-h-screen font-sans">
        
        {/* Sidebar - only shown when authenticated */}
        {isAuthenticated && (
          <Sidebar onLogout={handleLogout} />
        )}
        
        <main className="flex-1 overflow-y-auto">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={<Landing />}  // <-- Landing page sa root
            />
            
            <Route 
              path="/login" 
              element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} 
            />

            {/* Protected Routes - Admin Only */}
            <Route
              path="/*"
              element={
                isAuthenticated ? (
                  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
                    <div className="pt-0">
                      <Routes>
                        {/* Dashboard */}
                        <Route path="/dashboard" element={<Dashboard />} />
                        
                        {/* Teacher Management */}
                        <Route path="/admin/teachers" element={<ManageTeacher />} />
                        <Route path="/add-teacher" element={<ManageTeacher />} />
                        
                        {/* Student Management */}
                        <Route path="/admin/students/enroll" element={<EnrollStudent />} />
                        <Route path="/add-student" element={<EnrollStudent />} />
                        <Route path="/admin/students" element={<StudentRecord />} />
                        <Route path="/admin/students/history" element={<StudentStatusHistory />} />
                        <Route path="/admin/grade-levels" element={<GradeLevels />} />

                        <Route path="/admin/sections" element={<Sections />} />

                        <Route path="/admin/subjects" element={<Subjects />} />

                        <Route path="/admin/rooms" element={<Rooms />} />

                        <Route path="/admin/teacher-assignments" element={<TeacherAssignments />} />

                        <Route path="/admin/school-years" element={<SchoolYears />} />
                        <Route path="/admin/school-years/:schoolYearId/quarters" element={<Quarters />} />
                        <Route path="/admin/quarters" element={<Quarters />} />  
                        <Route path="/admin/active-term" element={<SetActiveTerm />} />
                        {/* <Route path="/admin/grades/encode" element={<GradeEncoding />} /> */}
                        <Route path="admin/grade-approvals" element={<GradeApprovals />} />
                        <Route path="/admin/grades" element={<ViewGrades />} />
                        <Route path="/admin/grades/reports" element={<GradeReports />} />
                        <Route path="/admin/qr/generate" element={<GenerateQR />} />
                        <Route path="/admin/attendance" element={<ViewAttendance />} />
                        <Route path="/admin/attendance/reports" element={<AttendanceReport />} />
                        <Route path="/admin/enrollments/active" element={<ActiveEnrollments />} />
                        <Route path="/admin/enrollments/history" element={<EnrollmentHistory />} />
                        <Route path="/admin/enrollments/bulk" element={<BulkEnrollment />} />
                        <Route path="/admin/meetings" element={<Meetings />} />
                        <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
                        <Route path="/admin/reports/performance" element={<StudentPerformance />} />
                         <Route path="/admin/reports/enrollment" element={<EnrollmentReports />} /> 
                         <Route path="/admin/reports/graduation" element={<GraduationReports />} />
                         <Route path="/admin/audit-logs" element={<AuditLogs />} />
                         <Route path="/admin/settings" element={<Settings />} />
                         <Route path="/admin/system-health" element={<SystemHealth />} />
                         
                  


                        {/* <Route path="/admin/activities" element={<Activities />} /> */}

                        {/* Fallback - redirect to dashboard */}
                        <Route path="*" element={<Navigate to="/dashboard" />} />
                        
                      </Routes>
                    </div>
                  </div>
                ) : (
                  <Navigate to="/" />  // <-- Redirect to Landing page, hindi sa login
                )
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;