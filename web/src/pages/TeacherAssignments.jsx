import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, Trash2, Save, X, Loader2, 
  Users, BookOpen, Calendar, CheckCircle, AlertCircle, 
  Search, RefreshCw, ArrowLeft, School, GraduationCap,
  ChevronRight, Briefcase, UserCheck, Clock, Filter,
  UserPlus, UserMinus, Award, TrendingUp, AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const TeacherAssignments = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState({
    totalAssignments: 0,
    totalTeachers: 0,
    totalSubjects: 0,
    totalSections: 0
  });
  
  // Form state for modal
  const [formData, setFormData] = useState({
    teacher_id: '',
    subject_id: '',
    section_id: '',
    school_year_id: '',
  });
  
  // Additional state for filtering in modal
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [filteredSectionsByGrade, setFilteredSectionsByGrade] = useState([]);
  const [filteredSubjectsByGrade, setFilteredSubjectsByGrade] = useState([]);
  
  // Lookup for existing assignments
  const [existingAssignmentMap, setExistingAssignmentMap] = useState({});
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const token = localStorage.getItem('userToken');

  // Helper function to get teacher initials
  const getInitials = (name) => {
    if (!name) return 'T';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to get profile picture URL
  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) return null;
    // Check if it's already a full URL
    if (profilePicture.startsWith('http')) return profilePicture;
    // Otherwise, construct the storage URL
    return `${API_URL}/storage/${profilePicture}`;
  };

  useEffect(() => {
    fetchAssignments();
    fetchTeachers();
    fetchSubjects();
    fetchSections();
    fetchSchoolYears();
    fetchGradeLevels();
  }, []);

  useEffect(() => {
    const map = {};
    assignments.forEach(a => {
      const key = `${a.subject_id}|${a.section_id}|${a.school_year_id}`;
      if (!map[key]) {
        map[key] = a.teacher_name;
      }
    });
    setExistingAssignmentMap(map);
  }, [assignments]);

  useEffect(() => {
    if (selectedGradeLevel) {
      const grade = parseInt(selectedGradeLevel);
      const filteredSections = allSections.filter(s => s.grade_level === grade);
      setFilteredSectionsByGrade(filteredSections);
      
      const filteredSubjects = allSubjects.filter(s => s.grade_level === grade);
      setFilteredSubjectsByGrade(filteredSubjects);
      
      if (formData.section_id && !filteredSections.some(s => s.id === parseInt(formData.section_id))) {
        setFormData(prev => ({ ...prev, section_id: '' }));
      }
      if (formData.subject_id && !filteredSubjects.some(s => s.id === parseInt(formData.subject_id))) {
        setFormData(prev => ({ ...prev, subject_id: '' }));
      }
    } else {
      setFilteredSectionsByGrade([]);
      setFilteredSubjectsByGrade([]);
    }
  }, [selectedGradeLevel, allSections, allSubjects]);

  useEffect(() => {
    if (!editingAssignment && formData.subject_id && formData.section_id && formData.school_year_id) {
      const key = `${formData.subject_id}|${formData.section_id}|${formData.school_year_id}`;
      const existingTeacher = existingAssignmentMap[key];
      if (existingTeacher) {
        setDuplicateInfo({ isDuplicate: true, existingTeacherName: existingTeacher });
      } else {
        setDuplicateInfo(null);
      }
    } else {
      setDuplicateInfo(null);
    }
  }, [formData, editingAssignment, existingAssignmentMap]);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/teacher-assignments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setAssignments(response.data.assignments);
        setStats({
          totalAssignments: response.data.assignments.length,
          totalTeachers: [...new Set(response.data.assignments.map(a => a.teacher_id))].length,
          totalSubjects: [...new Set(response.data.assignments.map(a => a.subject_id))].length,
          totalSections: [...new Set(response.data.assignments.map(a => a.section_id))].length
        });
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      showAlert('Failed to load assignments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/teachers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) setTeachers(response.data.teachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setAllSubjects(response.data.subjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/sections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        const sorted = [...response.data.sections].sort((a, b) => {
          if (a.grade_level !== b.grade_level) return a.grade_level - b.grade_level;
          return a.section_name.localeCompare(b.section_name);
        });
        setAllSections(sorted);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchSchoolYears = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/school-years`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSchoolYears(response.data.school_years);
        const activeYear = response.data.school_years.find(sy => sy.is_active);
        if (activeYear && !formData.school_year_id) {
          setFormData(prev => ({ ...prev, school_year_id: activeYear.id }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const key = `${formData.subject_id}|${formData.section_id}|${formData.school_year_id}`;
    if (!editingAssignment && existingAssignmentMap[key]) {
      showAlert(`This subject and section combination is already assigned to ${existingAssignmentMap[key]}. Please choose another subject or section.`, 'error');
      setIsLoading(false);
      return;
    }

    const selectedSection = allSections.find(s => s.id === parseInt(formData.section_id));
    const selectedSubject = allSubjects.find(s => s.id === parseInt(formData.subject_id));
    if (selectedSection && selectedSubject && selectedSection.grade_level !== selectedSubject.grade_level) {
      showAlert(`The subject "${selectedSubject.subject_name}" belongs to ${getGradeDisplay(selectedSubject.grade_level)}, but the section "${selectedSection.section_name}" belongs to ${getGradeDisplay(selectedSection.grade_level)}. Please choose a subject that matches the section's grade level.`, 'error');
      setIsLoading(false);
      return;
    }

    try {
      const submitData = {
        teacher_id: parseInt(formData.teacher_id),
        subject_id: parseInt(formData.subject_id),
        section_id: parseInt(formData.section_id),
        school_year_id: parseInt(formData.school_year_id),
      };

      let response;
      if (editingAssignment) {
        response = await axios.put(`${API_URL}/admin/teacher-assignments/${editingAssignment.id}`, submitData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        response = await axios.post(`${API_URL}/admin/teacher-assignments`, submitData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (response.data.success) {
        showAlert(editingAssignment ? 'Assignment updated successfully!' : 'Teacher assigned successfully!', 'success');
        setShowModal(false);
        resetModal();
        fetchAssignments();
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
      const msg = error.response?.data?.message || 'Failed to save assignment';
      showAlert(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setFormData({
      teacher_id: '',
      subject_id: '',
      section_id: '',
      school_year_id: schoolYears.find(sy => sy.is_active)?.id || '',
    });
    setSelectedGradeLevel('');
    setEditingAssignment(null);
    setDuplicateInfo(null);
  };

  const handleDelete = async (assignment) => {
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to remove this assignment?\n\nTeacher: ${assignment.teacher_name}\nSubject: ${assignment.subject_name}\nSection: ${assignment.section_name}\n\nThis action cannot be undone!`)) return;

    try {
      await axios.delete(`${API_URL}/admin/teacher-assignments/${assignment.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAssignments();
      showAlert(`Assignment removed successfully!`, 'success');
    } catch (error) {
      showAlert(error.response?.data?.message || 'Failed to delete assignment', 'error');
    }
  };

  const getGradeDisplay = (grade) => {
    if (grade === undefined || grade === null) return 'N/A';
    if (grade === 0) return 'Kinder';
    return `Grade ${grade}`;
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.section_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeacher = filterTeacher === 'all' || assignment.teacher_id === parseInt(filterTeacher);
    const matchesSubject = filterSubject === 'all' || assignment.subject_id === parseInt(filterSubject);
    const matchesSection = filterSection === 'all' || assignment.section_id === parseInt(filterSection);
    return matchesSearch && matchesTeacher && matchesSubject && matchesSection;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <Briefcase size={24} className="text-indigo-600" />
                Teacher Assignments
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Assign teachers to subjects and sections (subject grade level must match section grade level)
              </p>
            </div>
            <button 
              onClick={() => {
                setEditingAssignment(null);
                setFormData({
                  teacher_id: '',
                  subject_id: '',
                  section_id: '',
                  school_year_id: schoolYears.find(sy => sy.is_active)?.id || '',
                });
                setSelectedGradeLevel('');
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium"
            >
              <Plus size={16} /> New Assignment
            </button>
          </div>
        </div>

        {/* Alerts */}
        {showSuccess && (
          <div className="fixed top-24 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3">
            <CheckCircle size={18} />{successMessage}
          </div>
        )}
        {error && (
          <div className="fixed top-24 right-6 z-50 bg-red-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3">
            <AlertCircle size={18} />{errorMessage}
            <button onClick={() => setError(false)} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between"><p className="text-xs text-gray-400">Total Assignments</p><div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center"><Briefcase size={18} className="text-indigo-600" /></div></div>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalAssignments}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between"><p className="text-xs text-gray-400">Teachers Assigned</p><div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center"><Users size={18} className="text-emerald-600" /></div></div>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalTeachers}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between"><p className="text-xs text-gray-400">Subjects</p><div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center"><BookOpen size={18} className="text-purple-600" /></div></div>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalSubjects}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between"><p className="text-xs text-gray-400">Sections</p><div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center"><School size={18} className="text-amber-600" /></div></div>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalSections}</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search by teacher, subject, or section..." className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"><option value="all">All Teachers</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select>
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"><option value="all">All Subjects</option>{allSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select>
            <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"><option value="all">All Sections</option>{allSections.map(sec => <option key={sec.id} value={sec.id}>{sec.section_name}</option>)}</select>
          </div>
        </div>

        {/* Assignments Table with Profile Pictures */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Teacher</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Subject</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Grade & Section</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">School Year</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAssignments.map(assignment => {
                    const gradeMismatch = assignment.subject_grade_level !== undefined && assignment.section_grade_level !== undefined && assignment.subject_grade_level !== assignment.section_grade_level;
                    const profilePicUrl = getProfilePictureUrl(assignment.teacher_profile_picture);
                    
                    return (
                      <tr key={assignment.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {/* Profile Picture with fallback */}
                            {profilePicUrl ? (
                              <img 
                                src={profilePicUrl}
                                alt={assignment.teacher_name}
                                className="w-10 h-10 rounded-full object-cover bg-gray-100 border border-gray-200"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(assignment.teacher_name)}&background=6366f1&color=fff&bold=true&size=40`;
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                {getInitials(assignment.teacher_name)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-800">{assignment.teacher_name}</p>
                              <p className="text-xs text-gray-400">Teacher</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <BookOpen size={14} className="text-gray-400" />
                            <span>{assignment.subject_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <GraduationCap size={14} className="text-gray-400" />
                            <span className={gradeMismatch ? "text-red-600 font-semibold" : ""}>
                              {assignment.grade_display || `Grade ${assignment.grade_level}`} - {assignment.section_name}
                            </span>
                            {gradeMismatch && <AlertTriangle size={14} className="text-red-500" title="Grade level mismatch between subject and section" />}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <span>{assignment.school_year}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100">
                            <button onClick={() => {
                              setEditingAssignment(assignment);
                              const sec = allSections.find(s => s.id === assignment.section_id);
                              if (sec) setSelectedGradeLevel(sec.grade_level.toString());
                              setFormData({
                                teacher_id: assignment.teacher_id.toString(),
                                subject_id: assignment.subject_id.toString(),
                                section_id: assignment.section_id.toString(),
                                school_year_id: assignment.school_year_id?.toString() || '',
                              });
                              setShowModal(true);
                            }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(assignment)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredAssignments.length === 0 && (
                <div className="text-center py-12 text-gray-400">No teacher assignments found</div>
              )}
            </div>
          </div>
        </div>

        {/* Modal - New/Edit Assignment */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{editingAssignment ? 'Edit Assignment' : 'New Teacher Assignment'}</h3>
                <button onClick={() => { setShowModal(false); resetModal(); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level *</label>
                  <select
                    value={selectedGradeLevel}
                    onChange={(e) => setSelectedGradeLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                    required
                  >
                    <option value="">Select Grade Level</option>
                    {gradeLevels.map(gl => (
                      <option key={gl.id} value={gl.grade_level}>
                        {gl.grade_display || getGradeDisplay(gl.grade_level)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                  <select
                    value={formData.section_id}
                    onChange={(e) => {
                      setFormData({ ...formData, section_id: e.target.value, subject_id: '' });
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                    required
                    disabled={!selectedGradeLevel}
                  >
                    <option value="">Select Section</option>
                    {filteredSectionsByGrade.map(sec => (
                      <option key={sec.id} value={sec.id}>
                        {sec.section_name}
                      </option>
                    ))}
                  </select>
                  {selectedGradeLevel && filteredSectionsByGrade.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">No sections available for this grade level. Please add sections first.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                    required
                    disabled={!selectedGradeLevel}
                  >
                    <option value="">Select Subject</option>
                    {filteredSubjectsByGrade.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.subject_name}
                      </option>
                    ))}
                  </select>
                  {selectedGradeLevel && filteredSubjectsByGrade.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">No subjects available for this grade level. Please add subjects first.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                    required
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.employee_id})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Year *</label>
                  <select
                    value={formData.school_year_id}
                    onChange={(e) => setFormData({ ...formData, school_year_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                    required
                  >
                    <option value="">Select School Year</option>
                    {schoolYears.map(sy => <option key={sy.id} value={sy.id}>{sy.year_start}-{sy.year_end} {sy.is_active ? '(Active)' : ''}</option>)}
                  </select>
                </div>

                {duplicateInfo && duplicateInfo.isDuplicate && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-yellow-700 text-xs flex items-center gap-2">
                    <AlertCircle size={14} /> This subject and section combination is already assigned to <strong>{duplicateInfo.existingTeacherName}</strong>. Please choose another subject or section.
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowModal(false); resetModal(); }} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button
                    type="submit"
                    disabled={isLoading || (!editingAssignment && duplicateInfo?.isDuplicate)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {isLoading ? 'Saving...' : (editingAssignment ? 'Update' : 'Assign')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAssignments;