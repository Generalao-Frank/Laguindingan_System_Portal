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
  // 🎨 High-Graphics Dark Luxury Palette (Pattern Matched)
  const colors = {
    background: '#0F172A',      // Deep slate navy background
    cardBg: '#1E293B',          // Lighter slate for premium cards
    text: '#F8FAFC',            // Crisp white
    muted: '#94A3B8',           // Soft grey-blue
    border: 'rgba(148, 163, 184, 0.1)', // Glassmorphism borders
    inputBg: '#334155',         // High-contrast sub-cards
    success: '#10B981',         // Neon Emerald
    warning: '#F59E0B',         // Cyber Amber
    danger: '#EF4444',          // Crimson Red
    primary: '#6366F1',         // Indigo Electric
    accentBlue: '#38BDF8',      // Light Cyan Accent
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
      setGrades(gradesRes.data.grades || []);
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
    if (grade >= 80) return colors.accentBlue;
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
    if (avg >= 90) return 'Excellent Standing';
    if (avg >= 80) return 'Very Good';
    if (avg >= 75) return 'Good Progress';
    return 'Critical Warning';
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const averageGrade: number = calculateAverage();
  const averageColor = getGradeColor(averageGrade);
  const averageRemarks = getGeneralAverageRemarks(averageGrade);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* Premium Header */}
      <SafeAreaView edges={['top']} style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Academic Analytics</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
              {profile?.grade_level || 'Grade Level'} • {profile?.section || 'Section'}
            </Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Feather name="book-open" size={14} color={colors.primary} />
            <Text style={[styles.headerBadgeText, { color: colors.text }]}>{grades.length} Subjects</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Performance Card with Abstract Decorative Spheres */}
        <View style={[styles.rateCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={[styles.absoluteSphere, { top: -15, right: -15, width: 70, height: 70, backgroundColor: averageColor, opacity: 0.15 }]} />
          <View style={[styles.absoluteSphere, { bottom: -20, right: 40, width: 45, height: 45, backgroundColor: colors.text, opacity: 0.08 }]} />
          <View style={[styles.absoluteSphere, { top: 30, right: 80, width: 25, height: 25, backgroundColor: averageColor, opacity: 0.12 }]} />
          <View style={[styles.absoluteSphere, { bottom: -40, left: '30%', backgroundColor: colors.primary, width: 120, height: 120, opacity: 0.05 }]} />

          <View style={styles.rateHeader}>
            <View style={[styles.rateIconContainer, { backgroundColor: averageColor + '15' }]}>
              <Feather name="activity" size={18} color={averageColor} />
            </View>
            <Text style={[styles.rateTitle, { color: colors.muted }]}>GENERAL REPORT CARD AVERAGE</Text>
          </View>
          
          <View style={styles.rateValueContainer}>
            <Text style={[styles.rateValue, { color: colors.text }]}>{averageGrade}%</Text>
            <Text style={[styles.rateStatusLabel, { color: averageColor }]}>{averageRemarks}</Text>
            
            <View style={[styles.rateBar, { backgroundColor: '#334155' }]}>
              <View 
                style={{
                  width: `${Math.min(Math.max(averageGrade, 0), 100)}%`,
                  height: '100%',
                  borderRadius: 6,
                  backgroundColor: averageColor,
                  shadowColor: averageColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 8,
                  elevation: 5,
                }} 
              />
            </View>
          </View>
        </View>

        {/* Subject Cards Section */}
        <View style={styles.gradesWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Report Log Timeline</Text>
          
          {grades.map((item, subjectIndex) => {
            const isExpanded = expandedSubject === subjectIndex;
            const finalRating = item.quarters[3]?.final_grade || null;
            const remarks = getRemarksText(finalRating);
            const remarksColor = finalRating && finalRating >= 75 ? colors.success : colors.danger;
            
            return (
              <View key={subjectIndex} style={[styles.subjectCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                {/* Micro Ambient Spheres Inside Subject Card */}
                <View style={[styles.absoluteSphere, { right: -10, bottom: -10, width: 45, height: 45, backgroundColor: remarksColor, opacity: 0.05 }]} />
                
                {/* Tappable Card Header */}
                <TouchableOpacity onPress={() => toggleSubject(subjectIndex)} activeOpacity={0.7} style={styles.cardHeader}>
                  <View style={styles.subjectInfo}>
                    <View style={[styles.subjectIcon, { backgroundColor: colors.inputBg }]}>
                      <Feather name="bookmark" size={16} color={colors.accentBlue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subjectName, { color: colors.text }]} numberOfLines={1}>
                        {item.subject}
                      </Text>
                      <Text style={[styles.teacherName, { color: colors.muted }]} numberOfLines={1}>
                        {item.teacher}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.rightHeader}>
                    <View style={[styles.remarksBadge, { backgroundColor: remarksColor + '15', borderColor: remarksColor + '40' }]}>
                      <Text style={[styles.remarksText, { color: remarksColor }]}>{remarks}</Text>
                    </View>
                    <Feather 
                      name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={18} 
                      color={colors.muted} 
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Quarters View */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {/* Horizontal Quarters Row */}
                    <View style={styles.quartersRow}>
                      {item.quarters.map((quarter, qIndex) => {
                        const quarterName = quarter.quarter === 1 ? '1st' : quarter.quarter === 2 ? '2nd' : quarter.quarter === 3 ? '3rd' : '4th';
                        const isQuarterSelected = expandedQuarter?.subjectIndex === subjectIndex && expandedQuarter?.quarter === quarter.quarter;
                        
                        return (
                          <TouchableOpacity
                            key={qIndex}
                            style={[
                              styles.quarterButton,
                              { backgroundColor: colors.background },
                              isQuarterSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1 }
                            ]}
                            onPress={() => toggleQuarter(subjectIndex, quarter.quarter)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.quarterLabel, { color: colors.muted }]}>{quarterName}</Text>
                            <Text style={[styles.quarterValue, { color: getGradeColor(quarter.final_grade) }]}>
                              {quarter.final_grade ? `${quarter.final_grade}%` : '—'}
                            </Text>
                            <Feather 
                              name={isQuarterSelected ? 'chevron-up' : 'chevron-down'} 
                              size={12} 
                              color={colors.muted} 
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Glassmorphic Breakdown Card Container */}
                    {item.quarters.map((quarter, qIndex) => {
                      const isQuarterExpanded = expandedQuarter?.subjectIndex === subjectIndex && expandedQuarter?.quarter === quarter.quarter;
                      const quarterName = quarter.quarter === 1 ? '1st' : quarter.quarter === 2 ? '2nd' : quarter.quarter === 3 ? '3rd' : '4th';

                      if (!isQuarterExpanded) return null;

                      return (
                        <View key={`breakdown-${qIndex}`} style={[styles.expandedBreakdown, { backgroundColor: colors.inputBg }]}>
                          {/* Inner spheres for high graphics logic */}
                          <View style={[styles.absoluteSphere, { left: -5, top: -5, width: 20, height: 20, backgroundColor: colors.accentBlue, opacity: 0.1 }]} />
                          
                          <Text style={[styles.breakdownHeader, { color: colors.text }]}>
                            {quarterName} Quarter Metrics
                          </Text>
                          <View style={styles.breakdownRow}>
                            <View style={styles.breakdownItem}>
                              <Text style={[styles.breakdownLabel, { color: colors.muted }]}>Written Works</Text>
                              <Text style={[styles.breakdownValue, { color: colors.text }]}>{quarter.written_works}%</Text>
                            </View>
                            <View style={styles.breakdownDivider} />
                            <View style={styles.breakdownItem}>
                              <Text style={[styles.breakdownLabel, { color: colors.muted }]}>Performance</Text>
                              <Text style={[styles.breakdownValue, { color: colors.text }]}>{quarter.performance_tasks}%</Text>
                            </View>
                            <View style={styles.breakdownDivider} />
                            <View style={styles.breakdownItem}>
                              <Text style={[styles.breakdownLabel, { color: colors.muted }]}>Assessment</Text>
                              <Text style={[styles.breakdownValue, { color: colors.text }]}>{quarter.quarterly_assessment}%</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}

                    {/* Final Footer Section */}
                    <View style={[styles.finalRatingContainer, { borderTopColor: colors.border }]}>
                      <Text style={[styles.finalRatingLabel, { color: colors.muted }]}>Subject Final Rating:</Text>
                      <Text style={[styles.finalRatingValue, { color: getGradeColor(finalRating) }]}>
                        {finalRating ? `${finalRating}%` : '—'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {/* Empty Exception Handler */}
          {grades.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Feather name="pie-chart" size={40} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No premium grade data synchronized.</Text>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  rateCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden', 
    position: 'relative',
  },
  absoluteSphere: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: 0,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    zIndex: 2,
  },
  rateIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rateValueContainer: {
    alignItems: 'flex-start',
    zIndex: 2,
  },
  rateValue: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  rateStatusLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -2,
    marginBottom: 14,
  },
  rateBar: {
    width: '100%',
    height: 7,
    borderRadius: 6,
    overflow: 'visible',
  },
  gradesWrapper: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
    opacity: 0.8,
  },
  subjectCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subjectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  teacherName: {
    fontSize: 11,
    marginTop: 1,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  remarksBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  remarksText: {
    fontSize: 10,
    fontWeight: '700',
  },
  expandedContent: {
    marginTop: 16,
    zIndex: 1,
  },
  quartersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },
  quarterButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quarterLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  quarterValue: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  expandedBreakdown: {
    marginTop: 4,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  breakdownHeader: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  breakdownDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  finalRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  finalRatingLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  finalRatingValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 10,
  },
});