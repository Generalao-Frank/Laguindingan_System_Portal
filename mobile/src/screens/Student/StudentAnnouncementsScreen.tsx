import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';

interface Announcement {
  id: number;
  title: string;
  content: string;
  author: string;
  created_at: string;
  is_important: boolean;
}

interface Profile {
  first_name: string;
  last_name: string;
  grade_level: string;
  section: string;
}

export default function StudentAnnouncementsScreen() {
  // 🎨 High-Graphics Dark/Light Hybrid Luxury Palette (Pattern Matched)
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

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const [announcementsRes, profileRes] = await Promise.all([
        apiClient.get('/student/announcements', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        apiClient.get('/student/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      setAnnouncements(announcementsRes.data.announcements || []);
      setProfile(profileRes.data.profile);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const importantCount = announcements.filter(a => a.is_important).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* Premium Header */}
      <SafeAreaView edges={['top']} style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Terminal Broadcast</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
              {profile?.grade_level || 'Grade Level'} • {profile?.section || 'Section'}
            </Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Feather name="bell" size={14} color={colors.primary} />
            <Text style={[styles.headerBadgeText, { color: colors.text }]}>{announcements.length} Updates</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Urgent Alert Banner with Geometric Glow */}
        {importantCount > 0 && (
          <View style={[styles.importantBanner, { backgroundColor: colors.cardBg, borderColor: colors.danger }]}>
            <View style={[styles.absoluteSphere, { top: -20, right: -20, width: 60, height: 60, backgroundColor: colors.danger, opacity: 0.15 }]} />
            <View style={[styles.absoluteSphere, { bottom: -10, left: 40, width: 20, height: 20, backgroundColor: colors.danger, opacity: 0.1 }]} />
            
            <View style={styles.bannerLeftRow}>
              <View style={[styles.bannerIconContainer, { backgroundColor: colors.danger + '20' }]}>
                <Feather name="alert-triangle" size={16} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerAlertTitle, { color: colors.text }]}>CRITICAL NOTICES DETECTED</Text>
                <Text style={[styles.importantBannerText, { color: colors.muted }]}>
                  You have {importantCount} important system broadcast{importantCount > 1 ? 's' : ''} requiring immediate attention.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* High Graphic Records Section */}
        <View style={styles.announcementsWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>System Logs Feed</Text>
          
          {announcements.map((item) => {
            const isExpanded = expandedId === item.id;
            const currentBadgeColor = item.is_important ? colors.danger : colors.primary;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.announcementCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                  item.is_important && { borderColor: colors.danger + '60' }
                ]}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                {/* Abstract Ambient Overlay Spheres */}
                <View style={[styles.absoluteSphere, { right: -15, bottom: -15, width: 50, height: 50, backgroundColor: currentBadgeColor, opacity: 0.08 }]} />
                <View style={[styles.absoluteSphere, { right: 30, top: -5, width: 20, height: 20, backgroundColor: colors.text, opacity: 0.04 }]} />

                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    {/* Circle Icon Badge */}
                    <View style={[styles.iconCircle, { backgroundColor: currentBadgeColor + '15' }]}>
                      <Feather 
                        name={item.is_important ? 'shield' : 'file-text'} 
                        size={16} 
                        color={currentBadgeColor} 
                      />
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.announcementTitle, { color: colors.text }]} numberOfLines={!isExpanded ? 1 : undefined}>
                        {item.title}
                      </Text>
                      <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                          <Feather name="user" size={10} color={colors.muted} />
                          <Text style={[styles.authorText, { color: colors.muted }]} numberOfLines={1}>
                            {item.author}
                          </Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                          <Feather name="clock" size={10} color={colors.muted} />
                          <Text style={[styles.dateText, { color: colors.muted }]}>
                            {formatDate(item.created_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  <Feather 
                    name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={18} 
                    color={colors.muted} 
                    style={{ marginLeft: 8 }}
                  />
                </View>

                {/* Smooth Dropdown Content Area */}
                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                    <View style={[styles.innerContentWrapper, { backgroundColor: colors.background }]}>
                      <Text style={[styles.announcementContent, { color: colors.text }]}>
                        {item.content}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Empty Exception State */}
          {announcements.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Feather name="inbox" size={40} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No encrypted broadcasts deployed.</Text>
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
  absoluteSphere: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: 0,
  },
  importantBanner: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  bannerLeftRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    zIndex: 1,
  },
  bannerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerAlertTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  importantBannerText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  announcementsWrapper: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
    opacity: 0.8,
  },
  announcementCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 110,
  },
  authorText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    marginHorizontal: 8,
  },
  expandedContent: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    zIndex: 1,
  },
  innerContentWrapper: {
    padding: 14,
    borderRadius: 12,
  },
  announcementContent: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
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