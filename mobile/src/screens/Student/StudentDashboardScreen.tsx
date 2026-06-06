import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView,
  RefreshControl, Image, Dimensions, ActivityIndicator, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Svg, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';
import schoolLogo from '../../../assets/les_logo1.png';

const { width } = Dimensions.get('window');

// --- Ultra Graphic Design Tokens ---
const COLORS = {
  // Rich Background & Core Theme
  bgMain: '#0F172A',       // Deep Midnight/Slate (Premium Dark Canvas)
  bgSurface: '#1E293B',    // Card Background
  bgSurfaceLight: '#334155',
  
  // Vibrant Accents (Ultra Neon Gloss)
  primary: '#6366F1',      // Electric Indigo
  primaryGradient: ['#6366F1', '#4F46E5', '#3730A3'],
  
  accentTeal: '#0EA5E9',   // Cyber Sky Blue
  accentOrange: '#F59E0B', // Bright Amber
  accentPink: '#EC4899',   // Vivid Pink
  accentPurple: '#A855F7', // Neon Purple
  
  // Status Colors
  present: '#10B981',      // Emerald Green
  late: '#F59E0B',         // Amber
  absent: '#EF4444',       // Crimson Red
  
  // Typography
  textPrimary: '#F8FAFC',  // Crisp Off-White
  textSecondary: '#94A3B8',// Cool Grey Muted
  textMuted: '#64748B',    // Slate Dark Muted
  white: '#FFFFFF'
};

const RADIUS = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 100,
};

interface DashboardData {
  student_name: string;
  lrn: string;
  grade_level: string;
  section: string;
  total_subjects: number;
  average_grade: number;
  attendance_percentage: number;
  pending_activities: number;
  present_count?: number;
  late_count?: number;
  absent_count?: number;
}

interface Profile {
  first_name: string;
  last_name: string;
  profile_picture?: string;
  profile_picture_url?: string;
}

interface Activity {
  id: number;
  title: string;
  deadline: string;
  subject: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

// --- Dynamic Premium Donut Ring ---
const DonutRing = ({ percentage }: { percentage: number }) => {
  const size = 100;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = (percentage / 100) * circ;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#334155" strokeWidth={stroke - 2} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={COLORS.present}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${progress} ${circ - progress}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.textPrimary }}>{percentage}%</Text>
        <Text style={{ fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', letterSpacing: 0.5 }}>ATTND</Text>
      </View>
    </View>
  );
};

export default function StudentDashboardScreen({ navigation }: any) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [upcomingActivity, setUpcomingActivity] = useState<Activity | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getFullImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    return `http://192.168.1.64:8000/${cleanUrl}`;
  };

