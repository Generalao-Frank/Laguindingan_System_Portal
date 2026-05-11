import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather, Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';

// Define the param list type for navigation
type RootStackParamList = {
  GradeEncoding: {
    subject_id: number;
    subject_name: string;
    section_id: number;
    section_name: string;
    grade_level: number;
    quarter_id: number;
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'GradeEncoding'>;

interface Assignment {
  subject_id: number;
  subject_name: string;
  section_id: number;
  section_name: string;
  grade_level: number;
  grade_display: string;
}

export default function GradeSubjectsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState(1);

  const quarters = [
    { id: 1, name: '1st Quarter' },
    { id: 2, name: '2nd Quarter' },
    { id: 3, name: '3rd Quarter' },
    { id: 4, name: '4th Quarter' },
  ];

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await apiClient.get('/teacher/grades/subjects');
      setAssignments(res.data.assignments);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSubjects();
    }, [fetchSubjects])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubjects();
  };

  const handleSelectSubject = (assignment: Assignment) => {
    navigation.navigate('GradeEncoding', {
      subject_id: assignment.subject_id,
      subject_name: assignment.subject_name,
      section_id: assignment.section_id,
      section_name: assignment.section_name,
      grade_level: assignment.grade_level,
      quarter_id: selectedQuarter,
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2C3647" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2C3647" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Grade Encoding</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quarter Selector */}
        <View style={styles.quarterSection}>
          <Text style={styles.sectionTitle}>Select Quarter</Text>
          <View style={styles.quarterRow}>
            {quarters.map((q) => (
              <TouchableOpacity
                key={q.id}
                style={[styles.quarterBtn, selectedQuarter === q.id && styles.quarterBtnActive]}
                onPress={() => setSelectedQuarter(q.id)}
              >
                <Text style={[styles.quarterText, selectedQuarter === q.id && styles.quarterTextActive]}>
                  {q.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subjects List */}
        <Text style={styles.sectionTitle}>My Subjects</Text>
        {assignments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="book-open" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No subjects assigned</Text>
          </View>
        ) : (
          assignments.map((assignment, index) => (
            <TouchableOpacity
              key={index}
              style={styles.subjectCard}
              onPress={() => handleSelectSubject(assignment)}
            >
              <View style={styles.subjectIcon}>
                <Feather name="book" size={24} color="#C4B196" />
              </View>
              <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>{assignment.subject_name}</Text>
                <Text style={styles.subjectDetail}>
                  {assignment.grade_display} - {assignment.section_name}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#C4B196" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F2' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#2C3647' },
  backButton: { padding: 8, marginLeft: -8 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  quarterSection: { marginTop: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#2C3647', marginBottom: 12 },
  quarterRow: { flexDirection: 'row', gap: 12 },
  quarterBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  quarterBtnActive: { backgroundColor: '#2C3647', borderColor: '#2C3647' },
  quarterText: { fontSize: 14, color: '#64748b' },
  quarterTextActive: { color: '#fff' },
  subjectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6 },
  subjectIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F9F7F2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  subjectDetail: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 12 },
});