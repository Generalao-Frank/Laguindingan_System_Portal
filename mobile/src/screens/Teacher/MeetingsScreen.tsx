import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';

interface Meeting { id: number; title: string; description: string; location: string; datetime: string; status: string; created_by: string; }

export default function MeetingsScreen() {
  const [meetings, setMeetings] = useState<Meeting[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const fetchMeetings = useCallback(async () => { try { const res = await apiClient.get('/teacher/meetings'); setMeetings(res.data); } catch (err: any) { Alert.alert('Error', err.response?.data?.message || 'Failed to load'); } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { fetchMeetings(); }, [fetchMeetings]); const onRefresh = () => { setRefreshing(true); fetchMeetings(); };
  const getStatusStyle = (status: string) => {
    if (status === 'Scheduled') return { bg: '#fef3c7', text: '#d97706', label: 'Scheduled', icon: 'calendar' };
    if (status === 'Completed') return { bg: '#d1fae5', text: '#059669', label: 'Completed', icon: 'check-circle' };
    return { bg: '#fee2e2', text: '#dc2626', label: 'Cancelled', icon: 'x-circle' };
  };
  const formatDateTime = (datetime: string) => new Date(datetime).toLocaleString();
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <View style={styles.plainHeader}><Text style={styles.plainHeaderTitle}>Meetings</Text><Text style={styles.plainHeaderSubtitle}>Your scheduled meetings</Text></View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ padding: 16 }}>
        {meetings.map(item => {
          const st = getStatusStyle(item.status);
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBg, { backgroundColor: st.text + '15' }]}><Feather name="video" size={22} color={st.text} /></View>
                <View style={styles.cardInfo}><Text style={styles.title}>{item.title}</Text><Text style={styles.creator}>by {item.created_by}</Text></View>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}><Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text></View>
              </View>
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
              <View style={styles.detailRow}><Feather name="map-pin" size={14} color="#64748b" /><Text style={styles.detailText}>{item.location || 'Online meeting'}</Text></View>
              <View style={styles.detailRow}><Feather name="calendar" size={14} color="#64748b" /><Text style={styles.detailText}>{formatDateTime(item.datetime)}</Text></View>
            </View>
          );
        })}
        {meetings.length === 0 && <View style={styles.emptyContainer}><Feather name="calendar" size={48} color="#cbd5e1" /><Text style={styles.emptyText}>No meetings scheduled</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  plainHeader: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  plainHeaderTitle: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  plainHeaderSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  iconBg: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 }, title: { fontSize: 16, fontWeight: '700', color: '#0f172a' }, creator: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }, statusText: { fontSize: 11, fontWeight: '600' },
  description: { fontSize: 13, color: '#475569', marginBottom: 12 }, detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, detailText: { fontSize: 13, color: '#475569' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 }, emptyText: { fontSize: 16, color: '#94a3b8' },
});