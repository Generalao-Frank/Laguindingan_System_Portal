import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';

const { width } = Dimensions.get('window');

interface QuarterGrade {
  quarter: number;
  written_works: number;
  performance_tasks: number;
  quarterly_assessment: number;
  final_grade: number | null;
}

interface Grade {
  subject: string;
  teacher: string;
  quarters: QuarterGrade[];
}

interface Profile {
  first_name: string;
  last_name: string;
  grade_level: string;
  section: string;
  lrn: string;
}

export default function StudentGradesScreen() {
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

  const [grades, setGrades] = useState<Grade[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const [expandedQuarter, setExpandedQuarter] = useState<{subjectIndex: number, quarter: number} | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const [gradesRes, profileRes] = await Promise.all([
        apiClient.get('/student/grades', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        apiClient.get('/student/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      console.log('Grades response:', JSON.stringify(gradesRes.data, null, 2));
      setGrades(gradesRes.data.grades);
      setProfile(profileRes.data.profile);
    } catch (error) {
      console.error('Failed to fetch grades:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getGradeColor = (grade: number | null) => {
    if (!grade) return colors.muted;
    if (grade >= 90) return colors.success;
    if (grade >= 80) return colors.primary;
    if (grade >= 75) return colors.warning;
    return colors.danger;
  };

  const getRemarksText = (grade: number | null) => {
    if (!grade) return 'No Grade';
    if (grade >= 75) return 'Passed';
    return 'Failed';
  };

  const calculateAverage = (): number => {
    let allQuarters: number[] = [];
    grades.forEach(subject => {
      subject.quarters.forEach(quarter => {
        if (quarter.final_grade !== null) {
          allQuarters.push(quarter.final_grade);
        }
      });
    });
    
    if (allQuarters.length === 0) return 0;
    const sum = allQuarters.reduce((a, b) => a + b, 0);
    return Number((sum / allQuarters.length).toFixed(2));
  };

  const getGeneralAverageRemarks = (avg: number): string => {
    if (avg >= 90) return 'Excellent';
    if (avg >= 80) return 'Very Good';
    if (avg >= 75) return 'Passed';
    return 'Needs Improvement';
  };

  const toggleSubject = (index: number) => {
    if (expandedSubject === index) {
      setExpandedSubject(null);
      setExpandedQuarter(null);
    } else {
      setExpandedSubject(index);
      setExpandedQuarter(null);
    }
  };

  const toggleQuarter = (subjectIndex: number, quarter: number) => {
    if (expandedQuarter?.subjectIndex === subjectIndex && expandedQuarter?.quarter === quarter) {
      setExpandedQuarter(null);
    } else {
      setExpandedQuarter({ subjectIndex, quarter });
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2C3647" />
      </View>
    );
  }

  const averageGrade: number = calculateAverage();
  const averageColor = getGradeColor(averageGrade);
  const averageRemarks = getGeneralAverageRemarks(averageGrade);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Grades</Text>
          <View style={styles.headerBadge}>
            <Feather name="book-open" size={16} color={colors.text} />
            <Text style={[styles.headerBadgeText, { color: colors.muted }]}>{grades.length} Subjects</Text>
          </View>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          {profile?.grade_level || 'Grade'} • {profile?.section || 'Section'}
        </Text>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* General Average Card */}
        <View style={[styles.avgCard, { backgroundColor: colors.cardBg }]}>
          <View style={styles.avgHeader}>
            <Text style={[styles.avgTitle, { color: colors.text }]}>📊 General Average</Text>
            <View style={[styles.avgBadge, { backgroundColor: averageColor + '20' }]}>
              <Text style={[styles.avgBadgeText, { color: averageColor }]}>{averageRemarks}</Text>
            </View>
          </View>
          <View style={styles.avgValueContainer}>
            <Text style={[styles.avgValue, { color: averageColor }]}>{averageGrade}%</Text>
          </View>
        </View>

        {/* Subject Cards */}
        <View style={styles.gradesWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📚 Subject Grades</Text>
          
          {grades.map((item, subjectIndex) => {
            const isExpanded = expandedSubject === subjectIndex;
            const finalRating = item.quarters[3]?.final_grade || null;
            const remarks = getRemarksText(finalRating);
            const remarksColor = finalRating && finalRating >= 75 ? colors.success : colors.danger;
            
            return (
              <View key={subjectIndex} style={[styles.subjectCard, { backgroundColor: colors.cardBg }]}>
                {/* Card Header - Tappable to expand/collapse */}
                <TouchableOpacity onPress={() => toggleSubject(subjectIndex)} activeOpacity={0.7}>
                  <View style={styles.cardHeader}>
                    <View style={styles.subjectInfo}>
                      <View style={[styles.subjectIcon, { backgroundColor: colors.inputBg }]}>
                        <Feather name="book" size={18} color={colors.text} />
                      </View>
                      <View>
                        <Text style={[styles.subjectName, { color: colors.text }]}>{item.subject}</Text>
                        <Text style={[styles.teacherName, { color: colors.muted }]}>{item.teacher}</Text>
                      </View>
                    </View>
                    <View style={styles.rightHeader}>
                      <View style={[styles.remarksBadge, { backgroundColor: remarksColor + '20' }]}>
                        <Text style={[styles.remarksText, { color: remarksColor }]}>{remarks}</Text>
                      </View>
                      <Feather 
                        name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                        size={20} 
                        color={colors.muted} 
                      />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Quarters Summary - Visible when expanded */}
                {isExpanded && (
                  <View>
                    {/* Quarters Row - 1st, 2nd, 3rd, 4th horizontally */}
                    <View style={styles.quartersRow}>
                      {item.quarters.map((quarter, qIndex) => {
                        const quarterName = quarter.quarter === 1 ? '1st' : quarter.quarter === 2 ? '2nd' : quarter.quarter === 3 ? '3rd' : '4th';
                        const isQuarterExpanded = expandedQuarter?.subjectIndex === subjectIndex && expandedQuarter?.quarter === quarter.quarter;
                        
                        return (
                          <View key={qIndex} style={styles.quarterWrapper}>
                            <TouchableOpacity
                              style={styles.quarterButton}
                              onPress={() => toggleQuarter(subjectIndex, quarter.quarter)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.quarterLabel, { color: colors.muted }]}>{quarterName}</Text>
                              <Text style={[styles.quarterValue, { color: getGradeColor(quarter.final_grade) }]}>
                                {quarter.final_grade || '—'}%
                              </Text>
                              <Feather 
                                name={isQuarterExpanded ? 'chevron-up' : 'chevron-down'} 
                                size={12} 
                                color={colors.muted} 
                              />
                            </TouchableOpacity>

                            {/* Expanded Breakdown for this quarter */}
                            {isQuarterExpanded && (
                              <View style={[styles.expandedBreakdown, { backgroundColor: colors.inputBg }]}>
                                <View style={styles.breakdownRow}>
                                  <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownLabel, { color: colors.muted }]}>WW</Text>
                                    <Text style={[styles.breakdownValue, { color: colors.text }]}>{quarter.written_works}%</Text>
                                  </View>
                                  <View style={styles.breakdownDivider} />
                                  <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownLabel, { color: colors.muted }]}>PT</Text>
                                    <Text style={[styles.breakdownValue, { color: colors.text }]}>{quarter.performance_tasks}%</Text>
                                  </View>
                                  <View style={styles.breakdownDivider} />
                                  <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownLabel, { color: colors.muted }]}>QA</Text>
                                    <Text style={[styles.breakdownValue, { color: colors.text }]}>{quarter.quarterly_assessment}%</Text>
                                  </View>
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Final Rating at the bottom of the subject card */}
                    <View style={styles.finalRatingContainer}>
                      <Text style={[styles.finalRatingLabel, { color: colors.text }]}>Final Rating:</Text>
                      <Text style={[styles.finalRatingValue, { color: getGradeColor(finalRating) }]}>
                        {finalRating || '—'}%
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {grades.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
              <Feather name="inbox" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No grades available</Text>
            </View>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DF',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F9F7F2',
  },
  headerBadgeText: {
    fontSize: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  avgCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  avgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avgTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  avgBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  avgBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  avgValueContainer: {
    alignItems: 'center',
  },
  avgValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  gradesWrapper: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    marginLeft: 4,
  },
  subjectCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
  },
  teacherName: {
    fontSize: 11,
    marginTop: 2,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  remarksBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  remarksText: {
    fontSize: 10,
    fontWeight: '600',
  },
  quartersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
    marginBottom: 12,
  },
  quarterWrapper: {
    flex: 1,
  },
  quarterButton: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9F7F2',
  },
  quarterLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  quarterValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  expandedBreakdown: {
    marginTop: 8,
    padding: 8,
    borderRadius: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 8,
    marginBottom: 2,
    textAlign: 'center',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  breakdownDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#EAE6DF',
  },
  finalRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#EAE6DF',
    gap: 8,
  },
  finalRatingLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  finalRatingValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
});