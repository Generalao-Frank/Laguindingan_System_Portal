import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView,
  RefreshControl, Alert, ActivityIndicator, Platform, Modal, TextInput, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../../api/client';

interface Activity {
  id: number;
  title: string;
  description: string;
  deadline: string;
  max_points: number;
  section: string;
  subject: string;
  submitted: number;
  graded: number;
}

interface TeacherSection {
  id: number;
  grade_level: number;
  section_name: string;
  subject_name: string;
  subject_id: number;
}

interface Submission {
  id: number;
  student_name: string;
  lrn: string;
  submitted_at: string;
  image_path: string | null;
  points_earned: number | null;
  feedback: string | null;
  status: 'submitted' | 'graded';
  enrollment_id: number;
}

export default function ActivitiesScreen() {
  const colors = {
    background: '#F9F7F2',
    cardBg: '#FFFFFF',
    text: '#2C3647',
    muted: '#999999',
    border: '#EAE6DF',
    inputBg: '#F9F7F2',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    primary: '#3b82f6',
  };

  const [activities, setActivities] = useState<Activity[]>([]);
  const [sections, setSections] = useState<TeacherSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    deadline: new Date(),
    max_points: 100,
    section_id: 0,
    subject_id: 0,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState(new Date());

  // Submissions modal states
  const [submissionsModalVisible, setSubmissionsModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradePoints, setGradePoints] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submissionsFilter, setSubmissionsFilter] = useState<'all' | 'submitted' | 'graded'>('all');

  const fetchActivities = useCallback(async () => {
    try {
      const res = await apiClient.get('/teacher/activities');
      setActivities(res.data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load activities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchSections = useCallback(async () => {
    try {
      const res = await apiClient.get('/teacher/sections');
      setSections(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    fetchSections();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities();
    fetchSections();
  };

  const getDueStatus = (deadline: string) => {
    if (!deadline) return { label: 'No deadline', color: colors.muted, isOverdue: false };
    const dueDate = new Date(deadline);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) return { label: 'Overdue', color: colors.danger, isOverdue: true };
    if (diffDays <= 2) return { label: 'Due Soon', color: colors.warning, isOverdue: false };
    return { label: `${diffDays} days left`, color: colors.text, isOverdue: false };
  };

  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const status = getDueStatus(act.deadline);
      if (filter === 'active') return !status.isOverdue;
      if (filter === 'overdue') return status.isOverdue;
      return true;
    });
  }, [activities, filter]);

  const handleAddActivity = async () => {
    if (!newActivity.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!newActivity.section_id) {
      Alert.alert('Error', 'Please select a section');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: newActivity.title,
        description: newActivity.description,
        deadline: newActivity.deadline.toISOString(),
        max_points: newActivity.max_points,
        section_id: newActivity.section_id,
        subject_id: newActivity.subject_id,
      };
      await apiClient.post('/teacher/activities', payload);
      Alert.alert('Success', 'Activity created');
      setModalVisible(false);
      resetForm();
      fetchActivities();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create activity');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewActivity({
      title: '',
      description: '',
      deadline: new Date(),
      max_points: 100,
      section_id: 0,
      subject_id: 0,
    });
  };

  const showDatepicker = () => {
    setMode('date');
    setShowDatePicker(true);
  };

  const showTimepicker = () => {
    setMode('time');
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      if (mode === 'date') {
        setTempDate(selectedDate);
        showTimepicker();
      } else {
        const finalDate = new Date(tempDate);
        finalDate.setHours(selectedDate.getHours());
        finalDate.setMinutes(selectedDate.getMinutes());
        setNewActivity({ ...newActivity, deadline: finalDate });
        if (Platform.OS === 'ios') {
          setShowDatePicker(false);
        }
      }
    }
  };

  const handleSectionChange = (itemValue: number) => {
    const section = sections.find(s => s.id === itemValue);
    setNewActivity({
      ...newActivity,
      section_id: itemValue,
      subject_id: section ? section.id : 0,
    });
  };

  // Fetch submissions for selected activity
 const fetchSubmissions = async (activityId: number) => {
  setLoadingSubmissions(true);
  try {
    const res = await apiClient.get(`/teacher/activities/${activityId}/submissions`);
    console.log('Submissions response:', JSON.stringify(res.data, null, 2));
    
    // Check each submission's image_path
    res.data.forEach((sub: Submission, index: number) => {
      console.log(`Submission ${index + 1} image_path:`, sub.image_path);
    });
    
    setSubmissions(res.data);
  } catch (err: any) {
    Alert.alert('Error', err.response?.data?.message || 'Failed to load submissions');
  } finally {
    setLoadingSubmissions(false);
  }
};

  const openSubmissionsModal = async (activity: Activity) => {
    setSelectedActivity(activity);
    setSubmissionsModalVisible(true);
    await fetchSubmissions(activity.id);
  };

  const handleGradeSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradePoints(submission.points_earned?.toString() || '');
    setFeedback(submission.feedback || '');
    setShowGradeModal(true);
  };

  const submitGrade = async () => {
    if (!selectedSubmission) return;
    
    const points = parseInt(gradePoints);
    if (isNaN(points) || points < 0 || (selectedActivity && points > selectedActivity.max_points)) {
      Alert.alert('Error', `Points must be between 0 and ${selectedActivity?.max_points}`);
      return;
    }

    setSubmittingGrade(true);
    try {
      await apiClient.post(`/teacher/submissions/${selectedSubmission.id}/grade`, {
        points_earned: points,
        feedback: feedback.trim() || null
      });
      
      Alert.alert('Success', 'Grade submitted successfully');
      setShowGradeModal(false);
      setGradePoints('');
      setFeedback('');
      if (selectedActivity) {
        await fetchSubmissions(selectedActivity.id);
        fetchActivities();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to grade submission');
    } finally {
      setSubmittingGrade(false);
    }
  };

  const viewImage = (imagePath: string | null) => {
    if (!imagePath) {
      Alert.alert('Error', 'No image available for this submission');
      return;
    }
    setSelectedImage(imagePath);
    setShowImageModal(true);
  };

  const getFullImageUrl = (url: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `http://10.0.0.79:8000${url}`;
};

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (submissionsFilter === 'all') return true;
    return sub.status === submissionsFilter;
  });

  const submittedCount = submissions.filter(s => s.status === 'submitted').length;
  const gradedCount = submissions.filter(s => s.status === 'graded').length;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2C3647" /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.navRow}>
          <Text style={[styles.brandTitle, { color: colors.text }]}>Activities</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Feather name="plus" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {['all', 'active', 'overdue'].map((f) => (
            <TouchableOpacity 
              key={f} 
              onPress={() => setFilter(f as any)}
              style={[styles.filterTab, filter === f && styles.activeFilterTab]}
            >
              <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredActivities.map((activity) => {
          const due = getDueStatus(activity.deadline);
          const needsGrading = activity.submitted - activity.graded;

          return (
            <View key={activity.id} style={[styles.activityItem, { backgroundColor: colors.cardBg }]}>
              <View style={styles.itemMain}>
                <View style={[styles.leftBorder, { backgroundColor: colors.primary }]} />
                <View style={styles.contentBody}>
                  <View style={styles.rowJustify}>
                    <Text style={[styles.subjectText, { color: colors.primary }]}>{activity.subject} — {activity.section}</Text>
                    <Text style={[styles.statusText, { color: due.color }]}>{due.label}</Text>
                  </View>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>{activity.title}</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statLine}>
                      <MaterialCommunityIcons name="account-group-outline" size={14} color={colors.muted} />
                      <Text style={[styles.statText, { color: colors.muted }]}>{activity.submitted} turned in</Text>
                    </View>
                    <View style={styles.statLine}>
                      <MaterialCommunityIcons name="pencil-box-outline" size={14} color={needsGrading > 0 ? colors.primary : colors.muted} />
                      <Text style={[styles.statText, needsGrading > 0 && styles.highlightStat, { color: needsGrading > 0 ? colors.primary : colors.muted }]}>
                        {needsGrading} pending
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => openSubmissionsModal(activity)}
                  style={styles.chevronButton}
                  activeOpacity={0.7}
                >
                  <Feather name="chevron-right" size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filteredActivities.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.muted }]}>No activities to display</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Activity Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Activity</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Section</Text>
              <View style={[styles.pickerWrapper, { borderColor: colors.border }]}>
                <Picker
                  selectedValue={newActivity.section_id}
                  onValueChange={handleSectionChange}
                >
                  <Picker.Item label="Select section" value={0} />
                  {sections.map(section => (
                    <Picker.Item
                      key={section.id}
                      label={`${section.grade_level === 0 ? 'Kinder' : `Grade ${section.grade_level}`} - ${section.section_name} (${section.subject_name})`}
                      value={section.id}
                    />
                  ))}
                </Picker>
              </View>

              {newActivity.section_id !== 0 && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Subject</Text>
                  <Text style={[styles.staticText, { backgroundColor: colors.inputBg, color: colors.text }]}>
                    {sections.find(s => s.id === newActivity.section_id)?.subject_name || 'N/A'}
                  </Text>
                </>
              )}

              <Text style={[styles.inputLabel, { color: colors.text }]}>Title *</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
                placeholder="e.g., Math Quiz 1"
                placeholderTextColor={colors.muted}
                value={newActivity.title}
                onChangeText={txt => setNewActivity({ ...newActivity, title: txt })}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Description (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
                placeholder="Add instructions or notes"
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                value={newActivity.description}
                onChangeText={txt => setNewActivity({ ...newActivity, description: txt })}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Deadline</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity style={[styles.dateButtonSmall, { borderColor: colors.border }]} onPress={showDatepicker}>
                  <Feather name="calendar" size={18} color={colors.text} />
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {newActivity.deadline.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dateButtonSmall, { borderColor: colors.border }]} onPress={showTimepicker}>
                  <Feather name="clock" size={18} color={colors.text} />
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {newActivity.deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={newActivity.deadline}
                  mode={mode}
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                />
              )}

              <Text style={[styles.inputLabel, { color: colors.text }]}>Max Points</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
                keyboardType="numeric"
                value={String(newActivity.max_points)}
                onChangeText={txt => setNewActivity({ ...newActivity, max_points: parseInt(txt) || 0 })}
              />

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleAddActivity}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Activity</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Submissions Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={submissionsModalVisible}
        onRequestClose={() => setSubmissionsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Submissions</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  {selectedActivity?.title} - {selectedActivity?.subject}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSubmissionsModalVisible(false)}>
                <Feather name="x" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Submissions Filter */}
            <View style={styles.subFilterContainer}>
              {['all', 'submitted', 'graded'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.subFilterTab, submissionsFilter === f && styles.subFilterTabActive]}
                  onPress={() => setSubmissionsFilter(f as any)}
                >
                  <Text style={[styles.subFilterText, submissionsFilter === f && styles.subFilterTextActive]}>
                    {f.toUpperCase()}
                  </Text>
                  <Text style={[styles.subFilterCount, submissionsFilter === f && styles.subFilterCountActive]}>
                    {f === 'all' ? submissions.length : f === 'submitted' ? submittedCount : gradedCount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingSubmissions ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.subLoading} />
              ) : (
                filteredSubmissions.map((submission) => (
                  <View key={submission.id} style={[styles.submissionCard, { backgroundColor: colors.inputBg }]}>
                    <View style={styles.subCardHeader}>
                      <View>
                        <Text style={[styles.subStudentName, { color: colors.text }]}>{submission.student_name}</Text>
                        <Text style={[styles.subStudentLrn, { color: colors.muted }]}>LRN: {submission.lrn}</Text>
                      </View>
                      <View style={[styles.subStatusBadge, { 
                        backgroundColor: submission.status === 'graded' ? colors.success + '20' : colors.warning + '20' 
                      }]}>
                        <Text style={[styles.subStatusText, { 
                          color: submission.status === 'graded' ? colors.success : colors.warning 
                        }]}>
                          {submission.status === 'graded' ? 'Graded' : 'Pending'}
                        </Text>
                      </View>
                    </View>

                    {/* Image Preview - with null check */}
                   {submission.image_path ? (
  <TouchableOpacity 
    style={styles.subImagePreview}
    onPress={() => viewImage(submission.image_path)}
  >
    <Image 
      source={{ uri: getFullImageUrl(submission.image_path) ?? undefined }} 
      style={styles.subImage}
      resizeMode="cover"
    />
    <Text style={[styles.subViewImageText, { color: colors.primary }]}>Tap to view</Text>
  </TouchableOpacity>
) : (
  <View style={[styles.subImagePlaceholder, { backgroundColor: colors.cardBg }]}>
    <Feather name="image" size={32} color={colors.muted} />
    <Text style={[styles.subNoImageText, { color: colors.muted }]}>No image submitted</Text>
  </View>
)}

                    <View style={styles.subCardFooter}>
                      <Text style={[styles.subDateText, { color: colors.muted }]}>
                        Submitted: {formatDate(submission.submitted_at)}
                      </Text>
                      {submission.points_earned !== null && (
                        <Text style={[styles.subScoreText, { color: colors.success }]}>
                          Score: {submission.points_earned}/{selectedActivity?.max_points}
                        </Text>
                      )}
                    </View>

                    {submission.feedback && (
                      <View style={[styles.subFeedbackContainer, { backgroundColor: colors.cardBg }]}>
                        <Text style={[styles.subFeedbackText, { color: colors.text }]}>{submission.feedback}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.subGradeButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleGradeSubmission(submission)}
                    >
                      <Feather name="edit-2" size={14} color="#fff" />
                      <Text style={styles.subGradeButtonText}>
                        {submission.status === 'graded' ? 'Edit Grade' : 'Give Grade'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {!loadingSubmissions && filteredSubmissions.length === 0 && (
                <View style={styles.subEmptyContainer}>
                  <Text style={[styles.subEmptyText, { color: colors.muted }]}>No submissions found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Grade Modal */}
      <Modal
        visible={showGradeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGradeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Grade Submission</Text>
              <TouchableOpacity onPress={() => setShowGradeModal(false)}>
                <Feather name="x" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Student: {selectedSubmission?.student_name}</Text>
            
            <Text style={[styles.modalLabel, { color: colors.text }]}>Points (max: {selectedActivity?.max_points})</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
              keyboardType="numeric"
              value={gradePoints}
              onChangeText={setGradePoints}
              placeholder={`0 - ${selectedActivity?.max_points}`}
              placeholderTextColor={colors.muted}
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Feedback (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
              multiline
              numberOfLines={3}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Write feedback for the student..."
              placeholderTextColor={colors.muted}
            />

            <TouchableOpacity
              style={[styles.modalSubmitButton, { backgroundColor: colors.primary }]}
              onPress={submitGrade}
              disabled={submittingGrade}
            >
              {submittingGrade ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Submit Grade</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setShowImageModal(false)}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
         {selectedImage && (
  <Image 
    source={{ uri: getFullImageUrl(selectedImage) ?? undefined }} 
    style={styles.fullImage}
    resizeMode="contain"
  />
)}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DF',
  },
  navRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    height: 60 
  },
  brandTitle: { 
    fontSize: 20, 
    fontWeight: '700',
  },
  addButton: { padding: 8 },
  filterRow: { flexDirection: 'row', gap: 20, marginBottom: 10 },
  filterTab: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeFilterTab: { borderBottomColor: '#C4B196' },
  filterText: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 1 },
  activeFilterText: { color: '#2C3647' },
  activityItem: { 
    borderBottomWidth: 1, 
    borderBottomColor: '#EAE6DF',
  },
  itemMain: { flexDirection: 'row', alignItems: 'center', paddingRight: 15 },
  leftBorder: { width: 4, height: '60%', borderRadius: 2 },
  contentBody: { flex: 1, paddingVertical: 20, paddingHorizontal: 15 },
  rowJustify: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  subjectText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statusText: { fontSize: 11, fontWeight: '600' },
  activityTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 15 },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 12 },
  highlightStat: { fontWeight: '700' },
  chevronButton: { padding: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', maxHeight: '80%', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 12, marginTop: 4 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  staticText: { padding: 12, borderRadius: 8, fontSize: 14 },
  textInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12 },
  textArea: { height: 80, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dateButtonSmall: { 
    flex: 1, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8,
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 12 
  },
  dateButtonText: { fontSize: 14 },
  submitButton: { padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  pickerWrapper: { borderWidth: 1, borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
  // Submissions modal styles
  subFilterContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  subFilterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  subFilterTabActive: { backgroundColor: '#2C3647' },
  subFilterText: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  subFilterTextActive: { color: '#fff' },
  subFilterCount: { fontSize: 10, fontWeight: '600', color: '#6b7280' },
  subFilterCountActive: { color: '#fff' },
  subLoading: { marginTop: 40 },
  submissionCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  subCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subStudentName: { fontSize: 14, fontWeight: '600' },
  subStudentLrn: { fontSize: 10, marginTop: 2 },
  subStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  subStatusText: { fontSize: 10, fontWeight: '600' },
  subImagePreview: { alignItems: 'center', marginBottom: 12 },
  subImage: { width: '100%', height: 150, borderRadius: 12 },
  subViewImageText: { fontSize: 11, marginTop: 6 },
  subImagePlaceholder: { width: '100%', height: 150, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  subNoImageText: { fontSize: 12, marginTop: 8 },
  subCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subDateText: { fontSize: 11 },
  subScoreText: { fontSize: 12, fontWeight: '600' },
  subFeedbackContainer: { padding: 10, borderRadius: 12, marginBottom: 12 },
  subFeedbackText: { fontSize: 12 },
  subGradeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12 },
  subGradeButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  subEmptyContainer: { alignItems: 'center', marginTop: 40 },
  subEmptyText: { fontSize: 14 },
  // Grade modal styles
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  modalTextArea: { height: 80, textAlignVertical: 'top' },
  modalSubmitButton: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  modalSubmitText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  // Image modal styles
  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  imageModalClose: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 },
  fullImage: { width: '100%', height: '80%' },
});