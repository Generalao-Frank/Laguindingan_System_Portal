import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';

interface Student {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  lrn: string;
  grade_id: number | null;
  written_works: number;
  performance_tasks: number;
  quarterly_assessment: number;
  final_grade: number | null;
  status: string;
}

interface RouteParams {
  subject_id: number;
  subject_name: string;
  section_id: number;
  section_name: string;
  grade_level: number;
  quarter_id: number;
}

export default function GradeEncodingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editedGrades, setEditedGrades] = useState<{[key: number]: Student}>({});

  const fetchStudents = useCallback(async () => {
    try {
      const res = await apiClient.get('/teacher/grades/students', {
        params: {
          subject_id: params.subject_id,
          section_id: params.section_id,
          quarter_id: params.quarter_id,
        }
      });
      setStudents(res.data.students);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  const updateGrade = (enrollmentId: number, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const validValue = Math.min(100, Math.max(0, numValue));
    
    setEditedGrades(prev => {
      const existing = prev[enrollmentId] || students.find(s => s.enrollment_id === enrollmentId)!;
      const updated = { ...existing, [field]: validValue };
      // Auto-calculate final grade
      const written = field === 'written_works' ? validValue : (updated.written_works);
      const performance = field === 'performance_tasks' ? validValue : (updated.performance_tasks);
      const quarterly = field === 'quarterly_assessment' ? validValue : (updated.quarterly_assessment);
      updated.final_grade = Math.round((written + performance + quarterly) / 3);
      return { ...prev, [enrollmentId]: updated };
    });
  };

  const saveGrade = async (student: Student) => {
    const edited = editedGrades[student.enrollment_id];
    const dataToSave = edited || student;
    
    try {
      await apiClient.post('/teacher/grades/save', {
        enrollment_id: dataToSave.enrollment_id,
        subject_id: params.subject_id,
        quarter_id: params.quarter_id,
        written_works: dataToSave.written_works,
        performance_tasks: dataToSave.performance_tasks,
        quarterly_assessment: dataToSave.quarterly_assessment,
      });
      
      // Update local state
      setStudents(prev => prev.map(s => 
        s.enrollment_id === dataToSave.enrollment_id ? dataToSave : s
      ));
      setEditedGrades(prev => {
        const newPrev = { ...prev };
        delete newPrev[student.enrollment_id];
        return newPrev;
      });
      Alert.alert('Success', 'Grade saved');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save grade');
    }
  };

  const submitAllGrades = async () => {
    Alert.alert(
      'Submit for Approval',
      'Are you sure you want to submit all grades for this subject? Once submitted, you cannot edit until admin approves or rejects.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await apiClient.post('/teacher/grades/submit', {
                subject_id: params.subject_id,
                section_id: params.section_id,
                quarter_id: params.quarter_id,
              });
              Alert.alert('Success', 'Grades submitted for approval');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to submit');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const getGradeDisplay = (grade: number) => {
    if (grade >= 90) return { color: '#10b981', label: 'Excellent' };
    if (grade >= 80) return { color: '#3b82f6', label: 'Good' };
    if (grade >= 75) return { color: '#f59e0b', label: 'Passing' };
    return { color: '#ef4444', label: 'Failed' };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2C3647" />
      </View>
    );
  }

  const pendingCount = Object.keys(editedGrades).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2C3647" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{params.subject_name}</Text>
            <Text style={styles.headerSubtitle}>
              {params.grade_level === 0 ? 'Kinder' : `Grade ${params.grade_level}`} - {params.section_name}
            </Text>
          </View>
          <TouchableOpacity onPress={submitAllGrades} disabled={submitting} style={styles.submitBtn}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
          </TouchableOpacity>
        </View>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{pendingCount} unsaved grade(s)</Text>
          </View>
        )}
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {students.map((student) => {
          const edited = editedGrades[student.enrollment_id];
          const display = edited || student;
          const finalGrade = display.final_grade;
          const gradeStyle = finalGrade ? getGradeDisplay(finalGrade) : null;
          
          return (
            <View key={student.enrollment_id} style={styles.studentCard}>
              <View style={styles.studentHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{student.student_name.charAt(0)}</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.student_name}</Text>
                  <Text style={styles.studentLRN}>LRN: {student.lrn}</Text>
                </View>
                {finalGrade !== null && (
                  <View style={[styles.finalGradeBadge, { backgroundColor: gradeStyle?.color + '20' }]}>
                    <Text style={[styles.finalGradeText, { color: gradeStyle?.color }]}>{finalGrade}%</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.gradeRow}>
                <View style={styles.gradeField}>
                  <Text style={styles.gradeLabel}>Written Works</Text>
                  <TextInput
                    style={styles.gradeInput}
                    keyboardType="numeric"
                    value={String(display.written_works)}
                    onChangeText={(val) => updateGrade(student.enrollment_id, 'written_works', val)}
                  />
                </View>
                <View style={styles.gradeField}>
                  <Text style={styles.gradeLabel}>Performance Tasks</Text>
                  <TextInput
                    style={styles.gradeInput}
                    keyboardType="numeric"
                    value={String(display.performance_tasks)}
                    onChangeText={(val) => updateGrade(student.enrollment_id, 'performance_tasks', val)}
                  />
                </View>
                <View style={styles.gradeField}>
                  <Text style={styles.gradeLabel}>Quarterly Assessment</Text>
                  <TextInput
                    style={styles.gradeInput}
                    keyboardType="numeric"
                    value={String(display.quarterly_assessment)}
                    onChangeText={(val) => updateGrade(student.enrollment_id, 'quarterly_assessment', val)}
                  />
                </View>
              </View>
              
              {edited && (
                <TouchableOpacity style={styles.saveBtn} onPress={() => saveGrade(student)}>
                  <Feather name="save" size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F2' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#2C3647' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  backButton: { padding: 8, marginLeft: -8 },
  submitBtn: { backgroundColor: '#2C3647', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  pendingBadge: { marginTop: 8, alignItems: 'center' },
  pendingText: { fontSize: 12, color: '#f59e0b' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  studentCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 2, shadowOpacity: 0.03, shadowRadius: 6 },
  studentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '600', color: '#475569' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  studentLRN: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  finalGradeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  finalGradeText: { fontSize: 14, fontWeight: '700' },
  gradeRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gradeField: { flex: 1 },
  gradeLabel: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  gradeInput: { backgroundColor: '#F9F7F2', borderRadius: 12, padding: 10, fontSize: 14, color: '#2C3647', textAlign: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  saveBtn: { flexDirection: 'row', backgroundColor: '#C4B196', paddingVertical: 10, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});