  const getInitials = () => {
    if (!profile) return 'S';
    return `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`;
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const [dashboardRes, profileRes, activitiesRes, announcementsRes] = await Promise.all([
        apiClient.get('/student/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        apiClient.get('/student/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        apiClient.get('/student/activities', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        apiClient.get('/student/announcements', {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      setDashboardData(dashboardRes.data);

      const profileData = profileRes.data.profile;
      setProfile({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        profile_picture_url: profileData.profile_picture_url || profileData.profile_picture,
      });

      const acts = activitiesRes.data.activities;
      if (acts && acts.length) {
        const sorted = acts.sort((a: Activity, b: Activity) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
        setUpcomingActivity(sorted[0]);
      } else {
        setUpcomingActivity(null);
      }

      const announcements = announcementsRes.data.announcements;
      if (announcements && announcements.length) {
        setLatestAnnouncement(announcements[0]);
      } else {
        setLatestAnnouncement(null);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
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

  const menuItems = [
    { title: 'My Grades', screen: 'Grades', icon: 'book-open', color: COLORS.accentTeal },
    { title: 'Attendance', screen: 'Attendance', icon: 'calendar', color: COLORS.present },
    { title: 'Activities', screen: 'Activities', icon: 'file-text', color: COLORS.accentOrange },
    { title: 'Announcements', screen: 'Announcements', icon: 'bell', color: COLORS.accentPurple },
    { title: 'My Profile', screen: 'Profile', icon: 'user', color: COLORS.accentPink },
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Synchronizing Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgMain} />

      {/* ===== HERO GLASS HEADER ===== */}
      <SafeAreaView edges={['top']} style={styles.headerWrapper}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.profileRow} activeOpacity={0.8} onPress={() => navigation.navigate('Profile')}>
            {profile?.profile_picture_url ? (
              <Image source={{ uri: getFullImageUrl(profile.profile_picture_url) }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
            <View>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.studentName}>{dashboardData?.student_name || 'Student'}</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.rightActions}>
            <View style={styles.logoContainer}>
              <Image source={schoolLogo} style={styles.schoolLogoRight} />
            </View>
            <TouchableOpacity style={styles.notifButton} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.schoolLabel}>Laguindingan Central School</Text>
      </SafeAreaView>

      {/* ===== SCROLL CONTENT ===== */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* === HERO STATS COUNTER GRID === */}
        <View style={styles.statsGrid}>
          {[
            { value: dashboardData?.total_subjects || 0, label: 'Subjects', icon: 'book', color: COLORS.accentTeal },
            { value: dashboardData?.average_grade || 0, label: 'GWA', icon: 'trending-up', color: COLORS.present, suffix: '%' },
            { value: dashboardData?.pending_activities || 0, label: 'Pending', icon: 'alert-circle', color: COLORS.accentPink },
          ].map((stat, i) => (
            <View key={i} style={styles.statBox}>
              <View style={styles.statBoxHeader}>
                <Feather name={stat.icon as any} size={16} color={stat.color} />
                <Text style={styles.statBoxLabel}>{stat.label}</Text>
              </View>
              <Text style={[styles.statBoxValue, { color: stat.color }]}>
                {stat.value}{stat.suffix || ''}
              </Text>
            </View>
          ))}
        </View>

        {/* === SEARCH BAR BAR (Google Classroom Vibe) === */}
        <TouchableOpacity style={styles.searchPill} activeOpacity={0.85}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.searchPillText}>Search assignments, lessons...</Text>
          <Feather name="sliders" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* === ATTENDANCE CARD GRAPHIC === */}
        <View style={styles.attendanceCard}>
          <View style={styles.attendanceCardHeader}>
            <View>
              <Text style={styles.sectionLabel}>ATTENDANCE SYSTEM</Text>
              <Text style={styles.cardTitle}>Live Monitoring</Text>
            </View>
            <View style={styles.classBadge}>
              <Text style={styles.classBadgeText}>{dashboardData?.grade_level} - {dashboardData?.section}</Text>
            </View>
          </View>

          <View style={styles.attendanceBody}>
            <DonutRing percentage={dashboardData?.attendance_percentage || 0} />
            <View style={styles.attendanceLegendCol}>
              {[
                { label: 'Present', value: dashboardData?.present_count || 0, color: COLORS.present, bg: 'rgba(16, 185, 129, 0.15)' },
                { label: 'Late', value: dashboardData?.late_count || 0, color: COLORS.late, bg: 'rgba(245, 158, 11, 0.15)' },
                { label: 'Absent', value: dashboardData?.absent_count || 0, color: COLORS.absent, bg: 'rgba(239, 68, 68, 0.15)' },
              ].map((item, i) => (
                <View key={i} style={[styles.legendPill, { backgroundColor: item.bg }]}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendLabel, { color: COLORS.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.legendValue, { color: item.color }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* === FEATURE CARDS ROW (Classroom Banner Inspired Art) === */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}> Dynamic Updates</Text>
        </View>

        <View style={styles.cardsRow}>
          {/* Upcoming Activity Card */}
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => upcomingActivity && navigation.navigate('Activities')}
            activeOpacity={0.9}
            disabled={!upcomingActivity}
          >
            <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.featureCardGradient}>
              {/* Abstract decorative geometric flow */}
              <View style={[styles.cardArtCircle, { backgroundColor: COLORS.accentTeal, top: -20, right: -20 }]} />
              
              <View style={styles.featureCardHeaderRow}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(14, 165, 233, 0.2)' }]}>
                  <MaterialCommunityIcons name="assignment-clock" size={20} color={COLORS.accentTeal} />
                </View>
                <Text style={styles.featureCardEyebrow}>ASSIGNMENT</Text>
              </View>

              {upcomingActivity ? (
                <View style={styles.featureCardContent}>
                  <Text style={styles.featureCardValue} numberOfLines={2}>{upcomingActivity.title}</Text>
                  <Text style={styles.featureCardSub} numberOfLines={1}>{upcomingActivity.subject}</Text>
                  <View style={styles.featureCardFooter}>
                    <Feather name="clock" size={12} color={COLORS.accentTeal} />
                    <Text style={[styles.featureCardDate, { color: COLORS.accentTeal }]}>
                      Due: {new Date(upcomingActivity.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.featureCardEmpty}>All tasks completed! </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Latest Announcement Card */}
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => latestAnnouncement && navigation.navigate('Announcements')}
            activeOpacity={0.9}
            disabled={!latestAnnouncement}
          >
            <LinearGradient colors={['#3F1627', '#701A36']} style={styles.featureCardGradient}>
              <View style={[styles.cardArtCircle, { backgroundColor: COLORS.accentPink, bottom: -30, right: -10 }]} />

              <View style={styles.featureCardHeaderRow}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
                  <Ionicons name="megaphone-outline" size={18} color={COLORS.accentPink} />
                </View>
                <Text style={styles.featureCardEyebrow}>BULLETIN</Text>
              </View>

              {latestAnnouncement ? (
                <View style={styles.featureCardContent}>
                  <Text style={styles.featureCardValue} numberOfLines={2}>{latestAnnouncement.title}</Text>
                  <Text style={styles.featureCardSub} numberOfLines={1}>{latestAnnouncement.content}</Text>
                  <View style={styles.featureCardFooter}>
                    <Feather name="calendar" size={12} color={COLORS.accentPink} />
                    <Text style={[styles.featureCardDate, { color: COLORS.accentPink }]}>
                      {new Date(latestAnnouncement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.featureCardEmpty}>No announcements today.</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* === QUICK ACTIONS MENU (Ultra Grid Apps layout) === */}
        <View style={styles.menuWrapper}>
          <View style={styles.sectionsTitleRow}>
            <Text style={styles.sectionHeader}> Quick Actions</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{menuItems.length} Apps</Text>
            </View>
          </View>

          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuCard}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <LinearGradient
                  colors={['rgba(51, 65, 85, 0.6)', 'rgba(30, 41, 59, 0.8)']}
                  style={styles.menuCardGradient}
                >
                  <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }]}>
                    <Feather name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgMain, gap: 16 },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },

  // Premium Header
  headerWrapper: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 15 : 0, marginBottom: 10 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: COLORS.primary },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.bgSurface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary },
  avatarText: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  greetingText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  studentName: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { padding: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
  schoolLogoRight: { width: 28, height: 28, resizeMode: 'contain' },
  notifButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.bgSurface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  notifBadge: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accentPink },
  schoolLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontWeight: '600', letterSpacing: 0.3 },

  // Stats Counters Grid
  statsGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: COLORS.bgSurface, borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  statBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  statBoxLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  statBoxValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },

