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

      setAnnouncements(announcementsRes.data.announcements);
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
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2C3647" />
      </View>
    );
  }

  const importantCount = announcements.filter(a => a.is_important).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Announcements</Text>
          <View style={styles.headerBadge}>
            <Feather name="bell" size={16} color={colors.text} />
            <Text style={[styles.headerBadgeText, { color: colors.muted }]}>{announcements.length} Updates</Text>
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
        {/* Important Notice Banner */}
        {importantCount > 0 && (
          <View style={[styles.importantBanner, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '30' }]}>
            <Feather name="alert-triangle" size={16} color={colors.danger} />
            <Text style={[styles.importantBannerText, { color: colors.danger }]}>
              You have {importantCount} important announcement{importantCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Announcements List */}
        <View style={styles.announcementsWrapper}>
          {announcements.map((item) => {
            const isExpanded = expandedId === item.id;
            
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.announcementCard,
                  { backgroundColor: colors.cardBg },
                  item.is_important && styles.importantCard
                ]}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: item.is_important ? colors.danger + '20' : colors.inputBg }]}>
                      <Feather name={item.is_important ? 'bell' : 'file-text'} size={16} color={item.is_important ? colors.danger : colors.text} />
                    </View>
                    <View>
                      <Text style={[styles.announcementTitle, { color: colors.text }]} numberOfLines={!isExpanded ? 1 : undefined}>
                        {item.title}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={[styles.authorText, { color: colors.muted }]}>By {item.author}</Text>
                        <Text style={[styles.dateText, { color: colors.muted }]}>{formatDate(item.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                  <Feather 
                    name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={18} 
                    color={colors.muted} 
                  />
                </View>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                    <Text style={[styles.announcementContent, { color: colors.text }]}>
                      {item.content}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {announcements.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
              <Feather name="inbox" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No announcements</Text>
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
  importantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  importantBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  announcementsWrapper: {
    gap: 12,
  },
  announcementCard: {
    borderRadius: 20,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  importantCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorText: {
    fontSize: 10,
  },
  dateText: {
    fontSize: 10,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  announcementContent: {
    fontSize: 13,
    lineHeight: 18,
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