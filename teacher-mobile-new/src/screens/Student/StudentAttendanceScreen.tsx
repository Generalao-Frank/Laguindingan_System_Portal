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

const { width: screenWidth } = Dimensions.get('window');

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

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

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

      setAttendance(attendanceRes.data.attendance);
      setSummary(attendanceRes.data.summary);
      setProfile(profileRes.data.profile);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
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
      case 'late': return 'alert-circle';
      case 'absent': return 'x-circle';
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

  const getMonthName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const groupByMonth = () => {
    const grouped: { [key: string]: Attendance[] } = {};
    attendance.forEach(item => {
      const month = getMonthName(item.date);
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(item);
    });
    return grouped;
  };

  const groupedAttendance = groupByMonth();
  const months = Object.keys(groupedAttendance);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2C3647" />
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Attendance</Text>
          <View style={styles.headerBadge}>
            <Feather name="calendar" size={16} color={colors.text} />
            <Text style={[styles.headerBadgeText, { color: colors.muted }]}>{totalDays} Days</Text>
          </View>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          {profile?.grade_level} • {profile?.section}
        </Text>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.success + '20' }]}>
              <Feather name="check-circle" size={22} color={colors.success} />
            </View>
            <Text style={[styles.summaryNumber, { color: colors.success }]}>{summary.present}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Present</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.warning + '20' }]}>
              <Feather name="alert-circle" size={22} color={colors.warning} />
            </View>
            <Text style={[styles.summaryNumber, { color: colors.warning }]}>{summary.late}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Late</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.danger + '20' }]}>
              <Feather name="x-circle" size={22} color={colors.danger} />
            </View>
            <Text style={[styles.summaryNumber, { color: colors.danger }]}>{summary.absent}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Absent</Text>
          </View>
        </View>

        {/* Attendance Rate Card - FIXED */}
        <View style={[styles.rateCard, { backgroundColor: colors.cardBg }]}>
          <View style={styles.rateHeader}>
            <Feather name="bar-chart-2" size={18} color={colors.text} />
            <Text style={[styles.rateTitle, { color: colors.text }]}>Attendance Rate</Text>
          </View>
          <View style={styles.rateValueContainer}>
            <Text style={[styles.rateValue, { color: getRateColor() }]}>{attendanceRateDisplay}%</Text>
            <View style={[styles.rateBar, { backgroundColor: colors.border }]}>
              <View 
                style={{
                  width: `${attendanceRateValue}%`,
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: getRateColor()
                }} 
              />
            </View>
          </View>
        </View>

        {/* Attendance Records by Month */}
        <View style={styles.recordsWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 Attendance Records</Text>
          
          {months.map((month, monthIndex) => (
            <View key={monthIndex} style={styles.monthSection}>
              <TouchableOpacity 
                style={styles.monthHeader}
                onPress={() => setSelectedMonth(selectedMonth === month ? null : month)}
                activeOpacity={0.7}
              >
                <View style={styles.monthHeaderLeft}>
                  <Feather name="calendar" size={18} color={colors.text} />
                  <Text style={[styles.monthTitle, { color: colors.text }]}>{month}</Text>
                </View>
                <Feather 
                  name={selectedMonth === month ? 'chevron-up' : 'chevron-down'} 
                  size={18} 
                  color={colors.muted} 
                />
              </TouchableOpacity>

              {(selectedMonth === month || selectedMonth === null) && (
                <View style={styles.recordsList}>
                  {groupedAttendance[month].map((item, index) => (
                    <View key={index} style={[styles.recordCard, { backgroundColor: colors.cardBg }]}>
                      <View style={styles.recordLeft}>
                        <View style={[styles.recordDateBadge, { backgroundColor: colors.inputBg }]}>
                          <Text style={[styles.recordDateDay, { color: colors.text }]}>
                            {new Date(item.date).getDate()}
                          </Text>
                          <Text style={[styles.recordDateMonth, { color: colors.muted }]}>
                            {new Date(item.date).toLocaleString('default', { month: 'short' })}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.recordSubject, { color: colors.text }]}>{item.subject}</Text>
                          {item.time_in && (
                            <Text style={[styles.recordTime, { color: colors.muted }]}>
                              {item.time_in} {item.time_out ? `- ${item.time_out}` : ''}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Feather name={getStatusIcon(item.status)} size={12} color={getStatusColor(item.status)} />
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                          {getStatusLabel(item.status)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          {attendance.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
              <Feather name="inbox" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No attendance records</Text>
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
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  rateCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  rateTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  rateValueContainer: {
    alignItems: 'center',
  },
  rateValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  rateBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  recordsWrapper: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    marginLeft: 4,
  },
  monthSection: {
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6DF',
  },
  monthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordsList: {
    marginTop: 12,
    gap: 10,
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  recordDateBadge: {
    width: 50,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 14,
  },
  recordDateDay: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordDateMonth: {
    fontSize: 10,
  },
  recordSubject: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  recordTime: {
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
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