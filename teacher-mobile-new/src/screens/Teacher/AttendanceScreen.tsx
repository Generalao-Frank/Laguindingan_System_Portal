import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Alert, Dimensions, TextInput, Platform, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../../api/client';

const { width } = Dimensions.get('window');

interface TeacherSection {
  id: number;
  grade_level: number;
  section_name: string;
  subject_name: string;
}

interface Student {
  enrollment_id: number;
  student_name: string;
  lrn: string;
  section: string;
  status: string | null;
  time_in: string | null;
  time_out: string | null;
}

interface AttendanceHistoryRecord {
  id: number;
  date: string;
  status: string;
  time_in: string | null;
  time_out: string | null;
}

export default function AttendanceScreen() {
  const [sections, setSections] = useState<TeacherSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<TeacherSection | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // History modal states
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchSections = useCallback(async () => {
    try {
      const res = await apiClient.get('/teacher/sections');
      setSections(res.data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load sections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchStudentsForSection = useCallback(async (section: TeacherSection) => {
    try {
      const res = await apiClient.get('/teacher/attendance');
      const filtered = res.data.filter((s: Student) => s.section === section.section_name);
      setStudents(filtered);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load students');
    }
  }, []);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  useEffect(() => {
    if (selectedSection) fetchStudentsForSection(selectedSection);
  }, [selectedSection, fetchStudentsForSection]);

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedSection) fetchStudentsForSection(selectedSection);
    else fetchSections();
  };

  const markAttendance = async (enrollment_id: number, status: string) => {
    setMarkingId(enrollment_id);
    try {
      const now = new Date();
      const timeIn24 = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      await apiClient.post('/teacher/attendance/mark', {
        enrollment_id,
        status,
        time_in: status === 'Present' || status === 'Late' ? timeIn24 : null,
      });
      if (selectedSection) await fetchStudentsForSection(selectedSection);
      Alert.alert('Success', `Marked as ${status}`);
      setEditingId(null);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarkingId(null);
    }
  };

  const handleGlobalTimeOut = async () => {
    const eligibleStudents = students.filter(s => (s.status === 'Present' || s.status === 'Late') && !s.time_out);
    if (eligibleStudents.length === 0) {
      Alert.alert('Info', 'No students to time out');
      return;
    }
    Alert.alert(
      'Global Time Out',
      `Mark time out for ${eligibleStudents.length} student(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const enrollment_ids = eligibleStudents.map(s => s.enrollment_id);
              await apiClient.post('/teacher/attendance/bulk-timeout', { enrollment_ids });
              if (selectedSection) await fetchStudentsForSection(selectedSection);
              Alert.alert('Success', `${eligibleStudents.length} student(s) timed out`);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed');
            }
          },
        },
      ]
    );
  };

  const viewHistory = async (student: Student) => {
    setSelectedStudentForHistory(student);
    setHistoryModalVisible(true);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get(`/teacher/attendance/history/${student.enrollment_id}`);
      setHistoryRecords(res.data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load history');
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatTime12 = (timeStr: string | null) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const getStatusStyle = (status: string | null) => {
    if (status === 'Present') return { color: '#C4B196', label: 'Present', icon: 'checkmark-circle' };
    if (status === 'Late') return { color: '#A8A196', label: 'Late', icon: 'time-outline' };
    if (status === 'Absent') return { color: '#ef4444', label: 'Absent', icon: 'close-circle-outline' };
    return { color: '#999', label: 'Pending', icon: 'radio-button-off' };
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => s.student_name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [students, searchQuery]);

  const stats = useMemo(() => ({
    present: students.filter(s => s.status === 'Present').length,
    absent: students.filter(s => s.status === 'Absent').length,
    total: students.length
  }), [students]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2C3647" /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.header}>
        {!selectedSection ? (
          <View style={styles.navRow}>
            <TouchableOpacity>
              <Ionicons name="layers-outline" size={24} color="#2C3647" />
            </TouchableOpacity>
            <Text style={styles.brandTitle}>Luxury</Text>
            <TouchableOpacity>
              <Ionicons name="filter-outline" size={24} color="#2C3647" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.navRow}>
            <TouchableOpacity onPress={handleGlobalTimeOut} style={styles.globalTimeoutBtn}>
              <Feather name="clock" size={18} color="#fff" />
              <Text style={styles.globalTimeoutText}>Time Out All</Text>
            </TouchableOpacity>
            <Text style={styles.brandTitle}>Roster</Text>
            <TouchableOpacity onPress={() => setSelectedSection(null)}>
              <Ionicons name="close-outline" size={24} color="#2C3647" />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {!selectedSection ? (
          <>
            <Text style={styles.sectionHeader}>Attendance Sections</Text>
            <View style={styles.sectionsGrid}>
              {sections.map((section) => (
                <TouchableOpacity key={section.id} style={styles.sectionCard} onPress={() => setSelectedSection(section)}>
                  <View style={styles.iconBox}>
                    <MaterialCommunityIcons name="google-classroom" size={24} color="#2C3647" />
                  </View>
                  <Text style={styles.sectionGrade}>{section.grade_level === 0 ? 'Kinder' : `Grade ${section.grade_level}`}</Text>
                  <Text style={styles.sectionName}>{section.section_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{stats.total}</Text>
                <Text style={styles.statLab}>Students</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, {color: '#C4B196'}]}>{stats.present}</Text>
                <Text style={styles.statLab}>Present</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, {color: '#ef4444'}]}>{stats.absent}</Text>
                <Text style={styles.statLab}>Absent</Text>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#999" />
              <TextInput 
                style={styles.searchInput}
                placeholder="Search student..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
            </View>

            {filteredStudents.map((student) => {
              const statusStyle = getStatusStyle(student.status);
              const isEditing = editingId === student.enrollment_id;
              return (
                <View key={student.enrollment_id} style={styles.studentCard}>
                  <View style={styles.studentMain}>
                    <View style={styles.avatarPill}>
                       <Text style={styles.avatarLetter}>{student.student_name.charAt(0)}</Text>
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.studentName}>{student.student_name}</Text>
                      <Text style={styles.studentLRN}>LRN: {student.lrn}</Text>
                      <View style={styles.timeRow}>
                        {student.time_in && <Text style={styles.timeText}>⏱ In: {formatTime12(student.time_in)}</Text>}
                        {student.time_out && <Text style={styles.timeText}>🔚 Out: {formatTime12(student.time_out)}</Text>}
                      </View>
                    </View>
                    <View style={styles.studentActions}>
                      <TouchableOpacity onPress={() => viewHistory(student)} style={styles.historyButton}>
                        <Ionicons name="calendar-outline" size={18} color="#64748b" />
                      </TouchableOpacity>
                      {!isEditing && student.status ? (
                        <TouchableOpacity onPress={() => setEditingId(student.enrollment_id)} style={styles.editButton}>
                          <Feather name="edit-2" size={16} color="#64748b" />
                          <Text style={styles.editText}>Edit</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.statusInfo}>
                          <Ionicons name={statusStyle.icon as any} size={16} color={statusStyle.color} />
                          <Text style={[styles.statusLabel, {color: statusStyle.color}]}>{statusStyle.label}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {(!student.status || isEditing) && (
                    <View style={styles.actionGrid}>
                      {['Present', 'Late', 'Absent'].map((stat) => (
                        <TouchableOpacity
                          key={stat}
                          style={[styles.luxuryBtn, stat === 'Present' && styles.primaryBtn]}
                          onPress={() => markAttendance(student.enrollment_id, stat)}
                          disabled={markingId === student.enrollment_id}
                        >
                           {markingId === student.enrollment_id ? (
                             <ActivityIndicator size="small" color={stat === 'Present' ? "#fff" : "#2C3647"} />
                           ) : (
                             <Text style={[styles.btnText, stat === 'Present' && styles.primaryBtnText]}>{stat}</Text>
                           )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* History Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={historyModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendance History</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Feather name="x" size={24} color="#999" />
              </TouchableOpacity>
            </View>
            {selectedStudentForHistory && (
              <Text style={styles.modalSubtitle}>{selectedStudentForHistory.student_name}</Text>
            )}
            {historyLoading ? (
              <ActivityIndicator size="large" color="#2C3647" style={{ marginTop: 20 }} />
            ) : historyRecords.length === 0 ? (
              <Text style={styles.emptyHistory}>No attendance records found.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {historyRecords.map(record => {
                  const statusStyle = getStatusStyle(record.status);
                  return (
                    <View key={record.id} style={styles.historyItem}>
                      <View style={styles.historyDate}>
                        <Text style={styles.historyDateText}>{formatDate(record.date)}</Text>
                      </View>
                      <View style={styles.historyStatus}>
                        <Ionicons name={statusStyle.icon as any} size={16} color={statusStyle.color} />
                        <Text style={[styles.historyStatusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                      </View>
                      {record.time_in && <Text style={styles.historyTime}>In: {formatTime12(record.time_in)}</Text>}
                      {record.time_out && <Text style={styles.historyTime}>Out: {formatTime12(record.time_out)}</Text>}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F2' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 25, paddingTop: 10 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandTitle: { 
    fontSize: 28, 
    fontWeight: '300', 
    color: '#2C3647', 
    fontFamily: Platform.OS === 'ios' ? 'Optima' : 'serif' 
  },
  scrollContent: { paddingHorizontal: 25, paddingBottom: 100 },
  sectionHeader: { fontSize: 18, fontWeight: '600', color: '#2C3647', marginTop: 30, marginBottom: 20 },
  sectionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  sectionCard: {
    width: (width - 65) / 2,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBox: { width: 50, height: 50, backgroundColor: '#F9F7F2', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  sectionGrade: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  sectionName: { fontSize: 12, color: '#999', marginTop: 4 },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 20, marginTop: 20, alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: 'bold', color: '#2C3647' },
  statLab: { fontSize: 10, color: '#999', textTransform: 'uppercase', marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: '#EEE' },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 15, 
    paddingHorizontal: 15, 
    height: 50, 
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#F0EBE0'
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#333' },
  studentCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 },
  studentMain: { flexDirection: 'row', alignItems: 'center' },
  avatarPill: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F9F7F2', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarLetter: { color: '#2C3647', fontWeight: 'bold' },
  studentName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  studentLRN: { fontSize: 11, color: '#999', marginTop: 2 },
  timeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  timeText: { fontSize: 10, color: '#999' },
  studentActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyButton: { padding: 6, backgroundColor: '#F9F7F2', borderRadius: 12 },
  statusInfo: { alignItems: 'flex-end' },
  statusLabel: { fontSize: 10, fontWeight: 'bold', marginTop: 4, textTransform: 'uppercase' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9F7F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  editText: { fontSize: 11, color: '#64748b' },
  actionGrid: { flexDirection: 'row', gap: 10, marginTop: 15, borderTopWidth: 1, borderTopColor: '#F9F7F2', paddingTop: 15 },
  luxuryBtn: { flex: 1, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F7F2' },
  primaryBtn: { backgroundColor: '#2C3647' },
  btnText: { fontSize: 12, fontWeight: '600', color: '#2C3647' },
  primaryBtnText: { color: '#fff' },
  globalTimeoutBtn: { flexDirection: 'row', backgroundColor: '#2C3647', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, alignItems: 'center' },
  globalTimeoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3647' },
  modalSubtitle: { fontSize: 14, color: '#999', marginBottom: 20, textAlign: 'center' },
  emptyHistory: { textAlign: 'center', marginTop: 20, color: '#999' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 12 },
  historyDate: { width: 100 },
  historyDateText: { fontSize: 12, color: '#666' },
  historyStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyStatusText: { fontSize: 12, fontWeight: '600' },
  historyTime: { fontSize: 11, color: '#999', marginLeft: 8 }
});