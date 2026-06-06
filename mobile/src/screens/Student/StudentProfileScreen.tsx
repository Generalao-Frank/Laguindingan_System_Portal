import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Switch, StatusBar, Platform, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import apiClient from '../../api/client';

interface Profile {
  id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  lrn: string;
  username: string;
  email: string;
  grade_level: string;
  section: string;
  profile_picture?: string;
  profile_picture_url?: string;
  gender?: string;
  birthdate?: string;
  address?: string;
  contact_number?: string;
  father_name?: string;
  mother_name?: string;
  guardian_name?: string;
  guardian_contact_number?: string;
}

interface StudentProfileScreenProps {
  onLogout?: () => void;
}

const STORAGE_KEYS = {
  PROFILE_PICTURE: 'student_profile_picture_url',
};

export default function StudentProfileScreen({ onLogout }: StudentProfileScreenProps) {
  const navigation = useNavigation();
  
  // 🎨 Unified Premium Cyber-Slate Color Palette
  const colors = {
    background: '#0F172A',      // Deep Space Navy Base
    cardBg: '#1E293B',          // Glassmorphic Surface
    text: '#F8FAFC',            // Pure White
    muted: '#94A3B8',           // Neon Slate Grey
    border: 'rgba(148, 163, 184, 0.1)', // Subtle Overlay Stroke
    inputBg: '#334155',         // High Contrast Inner Fields
    headerBg: '#1E293B',        // Premium Matched Header
    avatarBg: '#334155',        // Soft Glow Avatar Base
    primary: '#6366F1',         // Electric Indigo
    accentBlue: '#38BDF8',      // Cyber Cyan Accent
    danger: '#EF4444',          // Crimson Alert
    success: '#10B981',         // Emerald Green
  };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [notifications, setNotifications] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getFullImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `http://192.168.1.64:8000${url}`;
  };

  const fetchProfile = async () => {
    if (isLoggingOut) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const res = await apiClient.get('/student/profile');
      let pictureUrl = res.data.profile.profile_picture_url || res.data.profile.profile_picture;
      if (!pictureUrl) {
        pictureUrl = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_PICTURE);
      }
      setProfile({ ...res.data.profile, profile_picture_url: pictureUrl });
      setFormData(res.data.profile);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        console.error('Failed to fetch profile:', err);
        Alert.alert('Error', err.response?.data?.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSave = async () => {
    try {
      const response = await apiClient.put('/student/profile', formData);
      if (response.data.success) {
        setProfile(prev => ({ ...prev!, ...formData }));
        setEditing(false);
        Alert.alert('Success', 'Profile identity updated successfully');
      } else {
        Alert.alert('Error', response.data.message || 'Update failed');
      }
    } catch (err: any) {
      console.error('Update error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwordData.new.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    try {
      const response = await apiClient.post('/student/change-password', {
        current_password: passwordData.current,
        new_password: passwordData.new,
        new_password_confirmation: passwordData.confirm,
      });
      if (response.data.success) {
        Alert.alert('Success', 'Password credentials updated');
        setShowChangePassword(false);
        setPasswordData({ current: '', new: '', confirm: '' });
      } else {
        Alert.alert('Error', response.data.message || 'Failed to change password');
      }
    } catch (err: any) {
      console.error('Password change error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to system storage to modify frame avatar.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0].uri) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    const filename = uri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    const uploadFormData = new FormData();
    uploadFormData.append('profile_picture', {
      uri,
      name: filename,
      type,
    } as any);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await apiClient.post('/student/upload-profile', uploadFormData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (res.data.success && res.data.profile_picture_url) {
        const pictureUrl = res.data.profile_picture_url;
        await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_PICTURE, pictureUrl);
        
        try {
          await apiClient.post('/student/update-profile-picture', { 
            profile_picture: pictureUrl 
          });
        } catch (updateErr) {
          console.warn('Backend sync bypassed', updateErr);
        }
        
        setProfile(prev => prev ? { ...prev, profile_picture_url: pictureUrl } : prev);
        Alert.alert('Success', 'Profile vector synchronized');
      } else {
        Alert.alert('Error', res.data.message || 'Failed to update picture');
      }
    } catch (err: any) {
      console.error('Upload error:', err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.message || 'Upload execution failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'System Shutdown',
      'Are you sure you want to log out of this terminal session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            await AsyncStorage.multiRemove(['userToken', 'userRole', 'user']);
            if (onLogout) {
              onLogout();
            } else {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.muted }}>System mainframe unavailable</Text>
      </View>
    );
  }

  const fullName = `${profile.first_name} ${profile.last_name}`;
  const initials = `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBg} />
      
      {/* Premium Cyber-Glow Curved Header */}
      <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.actionIconButton}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} disabled={isLoggingOut} style={styles.actionIconButton}>
            <Feather name="power" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>

        {/* User Identity Blueprint */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploading} style={[styles.avatarPill, { borderColor: colors.primary, backgroundColor: colors.avatarBg }]}>
            {profile.profile_picture_url ? (
              <Image source={{ uri: getFullImageUrl(profile.profile_picture_url) }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.accentBlue }]}>{initials}</Text>
            )}
            {uploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.headerName, { color: colors.text }]}>{fullName}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
            <Text style={[styles.roleText, { color: colors.accentBlue }]}>ACCESS LEVEL: STUDENT</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!editing && !showChangePassword ? (
          <>
            {/* Horizontal Blueprint Specs */}
            <View style={[styles.statsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.accentBlue }]}>{profile.lrn || '---'}</Text>
                <Text style={[styles.statLab, { color: colors.muted }]}>LRN FIELD</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>{profile.grade_level || '---'}</Text>
                <Text style={[styles.statLab, { color: colors.muted }]}>GRADE</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>{profile.section || '---'}</Text>
                <Text style={[styles.statLab, { color: colors.muted }]}>SECTION</Text>
              </View>
            </View>

            {/* Core Credentials Card */}
            <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Identity Parameters</Text>
              
              <View style={styles.infoRow}>
                <Feather name="shield" size={14} color={colors.primary} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>LRN</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.lrn || 'Unspecified'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="user" size={14} color={colors.primary} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>User ID</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.username || 'Unspecified'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="mail" size={14} color={colors.primary} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Network Mail</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.email || 'Unspecified'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="phone" size={14} color={colors.primary} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Comms Link</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.contact_number || 'Not Linked'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={14} color={colors.primary} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Sector Node</Text>
                <Text style={[styles.infoVal, { color: colors.text }]} numberOfLines={1}>{profile.address || 'Not Configured'}</Text>
              </View>
            </View>

            {/* Emergency Protocols Card */}
            <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Guardian Nodes</Text>
              
              <View style={styles.infoRow}>
                <Feather name="activity" size={14} color={colors.accentBlue} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Patronymic</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.father_name || 'Empty'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="activity" size={14} color={colors.accentBlue} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Matronymic</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.mother_name || 'Empty'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="anchor" size={14} color={colors.accentBlue} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Guardian</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.guardian_name || 'Empty'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="phone-call" size={14} color={colors.accentBlue} style={styles.infoIcon} />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Proxy Comms</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.guardian_contact_number || 'Empty'}</Text>
              </View>
            </View>

            {/* Core System Setting Interceptors */}
            <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Terminal Controls</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingMain}>
                  <Ionicons name="pulse-outline" size={18} color={colors.accentBlue} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Broadcast Sync</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: colors.inputBg, true: colors.primary }}
                  thumbColor={Platform.OS === 'android' ? colors.text : undefined}
                />
              </View>
            </View>

            {/* Premium Interactive Action Triggers */}
            <TouchableOpacity style={[styles.luxuryBtn, { backgroundColor: colors.primary }]} onPress={() => setEditing(true)}>
              <Feather name="edit-2" size={14} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={[styles.luxuryBtnText, { color: '#FFF' }]}>Modify Matrix Data</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.luxuryBtn, { borderColor: colors.border, marginTop: 12, backgroundColor: colors.cardBg }]} onPress={() => setShowChangePassword(true)}>
              <Feather name="lock" size={14} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.luxuryBtnText, { color: colors.text }]}>Override Token Key</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {/* Editable Matrix State */}
        {editing && (
          <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.formHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Edit Profile Matrix</Text>
              <TouchableOpacity onPress={() => { setEditing(false); setFormData(profile); }}>
                <Text style={[styles.cancelLink, { color: colors.danger }]}>Abort</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.muted }]}>First Name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholderTextColor={colors.muted} value={formData.first_name} onChangeText={t => setFormData({ ...formData, first_name: t })} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Middle Name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholderTextColor={colors.muted} value={formData.middle_name} onChangeText={t => setFormData({ ...formData, middle_name: t })} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Last Name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholderTextColor={colors.muted} value={formData.last_name} onChangeText={t => setFormData({ ...formData, last_name: t })} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Network Email</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholderTextColor={colors.muted} value={formData.email} onChangeText={t => setFormData({ ...formData, email: t })} keyboardType="email-address" autoCapitalize="none" />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Contact Link Number</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholderTextColor={colors.muted} value={formData.contact_number} onChangeText={t => setFormData({ ...formData, contact_number: t })} keyboardType="phone-pad" />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Physical Node Sector</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, height: 80, paddingTop: 12 }]} placeholderTextColor={colors.muted} value={formData.address} onChangeText={t => setFormData({ ...formData, address: t })} multiline />

            <TouchableOpacity 
  style={[styles.luxuryBtn, { backgroundColor: colors.success, borderWidth: 0, marginTop: 12 }]} 
  onPress={handleSave}
>
  <Text style={[styles.luxuryBtnText, { color: '#FFF' }]}>Commit Changes</Text>
</TouchableOpacity>
          </View>
        )}

        {/* Change Token Cipher State */}
        {showChangePassword && (
          <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.formHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Override Credentials</Text>
              <TouchableOpacity onPress={() => { setShowChangePassword(false); setPasswordData({ current: '', new: '', confirm: '' }); }}>
                <Text style={[styles.cancelLink, { color: colors.danger }]}>Abort</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Current System Cipher</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholderTextColor={colors.muted} secureTextEntry value={passwordData.current} onChangeText={t => setPasswordData({ ...passwordData, current: t })} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>New Cluster Cipher</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholderTextColor={colors.muted} secureTextEntry value={passwordData.new} onChangeText={t => setPasswordData({ ...passwordData, new: t })} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Verify Cluster Cipher</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholderTextColor={colors.muted} secureTextEntry value={passwordData.confirm} onChangeText={t => setPasswordData({ ...passwordData, confirm: t })} />

            <TouchableOpacity 
  style={[styles.luxuryBtn, { backgroundColor: colors.primary, borderWidth: 0, marginTop: 12 }]} 
  onPress={handleChangePassword}
>
  <Text style={[styles.luxuryBtnText, { color: '#FFF' }]}>Deploy Cipher Key</Text>
</TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  actionIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSection: { alignItems: 'center', marginVertical: 20 },
  avatarPill: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  uploadOverlay: { position: 'absolute', backgroundColor: 'rgba(15,23,42,0.75)', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  headerName: { fontSize: 20, fontWeight: '800', marginTop: 14, letterSpacing: -0.3 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginTop: 8, borderWidth: 1 },
  roleText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  content: { padding: 24, paddingBottom: 100 },
  statsCard: { flexDirection: 'row', borderRadius: 20, padding: 16, marginBottom: 24, alignItems: 'center', justifyContent: 'space-around', borderWidth: 1 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  statLab: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  statDivider: { width: 1, height: 24 },
  infoCard: { borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 18, opacity: 0.9 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoIcon: { width: 18 },
  infoLabel: { fontSize: 13, fontWeight: '500', marginLeft: 10, flex: 1 },
  infoVal: { fontSize: 13, fontWeight: '700' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingLabel: { fontSize: 13, fontWeight: '600' },
  luxuryBtn: { height: 50, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  luxuryBtnText: { fontWeight: '700', fontSize: 14 },
  formCard: { borderRadius: 20, padding: 18, borderWidth: 1 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cancelLink: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 13, marginBottom: 16, borderWidth: 1 },
});