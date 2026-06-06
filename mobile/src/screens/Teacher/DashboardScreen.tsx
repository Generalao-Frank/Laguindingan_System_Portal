import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView,
  RefreshControl, Image, Dimensions, ActivityIndicator, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Svg, Rect, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../../api/client';
import schoolLogo from '../../../assets/les_logo1.png';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Activities: undefined;
  Meetings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// --- Design Tokens ---
const COLORS = {
  teal: '#1B4D5C',
  tealLight: '#2A6478',
  tealMid: '#1D5A6B',
  orange: '#F5A623',
  orangeLight: '#FFB84D',
  cream: '#FDF8F2',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  text: '#1A2B35',
  textMid: '#4A6572',
  muted: '#8FA7B2',
  border: '#E8F0F3',
  present: '#27B589',
  late: '#F5A623',
  absent: '#E05C5C',
  statCard1: '#E8F5F0',
  statCard2: '#FFF3E0',
  statCard3: '#E3F2FD',
};

const RADIUS = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 100,
};

// --- Types ---
interface Profile { first_name: string; last_name: string; profile_picture?: string; profile_picture_url?: string; }
interface Section { id: number; grade_level: number; section_name: string; subject_name: string; }
interface Activity { id: number; title: string; deadline: string; subject: string; section: string; }
interface Meeting { id: number; title: string; datetime: string; location: string; }
interface AttendanceStudent { enrollment_id: number; student_name: string; lrn: string; section: string; status: string | null; time_in: string | null; }

