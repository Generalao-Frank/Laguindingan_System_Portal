import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';

interface Attendance {
  date: string;
  status: 'present' | 'absent' | 'late';
  subject: string;
  time_in: string | null;
  time_out: string | null;
}

interface Profile {
  first_name: string;
  last_name: string;
  grade_level: string;
  section: string;
}

export default function StudentAttendanceScreen() {
  // 🎨 High-Graphics Dark/Light Hybrid Luxury Palette
  const colors = {
    background: '#0F172A', // Deep slate navy background
    cardBg: '#1E293B',     // Lighter slate for premium cards
    text: '#F8FAFC',       // Crisp white
    muted: '#94A3B8',       // Soft grey-blue
    border: 'rgba(148, 163, 184, 0.1)', // Glassmorphism borders
    inputBg: '#334155',
    success: '#10B981',    // Neon Emerald
    warning: '#F59E0B',    // Cyber Amber
    danger: '#EF4444',     // Crimson Red
    primary: '#6366F1',    // Indigo Electric
    accentBlue: '#38BDF8', // Light Cyan Accent
    accentPink: '#EC4899', // Hot Pink Accent
  };

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const getMonthName = (dateString: string) => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) 
      ? 'Unknown Month' 
      : date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getUniqueMonths = (attendanceData: Attendance[]) => {
    const monthsSet = new Set<string>();
    attendanceData.forEach(item => {
      monthsSet.add(getMonthName(item.date));
    });
    return Array.from(monthsSet);
  };

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const [attendanceRes, profileRes] = await Promise.all([
        apiClient.get('/student/attendance', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        apiClient.get('/student/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      const fetchedAttendance = attendanceRes.data.attendance || [];
      setAttendance(fetchedAttendance);
      
      // Safe Mapping para sa Summary Cards
      const summaryData = attendanceRes.data.summary || attendanceRes.data || {};
      setSummary({
        present: summaryData.present ?? summaryData.present_days ?? 0,
        late: summaryData.late ?? summaryData.late_logs ?? 0,
        absent: summaryData.absent ?? summaryData.absent_days ?? 0,
      });

      setProfile(profileRes.data.profile);
      
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const monthsList = getUniqueMonths(fetchedAttendance);
      
      const newExpanded = new Set<string>();
      if (monthsList.includes(currentMonth)) {
        newExpanded.add(currentMonth);
      } else if (monthsList.length > 0) {
        newExpanded.add(monthsList[0]);
      }
      setExpandedMonths(newExpanded);
      
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    try {
      if (timeString.includes('T')) {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
      }
      if (timeString.match(/^\d{2}:\d{2}:\d{2}/)) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
      }
      return timeString;
    } catch {
      return timeString;
    }
  };

  const toggleMonth = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const expandAll = () => setExpandedMonths(new Set(getUniqueMonths(attendance)));
  const collapseAll = () => setExpandedMonths(new Set());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return colors.success;
      case 'late': return colors.warning;
      case 'absent': return colors.danger;
      default: return colors.muted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return 'check-circle';
      case 'late': return 'clock';
      case 'absent': return 'alert-triangle';
      default: return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'late': return 'Late';
      case 'absent': return 'Absent';
      default: return status;
    }
  };

  const groupByMonth = () => {
    const grouped: { [key: string]: Attendance[] } = {};
    attendance.forEach(item => {
      const month = getMonthName(item.date);
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(item);
    });
    return grouped;
  };

  const groupedAttendance = groupByMonth();
  const months = Object.keys(groupedAttendance).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalDays = summary.present + summary.absent + summary.late;
  const attendanceRateValue = totalDays > 0 ? ((summary.present + summary.late) / totalDays * 100) : 0;
  const attendanceRateDisplay = attendanceRateValue.toFixed(1);

  const getRateColor = () => {
    if (attendanceRateValue >= 90) return colors.success;
    if (attendanceRateValue >= 75) return colors.warning;
    return colors.danger;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* Premium Header */}
      <SafeAreaView edges={['top']} style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics Dashboard</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
              {profile?.grade_level || 'BSRT 1D'} • {profile?.section || 'College of Radiologic Technology'}
            </Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Feather name="layers" size={14} color={colors.primary} />
            <Text style={[styles.headerBadgeText, { color: colors.text }]}>{totalDays} Days Tracked</Text>
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
          <View style={[styles.absoluteSphere, { top: -15, right: -15, width: 70, height: 70, backgroundColor: getRateColor(), opacity: 0.15 }]} />
          <View style={[styles.absoluteSphere, { bottom: -20, right: 40, width: 45, height: 45, backgroundColor: colors.text, opacity: 0.08 }]} />
          <View style={[styles.absoluteSphere, { top: 30, right: 80, width: 25, height: 25, backgroundColor: getRateColor(), opacity: 0.12 }]} />
          <View style={[styles.absoluteSphere, { bottom: -40, left: '30%', backgroundColor: colors.primary, width: 120, height: 120, opacity: 0.05 }]} />

          <View style={styles.rateHeader}>
            <View style={[styles.rateIconContainer, { backgroundColor: getRateColor() + '15' }]}>
              <Feather name="activity" size={18} color={getRateColor()} />
            </View>
            <Text style={[styles.rateTitle, { color: colors.muted }]}>OVERALL ATTENDANCE RATE</Text>
          </View>
          <View style={styles.rateValueContainer}>
            <Text style={[styles.rateValue, { color: colors.text }]}>{attendanceRateDisplay}%</Text>
            <Text style={[styles.rateStatusLabel, { color: getRateColor() }]}>
              {attendanceRateValue >= 90 ? 'Excellent Standing' : attendanceRateValue >= 75 ? 'Good Progress' : 'Critical Warning'}
            </Text>
            <View style={[styles.rateBar, { backgroundColor: '#334155' }]}>
              <View 
                style={{
                  width: `${attendanceRateValue}%`,
                  height: '100%',
                  borderRadius: 6,
                  backgroundColor: getRateColor(),
                  shadowColor: getRateColor(),
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 8,
                  elevation: 5,
                }} 
              />
            </View>
          </View>
        </View>

        {/* Dynamic Summary Micro-Cards */}
        <View style={styles.summaryContainer}>
          {/* Present Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.absoluteSphere, { bottom: -10, right: -10, width: 40, height: 40, backgroundColor: colors.success, opacity: 0.12 }]} />
            <View style={[styles.absoluteSphere, { top: -5, right: 25, width: 20, height: 20, backgroundColor: colors.success, opacity: 0.08 }]} />
            
            <Feather name="check-circle" size={18} color={colors.success} style={styles.cardIconPosition} />
            <Text style={[styles.summaryNumber, { color: colors.text }]}>
              {summary.present ?? 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Present Days</Text>
          </View>
          
          {/* Late Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.absoluteSphere, { bottom: -10, right: -10, width: 40, height: 40, backgroundColor: colors.warning, opacity: 0.12 }]} />
            <View style={[styles.absoluteSphere, { top: -5, right: 25, width: 20, height: 20, backgroundColor: colors.warning, opacity: 0.08 }]} />

            <Feather name="clock" size={18} color={colors.warning} style={styles.cardIconPosition} />
            <Text style={[styles.summaryNumber, { color: colors.text }]}>
              {summary.late ?? 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Late Logs</Text>
          </View>
          
          {/* Absent Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.absoluteSphere, { bottom: -10, right: -10, width: 40, height: 40, backgroundColor: colors.danger, opacity: 0.12 }]} />
            <View style={[styles.absoluteSphere, { top: -5, right: 25, width: 20, height: 20, backgroundColor: colors.danger, opacity: 0.08 }]} />

            <Feather name="minus-circle" size={18} color={colors.danger} style={styles.cardIconPosition} />
            <Text style={[styles.summaryNumber, { color: colors.text }]}>
              {summary.absent ?? 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Absent Days</Text>
          </View>
        </View>

        {/* Collapse Controls */}
        {months.length > 1 && (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={expandAll} style={[styles.actionButton, { backgroundColor: colors.cardBg }]}>
              <Feather name="plus" size={12} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Expand All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={collapseAll} style={[styles.actionButton, { backgroundColor: colors.cardBg }]}>
              <Feather name="minus" size={12} color={colors.muted} />
              <Text style={[styles.actionButtonText, { color: colors.muted }]}>Collapse</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* High Graphic Records Section */}
        <View style={styles.recordsWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Timeline Log</Text>
          
          {months.map((month, monthIndex) => {
            const records = groupedAttendance[month];
            const isExpanded = expandedMonths.has(month);
            
            return (
              <View key={monthIndex} style={styles.monthSection}>
                <TouchableOpacity 
                  style={[styles.monthHeader, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  onPress={() => toggleMonth(month)}
                  activeOpacity={0.7}
                >
                  <View style={styles.monthHeaderLeft}>
                    <Feather name="folder" size={16} color={colors.primary} />
                    <Text style={[styles.monthTitle, { color: colors.text }]}>{month}</Text>
                    <View style={styles.recordCountBadge}>
                      <Text style={styles.recordCountText}>{records.length} items</Text>
                    </View>
                  </View>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.recordsList}>
                    {records.map((item, index) => {
                      const currentStatusColor = getStatusColor(item.status);

                      return (
                        <View 
                          key={index} 
                          style={[
                            styles.recordCard, 
                            { 
                              backgroundColor: colors.cardBg, 
                              borderColor: colors.border 
                            }
                          ]}
                        >
                          <View style={[styles.absoluteSphere, { right: -10, bottom: -10, width: 45, height: 45, backgroundColor: currentStatusColor, opacity: 0.15 }]} />
                          <View style={[styles.absoluteSphere, { right: 25, top: -5, width: 25, height: 25, backgroundColor: colors.text, opacity: 0.08 }]} />
                          <View style={[styles.absoluteSphere, { right: 55, bottom: 5, width: 15, height: 15, backgroundColor: currentStatusColor, opacity: 0.1 }]} />
                          <View style={[styles.absoluteSphere, { right: 80, top: 15, width: 10, height: 10, backgroundColor: colors.text, opacity: 0.05 }]} />
                          
                          <View style={styles.recordLeft}>
                            <View style={styles.dateBadgeContainer}>
                              <Text style={[styles.recordDateDay, { color: colors.text }]}>
                                {new Date(item.date).getDate()}
                              </Text>
                              <Text style={[styles.recordDateMonth, { color: colors.muted }]}>
                                {new Date(item.date).toLocaleString('default', { month: 'short' }).toUpperCase()}
                              </Text>
                            </View>
                            
                            <View style={styles.detailsContainer}>
                              <Text style={[styles.recordSubject, { color: colors.text }]} numberOfLines={1}>
                                {item.subject}
                              </Text>
                              <Text style={[styles.recordTimeText, { color: colors.muted }]}>
                                {formatDate(item.date)}
                              </Text>
                              {item.time_in && (
                                <View style={styles.timeRow}>
                                  <Feather name="clock" size={10} color={colors.muted} style={{ marginRight: 4 }} />
                                  <Text style={[styles.recordTimeData, { color: colors.muted }]}>
                                    {formatTime(item.time_in)} {item.time_out ? `→ ${formatTime(item.time_out)}` : ''}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                          
                          <View style={[styles.statusBadge, { backgroundColor: currentStatusColor + '15', borderColor: currentStatusColor + '40' }]}>
                            <Feather name={getStatusIcon(item.status)} size={11} color={currentStatusColor} />
                            <Text style={[styles.statusText, { color: currentStatusColor }]}>
                              {getStatusLabel(item.status)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          {attendance.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Feather name="pie-chart" size={40} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No activity data found.</Text>
            </View>
          )}
        </View>
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
  summaryContainer: {
    flexDirection: 'row',       // Pinapanatiling magkakatabi ang cards
    justifyContent: 'space-between',
    gap: 8,                    // Sapat na distansya sa bawat card
    marginBottom: 24,
    width: '100%',
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,       // Tiyak na vertical padding para sa space ng text at icon
    paddingHorizontal: 10,     // Niluwagan para magkasya ang single o double digits
    borderWidth: 1,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
    alignItems: 'center',      // Naka-center ang items para iwas-tabon
  },
  cardIconPosition: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.2,
    zIndex: 1,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '800',
    zIndex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    zIndex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recordsWrapper: {
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
  monthSection: {
    marginBottom: 12,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  monthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  recordCountBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recordCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#818CF8',
  },
  recordsList: {
    marginTop: 8,
    gap: 8,
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  dateBadgeContainer: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordDateDay: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  recordDateMonth: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailsContainer: {
    justifyContent: 'center',
    maxWidth: '60%',
  },
  recordSubject: {
    fontSize: 14,
    fontWeight: '600',
  },
  recordTimeText: {
    fontSize: 11,
    marginTop: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  recordTimeData: {
    fontSize: 10,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
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