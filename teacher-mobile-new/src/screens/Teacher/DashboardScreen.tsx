import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView,
  RefreshControl, Image, Dimensions, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Svg, Rect } from 'react-native-svg';
import apiClient from '../../api/client';
import schoolLogo from '../../../assets/les_logo.png';

const { width } = Dimensions.get('window');

// Define navigation param list for TypeScript
type RootStackParamList = {
  Activities: undefined;
  Meetings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// --- Types ---
interface Profile {
  first_name: string;
  last_name: string;
  profile_picture?: string;
  profile_picture_url?: string;
}

interface Section {
  id: number;
  grade_level: number;
  section_name: string;
  subject_name: string;
}

interface Activity {
  id: number;
  title: string;
  deadline: string;
  subject: string;
  section: string;
}

interface Meeting {
  id: number;
  title: string;
  datetime: string;
  location: string;
}

interface AttendanceStudent {
  enrollment_id: number;
  student_name: string;
  lrn: string;
  section: string;
  status: string | null;
  time_in: string | null;
}

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colors = {
    background: '#F9F7F2',
    cardBg: '#FFFFFF',
    text: '#2C3647',
    muted: '#999999',
    border: '#EAE6DF',
    inputBg: '#F9F7F2',
    headerBg: '#FFFFFF',
    avatarBg: '#F9F7F2',
  };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [upcomingActivity, setUpcomingActivity] = useState<Activity | null>(null);
  const [nextMeeting, setNextMeeting] = useState<Meeting | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalSections, setTotalSections] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getFullImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `http://10.0.0.79:8000${url}`;
  };

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, sectionsRes, activitiesRes, meetingsRes, attendanceRes] = await Promise.all([
        apiClient.get('/teacher/profile'),
        apiClient.get('/teacher/sections'),
        apiClient.get('/teacher/activities'),
        apiClient.get('/teacher/meetings'),
        apiClient.get('/teacher/attendance'),
      ]);

      const profileData = profileRes.data;
      setProfile({
        ...profileData,
        profile_picture_url: profileData.profile_picture,
      });
      setSections(sectionsRes.data);
      setTotalSections(sectionsRes.data.length);

      const studentsList: AttendanceStudent[] = attendanceRes.data;
      const presentCount = studentsList.filter(s => s.status === 'Present').length;
      const absentCount = studentsList.filter(s => s.status === 'Absent').length;
      const lateCount = studentsList.filter(s => s.status === 'Late').length;
      const total = studentsList.length;
      setAttendanceSummary({ present: presentCount, absent: absentCount, late: lateCount, total });
      setTotalStudents(total);

      const acts = activitiesRes.data;
      if (acts && acts.length) {
        const sorted = acts.sort((a: Activity, b: Activity) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
        setUpcomingActivity(sorted[0]);
      } else {
        setUpcomingActivity(null);
      }

      const meets = meetingsRes.data;
      if (meets && meets.length) {
        const sortedMeets = meets.sort((a: Meeting, b: Meeting) =>
          new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
        );
        setNextMeeting(sortedMeets[0]);
      } else {
        setNextMeeting(null);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load dashboard data');
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

  const getInitials = () => {
    if (!profile) return 'T';
    return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`;
  };

  const getGradeDisplay = (grade: number) => (grade === 0 ? 'Kinder' : `Grade ${grade}`);

  const AttendanceBar = () => {
    const { present, absent, late, total } = attendanceSummary;
    if (total === 0) return <Text style={[styles.noDataText, { color: colors.muted }]}>No attendance data today</Text>;
    const presentPct = (present / total) * (width - 100);
    const latePct = (late / total) * (width - 100);
    const absentPct = (absent / total) * (width - 100);
    return (
      <View style={styles.barContainer}>
        <Svg width={width - 70} height={30}>
          <Rect x="0" y="8" width={presentPct} height="14" fill="#10b981" rx="4" />
          <Rect x={presentPct} y="8" width={latePct} height="14" fill="#f59e0b" rx="4" />
          <Rect x={presentPct + latePct} y="8" width={absentPct} height="14" fill="#ef4444" rx="4" />
        </Svg>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10b981' }]} /><Text style={[styles.legendText, { color: colors.muted }]}>Present {present}</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} /><Text style={[styles.legendText, { color: colors.muted }]}>Late {late}</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={[styles.legendText, { color: colors.muted }]}>Absent {absent}</Text></View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2C3647" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView edges={['top']} style={styles.transparentHeader}>
        <View style={styles.navRow}>
          {/* Left side: profile picture & name */}
          <TouchableOpacity style={styles.profileRow}>
            {profile?.profile_picture_url ? (
              <Image source={{ uri: getFullImageUrl(profile.profile_picture_url) }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.avatarBg }]}>
                <Text style={[styles.avatarText, { color: colors.text }]}>{getInitials()}</Text>
              </View>
            )}
            <View>
              <Text style={[styles.teacherName, { color: colors.text }]}>{profile ? `${profile.first_name} ${profile.last_name}` : 'Teacher'}</Text>
              <Text style={[styles.schoolName, { color: colors.muted }]}>Laguindingan Central School</Text>
            </View>
          </TouchableOpacity>

          {/* Right side: logo + notification */}
          <View style={styles.rightActions}>
            <Image source={schoolLogo} style={styles.schoolLogoRight} />
            <TouchableOpacity style={styles.notifButton}>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Analytics Row: Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg }]}>
            <Feather name="users" size={22} color={colors.text} />
            <Text style={[styles.statValue, { color: colors.text }]}>{totalStudents}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Total Students</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg }]}>
            <Feather name="grid" size={22} color={colors.text} />
            <Text style={[styles.statValue, { color: colors.text }]}>{totalSections}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Total Sections</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg }]}>
            <Feather name="activity" size={22} color={colors.text} />
            <Text style={[styles.statValue, { color: colors.text }]}>{attendanceSummary.present}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Present Today</Text>
          </View>
        </View>

        {/* Attendance Performance Card */}
        <View style={[styles.luxuryAttendanceCard, { backgroundColor: colors.cardBg }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>📊 Attendance Performance</Text>
            <View style={[styles.todayBadge, { backgroundColor: colors.text }]}>
              <Text style={[styles.todayBadgeText, { color: colors.background }]}>Today</Text>
            </View>
          </View>
          <AttendanceBar />
        </View>

        {/* Search Bar */}
        <TouchableOpacity style={styles.searchPill}>
          <Ionicons name="search-outline" size={18} color="#fff" />
          <Text style={styles.searchPillText}>Search sections or activities</Text>
        </TouchableOpacity>

        {/* Featured Cards - Now tappable with proper typing */}
        <View style={styles.cardsRow}>
          <TouchableOpacity
            style={[styles.luxuryCard, { backgroundColor: colors.cardBg }]}
            onPress={() => upcomingActivity && navigation.navigate('Activities')}
            activeOpacity={0.8}
            disabled={!upcomingActivity}
          >
            <View style={styles.cardIcon}>
              <Feather name="file-text" size={24} color={colors.text} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Upcoming Activity</Text>
            {upcomingActivity ? (
              <>
                <Text style={[styles.cardSubTitle, { color: colors.text }]}>{upcomingActivity.title}</Text>
                <Text style={[styles.cardMeta, { color: colors.muted }]}>{upcomingActivity.subject} • {upcomingActivity.section}</Text>
                <Text style={[styles.cardDate, { color: colors.text }]}>Due: {new Date(upcomingActivity.deadline).toLocaleDateString()}</Text>
              </>
            ) : (
              <Text style={[styles.cardEmpty, { color: colors.muted }]}>No upcoming activities</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.luxuryCard, { backgroundColor: colors.cardBg }]}
            onPress={() => nextMeeting && navigation.navigate('Meetings')}
            activeOpacity={0.8}
            disabled={!nextMeeting}
          >
            <View style={styles.cardIcon}>
              <Feather name="calendar" size={24} color={colors.text} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Next Meeting</Text>
            {nextMeeting ? (
              <>
                <Text style={[styles.cardSubTitle, { color: colors.text }]}>{nextMeeting.title}</Text>
                <Text style={[styles.cardMeta, { color: colors.muted }]}>
                  {new Date(nextMeeting.datetime).toLocaleDateString()} at{' '}
                  {new Date(nextMeeting.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.muted }]}>{nextMeeting.location || 'Online'}</Text>
              </>
            ) : (
              <Text style={[styles.cardEmpty, { color: colors.muted }]}>No upcoming meetings</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* My Sections */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionWrapperTitle, { color: colors.text }]}>📚 My Sections</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionsScroll}>
            {sections.map((section) => (
              <View key={section.id} style={[styles.sectionCard, { backgroundColor: colors.cardBg }]}>
                <View style={[styles.sectionIconCircle, { backgroundColor: colors.inputBg }]}>
                  <Feather name="users" size={22} color={colors.text} />
                </View>
                <Text style={[styles.sectionGrade, { color: colors.text }]}>{getGradeDisplay(section.grade_level)}</Text>
                <Text style={[styles.sectionName, { color: colors.muted }]}>{section.section_name}</Text>
                <Text style={[styles.sectionSubject, { color: colors.text }]}>{section.subject_name}</Text>
              </View>
            ))}
            {sections.length === 0 && <Text style={[styles.emptySmallText, { color: colors.muted }]}>No sections assigned</Text>}
          </ScrollView>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  transparentHeader: { paddingHorizontal: 25, paddingTop: 10 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#2C3647' },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold' },
  teacherName: { fontSize: 16, fontWeight: '500' },
  schoolName: { fontSize: 12, color: '#888', marginTop: 2 },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  schoolLogoRight: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  notifButton: { position: 'relative', padding: 6 },
  notifBadge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c' },
  scrollContent: { paddingHorizontal: 25, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginVertical: 20 },
  statCard: { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6 },
  statValue: { fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  statLabel: { fontSize: 12, marginTop: 4 },
  luxuryAttendanceCard: { borderRadius: 24, padding: 18, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  todayBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, overflow: 'hidden' },
  todayBadgeText: { fontSize: 12, fontWeight: '500' },
  barContainer: { marginVertical: 8 },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11 },
  noDataText: { fontSize: 12, fontStyle: 'italic', marginTop: 8 },
  searchPill: { flexDirection: 'row', height: 55, backgroundColor: '#2C3647', borderRadius: 27.5, alignItems: 'center', paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  searchPillText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cardsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  luxuryCard: { flex: 1, borderRadius: 20, padding: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardIcon: { marginBottom: 12 },
  cardSubTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  cardMeta: { fontSize: 11, marginBottom: 2 },
  cardDate: { fontSize: 11, marginTop: 6, fontWeight: '500' },
  cardEmpty: { fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  sectionWrapper: { marginTop: 10 },
  sectionWrapperTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginLeft: 4 },
  sectionsScroll: { flexDirection: 'row' },
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    marginRight: 15,
    alignItems: 'center',
    width: 130,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  sectionGrade: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  sectionName: { fontSize: 12, marginTop: 2 },
  sectionSubject: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  emptySmallText: { fontSize: 12, marginLeft: 10 },
});