// --- Donut Ring for Attendance ---
const DonutRing = ({ present, absent, late, total }: { present: number; absent: number; late: number; total: number }) => {
  if (total === 0) return null;
  const size = 90;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const presentPct = present / total;
  const latePct = late / total;
  const absentPct = absent / total;
  const presentDash = presentPct * circ;
  const lateDash = latePct * circ;
  const absentDash = absentPct * circ;
  const presentOffset = 0;
  const lateOffset = -(presentDash);
  const absentOffset = -(presentDash + lateDash);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#EEF2F5" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.present} strokeWidth={stroke} fill="none"
          strokeDasharray={`${presentDash} ${circ - presentDash}`} strokeDashoffset={circ / 4 + presentOffset}
          strokeLinecap="round" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.late} strokeWidth={stroke} fill="none"
          strokeDasharray={`${lateDash} ${circ - lateDash}`} strokeDashoffset={circ / 4 + lateOffset}
          strokeLinecap="round" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.absent} strokeWidth={stroke} fill="none"
          strokeDasharray={`${absentDash} ${circ - absentDash}`} strokeDashoffset={circ / 4 + absentOffset}
          strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text }}>{Math.round((present / total) * 100)}%</Text>
        <Text style={{ fontSize: 9, color: COLORS.muted, fontWeight: '600' }}>Present</Text>
      </View>
    </View>
  );
};

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();

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
    return `http://192.168.1.64:8000${url}`;
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
      setProfile({ ...profileData, profile_picture_url: profileData.profile_picture });
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
      if (acts?.length) {
        const sorted = acts.sort((a: Activity, b: Activity) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        setUpcomingActivity(sorted[0]);
      } else setUpcomingActivity(null);

      const meets = meetingsRes.data;
      if (meets?.length) {
        const sortedMeets = meets.sort((a: Meeting, b: Meeting) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
        setNextMeeting(sortedMeets[0]);
      } else setNextMeeting(null);

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getInitials = () => {
    if (!profile) return 'T';
    return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`;
  };

  const getGradeDisplay = (grade: number) => (grade === 0 ? 'Kinder' : `Grade ${grade}`);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.cream }]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.teal} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.teal} />

      {/* ===== HERO HEADER ===== */}
      <LinearGradient
        colors={[COLORS.teal, COLORS.tealMid, COLORS.tealLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        {/* Decorative circles */}
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        <SafeAreaView edges={['top']}>
          {/* Nav Row */}
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.profileRow} activeOpacity={0.8}>
              {profile?.profile_picture_url ? (
                <Image source={{ uri: getFullImageUrl(profile.profile_picture_url) }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </View>
              )}
              <View>
                <Text style={styles.greetingText}>{getGreeting()},</Text>
                <Text style={styles.teacherName}>{profile ? `${profile.first_name} ${profile.last_name}` : 'Teacher'} 👋</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.rightActions}>
              <Image source={schoolLogo} style={styles.schoolLogoRight} />
              <TouchableOpacity style={styles.notifButton} activeOpacity={0.7}>
                <Ionicons name="notifications" size={20} color="#fff" />
                <View style={styles.notifBadge} />
              </TouchableOpacity>
            </View>
          </View>

          {/* School label */}
          <Text style={styles.schoolLabel}>Laguindingan Central School</Text>

          {/* Stats Strip */}
          <View style={styles.heroStatsRow}>
            {[
              { icon: 'users', value: totalStudents, label: 'Students', color: '#A8E6CF' },
              { icon: 'grid', value: totalSections, label: 'Sections', color: '#FFD3A0' },
              { icon: 'check-circle', value: attendanceSummary.present, label: 'Present', color: '#A0D4F5' },
            ].map((stat, i) => (
              <View key={i} style={[styles.heroStatItem, i === 2 && styles.lastHeroStatItem]}>
                <Text style={[styles.heroStatValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.heroStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ===== SCROLL CONTENT ===== */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.teal} />}
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: COLORS.cream }}
      >

        {/* === ATTENDANCE CARD === */}
        <View style={styles.attendanceCard}>
          <View style={styles.attendanceCardHeader}>
            <View>
              <Text style={styles.sectionLabel}>TODAY'S OVERVIEW</Text>
              <Text style={styles.cardTitle}>Attendance</Text>
            </View>
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
            </View>
          </View>

          <View style={styles.attendanceBody}>
            <DonutRing {...attendanceSummary} />
            <View style={styles.attendanceLegendCol}>
              {[
                { label: 'Present', value: attendanceSummary.present, color: COLORS.present, bg: '#E8F8F4' },
                { label: 'Late', value: attendanceSummary.late, color: COLORS.late, bg: '#FFF8EC' },
                { label: 'Absent', value: attendanceSummary.absent, color: COLORS.absent, bg: '#FDEEEE' },
              ].map((item, i) => (
                <View key={i} style={[styles.legendPill, { backgroundColor: item.bg }]}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendLabel, { color: item.color }]}>{item.label}</Text>
                  <Text style={[styles.legendValue, { color: item.color }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {attendanceSummary.total === 0 && (
            <Text style={styles.noDataText}>No attendance data recorded today</Text>
          )}
        </View>

        {/* === SEARCH PILL === */}
        <TouchableOpacity style={styles.searchPill} activeOpacity={0.85}>
          <View style={styles.searchIconBox}>
            <Ionicons name="search" size={16} color={COLORS.teal} />
          </View>
          <Text style={styles.searchPillText}>Search sections or activities...</Text>
          <Feather name="sliders" size={16} color={COLORS.muted} />
        </TouchableOpacity>

        {/* === SECTION HEADER === */}
        <Text style={styles.sectionHeader}> Quick Access</Text>

        {/* === FEATURE CARDS === */}
        <View style={styles.cardsRow}>
          {/* Upcoming Activity */}
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => upcomingActivity && navigation.navigate('Activities')}
            activeOpacity={0.88}
            disabled={!upcomingActivity}
          >
            <LinearGradient colors={[COLORS.teal, COLORS.tealLight]} style={styles.featureCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.featureCardIcon}>
                <Feather name="file-text" size={20} color="#fff" />
              </View>
              <Text style={styles.featureCardEyebrow}>UPCOMING</Text>
              <Text style={styles.featureCardTitle}>Activity</Text>
              {upcomingActivity ? (
                <>
                  <Text style={styles.featureCardValue} numberOfLines={2}>{upcomingActivity.title}</Text>
                  <View style={styles.featureCardFooter}>
                    <Feather name="clock" size={10} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.featureCardDate}>{new Date(upcomingActivity.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.featureCardEmpty}>No upcoming activities</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Next Meeting */}
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => nextMeeting && navigation.navigate('Meetings')}
            activeOpacity={0.88}
            disabled={!nextMeeting}
          >
            <LinearGradient colors={[COLORS.orange, COLORS.orangeLight]} style={styles.featureCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.featureCardIcon}>
                <Feather name="calendar" size={20} color="#fff" />
              </View>
              <Text style={styles.featureCardEyebrow}>NEXT</Text>
              <Text style={styles.featureCardTitle}>Meeting</Text>
              {nextMeeting ? (
                <>
                  <Text style={styles.featureCardValue} numberOfLines={2}>{nextMeeting.title}</Text>
                  <View style={styles.featureCardFooter}>
                    <Feather name="map-pin" size={10} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.featureCardDate}>{nextMeeting.location || 'Online'}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.featureCardEmpty}>No upcoming meetings</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* === MY SECTIONS === */}
        <View style={styles.sectionsWrapper}>
          <View style={styles.sectionsTitleRow}>
            <Text style={styles.sectionHeader}> My Sections</Text>
            <Text style={styles.sectionCount}>{sections.length} total</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionsScroll} contentContainerStyle={{ paddingRight: 10 }}>
            {sections.map((section, index) => {
              const cardColors = [
                ['#E8F5F0', COLORS.present],
                ['#FFF3E0', COLORS.orange],
                ['#E3F2FD', '#2196F3'],
                ['#F3E5F5', '#9C27B0'],
              ];
              const [bg, accent] = cardColors[index % cardColors.length];
              return (
                <TouchableOpacity key={section.id} activeOpacity={0.85} style={[styles.sectionCard, { backgroundColor: bg }]}>
                  <View style={[styles.sectionIconCircle, { backgroundColor: accent }]}>
                    <Feather name="users" size={18} color="#fff" />
                  </View>
                  <Text style={[styles.sectionGrade, { color: COLORS.text }]}>{getGradeDisplay(section.grade_level)}</Text>
                  <Text style={[styles.sectionName, { color: COLORS.textMid }]} numberOfLines={1}>{section.section_name}</Text>
                  <View style={[styles.subjectBadge, { backgroundColor: accent }]}>
                    <Text style={styles.subjectBadgeText} numberOfLines={1}>{section.subject_name}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {sections.length === 0 && (
              <View style={styles.emptySections}>
                <Feather name="inbox" size={28} color={COLORS.muted} />
                <Text style={styles.emptySmallText}>No sections assigned yet</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream },

  // Loading
  loadingCard: { alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 32, borderRadius: RADIUS.lg, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, elevation: 8 },
  loadingText: { color: COLORS.textMid, fontSize: 14, fontWeight: '500' },

  // Hero Header
  heroHeader: { paddingBottom: 28, paddingHorizontal: 22, overflow: 'hidden' },
  decCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -60, right: -50 },
  decCircle2: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -30, left: 20 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarPlaceholder: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  greetingText: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  teacherName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  schoolLogoRight: { width: 30, height: 30, resizeMode: 'contain', opacity: 0.9 },
  notifButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  notifBadge: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.orange, borderWidth: 1.5, borderColor: COLORS.teal },
  schoolLabel: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4, marginLeft: 58, fontWeight: '500' },

  // Hero Stats
  heroStatsRow: { flexDirection: 'row', marginTop: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 8 },
  heroStatItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' },
  lastHeroStatItem: { borderRightWidth: 0 }, // Ito ang replacement para sa 'last' property
  heroStatValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Scroll
  scrollContent: { paddingTop: 20, paddingHorizontal: 18, paddingBottom: 20 },

  // Attendance Card
  attendanceCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 20, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },
  attendanceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  todayBadge: { backgroundColor: COLORS.teal, paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.pill },
  todayBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  attendanceBody: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  attendanceLegendCol: { flex: 1, gap: 8 },
  legendPill: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.sm, paddingVertical: 7, paddingHorizontal: 10, gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  legendValue: { fontSize: 14, fontWeight: '800' },
  noDataText: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },

  // Search
  searchPill: { flexDirection: 'row', height: 50, backgroundColor: COLORS.white, borderRadius: RADIUS.pill, alignItems: 'center', paddingHorizontal: 14, gap: 10, marginBottom: 22, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  searchIconBox: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.cream, justifyContent: 'center', alignItems: 'center' },
  searchPillText: { flex: 1, color: COLORS.muted, fontSize: 13, fontWeight: '500' },

  // Section headers
  sectionHeader: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 14 },

  // Feature Cards
  cardsRow: { flexDirection: 'row', gap: 14, marginBottom: 24 },
  featureCard: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  featureCardGradient: { padding: 18, minHeight: 160 },
  featureCardIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  featureCardEyebrow: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  featureCardTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2, marginBottom: 8 },
  featureCardValue: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500', lineHeight: 16 },
  featureCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  featureCardDate: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  featureCardEmpty: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', marginTop: 4 },

  // Sections
  sectionsWrapper: { marginBottom: 10 },
  sectionsTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionCount: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  sectionsScroll: {},
  sectionCard: { borderRadius: RADIUS.md, padding: 14, marginRight: 12, alignItems: 'center', width: 120, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  sectionGrade: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  sectionName: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  subjectBadge: { marginTop: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
  subjectBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.3 },
  emptySections: { alignItems: 'center', justifyContent: 'center', width: width - 36, gap: 8, paddingVertical: 20 },
  emptySmallText: { fontSize: 13, color: COLORS.muted },
});