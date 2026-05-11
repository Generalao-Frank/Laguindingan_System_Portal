  import React, { useState, useEffect, useCallback } from 'react';
  import {
    View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView,
    RefreshControl, Image, Dimensions, ActivityIndicator, Alert
  } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';
  import { useFocusEffect } from '@react-navigation/native';
  import { Ionicons, Feather } from '@expo/vector-icons';
  import { Svg, Rect } from 'react-native-svg';
  import { LinearGradient } from 'expo-linear-gradient';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import apiClient from '../../api/client';
  import schoolLogo from '../../../assets/les_logo.png';

  const { width } = Dimensions.get('window');

  interface DashboardData {
    student_name: string;
    lrn: string;
    grade_level: string;
    section: string;
    total_subjects: number;
    average_grade: number;
    attendance_percentage: number;
    pending_activities: number;
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

  export default function StudentDashboardScreen({ navigation }: any) {
    const colors = {
      background: '#F9F7F2',
      cardBg: '#FFFFFF',
      text: '#2C3647',
      muted: '#999999',
      border: '#EAE6DF',
      inputBg: '#F9F7F2',
      headerBg: '#FFFFFF',
      avatarBg: '#F9F7F2',
      primary: '#4f46e5',
      primaryLight: '#818cf8',
      primaryDark: '#1e1b4b',
    };

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
      return `http://10.0.0.79:8000/${cleanUrl}`;
    };

    const getInitials = () => {
      if (!profile) return 'S';
      return `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`;
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

    // FIXED: Updated screen names to match StudentNavigator
    const menuItems = [
      { title: 'My Grades', screen: 'Grades', icon: 'book-open' },
      { title: 'Attendance', screen: 'Attendance', icon: 'calendar' },
      { title: 'Activities', screen: 'Activities', icon: 'file-text' },
      { title: 'Announcements', screen: 'Announcements', icon: 'bell' },
      { title: 'My Profile', screen: 'Profile', icon: 'user' },
    ];

    const AttendanceCircle = () => {
      const percentage = dashboardData?.attendance_percentage || 0;
      const size = 80;
      const strokeWidth = 8;
      const radius = (size - strokeWidth) / 2;
      const circumference = radius * 2 * Math.PI;
      const progress = (percentage / 100) * circumference;
      
      return (
        <View style={styles.circleContainer}>
          <Svg width={size} height={size}>
            <Rect
              x="0" y="0" width={size} height={size}
              fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}
              rx={size / 2} ry={size / 2}
            />
            <Rect
              x="0" y="0" width={size} height={size}
              fill="none" stroke="#10b981" strokeWidth={strokeWidth}
              strokeDasharray={`${progress} ${circumference}`}
              strokeDashoffset="0"
              rx={size / 2} ry={size / 2}
              rotation="-90"
              originX={size / 2} originY={size / 2}
            />
          </Svg>
          <View style={styles.circleTextContainer}>
            <Text style={[styles.circlePercentage, { color: colors.text }]}>{percentage}%</Text>
            <Text style={[styles.circleLabel, { color: colors.muted }]}>Attendance</Text>
          </View>
        </View>
      );
    };

    if (loading) {
      return (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <SafeAreaView edges={['top']} style={styles.transparentHeader}>
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.profileRow} onPress={() => navigation.navigate('Profile')}>
              {profile?.profile_picture_url ? (
                <Image source={{ uri: getFullImageUrl(profile.profile_picture_url) }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.avatarBg }]}>
                  <Text style={[styles.avatarText, { color: colors.text }]}>{getInitials()}</Text>
                </View>
              )}
              <View>
                <Text style={[styles.studentName, { color: colors.text }]}>{dashboardData?.student_name || 'Student'}</Text>
                <Text style={[styles.schoolName, { color: colors.muted }]}>Laguindingan Central School</Text>
              </View>
            </TouchableOpacity>

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
              <Feather name="book-open" size={22} color={colors.text} />
              <Text style={[styles.statValue, { color: colors.text }]}>{dashboardData?.total_subjects || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Subjects</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.cardBg }]}>
              <Feather name="activity" size={22} color={colors.text} />
              <Text style={[styles.statValue, { color: colors.text }]}>{dashboardData?.average_grade || 0}%</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Average Grade</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.cardBg }]}>
              <Feather name="clipboard" size={22} color={colors.text} />
              <Text style={[styles.statValue, { color: colors.text }]}>{dashboardData?.pending_activities || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Pending</Text>
            </View>
          </View>

          {/* Attendance Card - Simple with slight blur */}
          <View style={[styles.luxuryAttendanceCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>📊 My Attendance</Text>
              <View style={[styles.infoBadge, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.infoBadgeText, { color: colors.text }]}>{dashboardData?.grade_level} • {dashboardData?.section}</Text>
              </View>
            </View>
            <View style={styles.attendanceRow}>
              <AttendanceCircle />
              <View style={styles.attendanceDetails}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                  <Text style={[styles.legendText, { color: colors.muted }]}>Present</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={[styles.legendText, { color: colors.muted }]}>Late</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={[styles.legendText, { color: colors.muted }]}>Absent</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Featured Cards */}
          <View style={styles.cardsRow}>
            <TouchableOpacity
              style={[styles.luxuryCard, { backgroundColor: colors.cardBg }]}
              onPress={() => upcomingActivity && navigation.navigate('Activities')}
              activeOpacity={0.8}
              disabled={!upcomingActivity}
            >
              <View style={styles.cardIcon}>
                <Feather name="file-text" size={22} color={colors.text} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Upcoming Activity</Text>
              {upcomingActivity ? (
                <>
                  <Text style={[styles.cardSubTitle, { color: colors.text }]}>{upcomingActivity.title}</Text>
                  <Text style={[styles.cardMeta, { color: colors.muted }]}>{upcomingActivity.subject}</Text>
                  <Text style={[styles.cardDate, { color: colors.text }]}>Due: {new Date(upcomingActivity.deadline).toLocaleDateString()}</Text>
                </>
              ) : (
                <Text style={[styles.cardEmpty, { color: colors.muted }]}>No upcoming activities</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.luxuryCard, { backgroundColor: colors.cardBg }]}
              onPress={() => latestAnnouncement && navigation.navigate('Announcements')}
              activeOpacity={0.8}
              disabled={!latestAnnouncement}
            >
              <View style={styles.cardIcon}>
                <Feather name="bell" size={22} color={colors.text} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Latest Announcement</Text>
              {latestAnnouncement ? (
                <>
                  <Text style={[styles.cardSubTitle, { color: colors.text }]}>{latestAnnouncement.title}</Text>
                  <Text style={[styles.cardMeta, { color: colors.muted }]} numberOfLines={2}>{latestAnnouncement.content}</Text>
                  <Text style={[styles.cardDate, { color: colors.text }]}>{new Date(latestAnnouncement.created_at).toLocaleDateString()}</Text>
                </>
              ) : (
                <Text style={[styles.cardEmpty, { color: colors.muted }]}>No announcements</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Actions Menu */}
          <View style={styles.menuWrapper}>
            <Text style={[styles.menuWrapperTitle, { color: colors.text }]}>⚡ Quick Actions</Text>
            <View style={styles.menuGrid}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.menuCard, { backgroundColor: colors.cardBg }]}
                  onPress={() => navigation.navigate(item.screen)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.menuIconCircle, { backgroundColor: colors.inputBg }]}>
                    <Feather name={item.icon as any} size={22} color={colors.text} />
                  </View>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
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
    studentName: { fontSize: 16, fontWeight: '500' },
    schoolName: { fontSize: 12, marginTop: 2 },
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
    notifBadge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
    scrollContent: { paddingHorizontal: 25, paddingBottom: 40 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginVertical: 20 },
    statCard: { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6 },
    statValue: { fontSize: 22, fontWeight: 'bold', marginTop: 8 },
    statLabel: { fontSize: 12, marginTop: 4 },
    luxuryAttendanceCard: { 
      borderRadius: 24, 
      padding: 18, 
      marginBottom: 20, 
      elevation: 3, 
      shadowColor: '#000', 
      shadowOpacity: 0.04, 
      shadowRadius: 8,
    },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: '600' },
    infoBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    infoBadgeText: { fontSize: 11, fontWeight: '500' },
    attendanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    circleContainer: { position: 'relative', width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
    circleTextContainer: { position: 'absolute', alignItems: 'center' },
    circlePercentage: { fontSize: 18, fontWeight: 'bold' },
    circleLabel: { fontSize: 10 },
    attendanceDetails: { gap: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12 },
    cardsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    luxuryCard: { flex: 1, borderRadius: 20, padding: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
    cardIcon: { marginBottom: 12 },
    cardSubTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
    cardMeta: { fontSize: 11, marginBottom: 2 },
    cardDate: { fontSize: 11, marginTop: 6, fontWeight: '500' },
    cardEmpty: { fontSize: 12, fontStyle: 'italic', marginTop: 6 },
    menuWrapper: { marginTop: 10 },
    menuWrapperTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginLeft: 4 },
    menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    menuCard: {
      width: (width - 80) / 3,
      borderRadius: 20,
      padding: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 3,
    },
    menuIconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    menuTitle: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  });