  // Scroll Canvas
  scrollContent: { paddingBottom: 30 },

  // Classroom-Like Modern Search
  searchPill: { flexDirection: 'row', height: 50, backgroundColor: COLORS.bgSurface, borderRadius: RADIUS.md, alignItems: 'center', paddingHorizontal: 16, gap: 12, marginHorizontal: 20, marginBottom: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  searchPillText: { flex: 1, color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },

  // Attendance Card Design
  attendanceCard: { backgroundColor: COLORS.bgSurface, borderRadius: RADIUS.lg, padding: 20, marginHorizontal: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  attendanceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 1.5 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  classBadge: { backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
  classBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  attendanceBody: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  attendanceLegendCol: { flex: 1, gap: 8 },
  legendPill: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.sm, paddingVertical: 8, paddingHorizontal: 12, gap: 10 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  legendValue: { fontSize: 14, fontWeight: '800' },

  // Dynamic Content Flow (Banners)
  sectionHeaderRow: { paddingHorizontal: 20, marginBottom: 12 },
  sectionHeader: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  cardsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 24 },
  featureCard: { flex: 1, height: 165, borderRadius: RADIUS.lg, overflow: 'hidden' },
  featureCardGradient: { flex: 1, padding: 16, justifyContent: 'space-between' },
  cardArtCircle: { position: 'absolute', width: 90, height: 90, borderRadius: 45, opacity: 0.15 },
  featureCardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
 iconWrapper: { padding: 6, width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  featureCardEyebrow: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700', letterSpacing: 1 },
  featureCardContent: { flex: 1, justifyContent: 'flex-end', marginTop: 8 },
  featureCardValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '800', lineHeight: 18 },
  featureCardSub: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  featureCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  featureCardDate: { fontSize: 11, fontWeight: '700' },
  featureCardEmpty: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 20 },

  // Modern App Quick Actions Menu
  menuWrapper: { paddingHorizontal: 20 },
  sectionsTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  countBadgeText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  menuCard: { width: (width - 50) / 2, borderRadius: RADIUS.md, overflow: 'hidden' },
  menuCardGradient: { padding: 16, alignItems: 'flex-start', gap: 12 },
  menuIconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  menuTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }
});