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
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  address: string;
  employee_id: string;
  profile_picture_url?: string;
}

interface ProfileScreenProps {
  onLogout?: () => void;
}

const STORAGE_KEYS = {
  PROFILE_PICTURE: 'user_profile_picture_url',
};

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const navigation = useNavigation();
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
    return `http://10.0.0.79:8000${url}`;
  };

  const fetchProfile = async () => {
    // Huwag mag-fetch kung naglo-logout na
    if (isLoggingOut) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found, skipping profile fetch');
        setLoading(false);
        return;
      }
      
      const res = await apiClient.get('/teacher/profile');
      let pictureUrl = res.data.profile_picture_url || res.data.profile_picture;
      if (!pictureUrl) {
        pictureUrl = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_PICTURE);
      }
      setProfile({ ...res.data, profile_picture_url: pictureUrl });
      setFormData(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.log('Unauthorized, token may be expired');
        // Huwag magpakita ng error kung 401
      } else {
        console.error('Failed to fetch profile:', err);
        Alert.alert('Error', err.response?.data?.message || 'Failed to load');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSave = async () => {
    try {
      await apiClient.put('/teacher/profile', formData);
      setProfile(prev => ({ ...prev!, ...formData }));
      setEditing(false);
      Alert.alert('Success', 'Profile updated');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Update failed');
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    try {
      await apiClient.post('/teacher/change-password', {
        current_password: passwordData.current,
        new_password: passwordData.new,
      });
      Alert.alert('Success', 'Password changed');
      setShowChangePassword(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to change profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
    const formData = new FormData();
    formData.append('profile_picture', {
      uri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    } as any);
    try {
      const res = await apiClient.post('/upload-profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success && res.data.profile_picture_url) {
        const pictureUrl = res.data.profile_picture_url;
        await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_PICTURE, pictureUrl);
        try {
          await apiClient.post('/teacher/update-profile-picture', { profile_picture: pictureUrl });
          console.log('Picture URL saved to backend user record');
        } catch (updateErr) {
          console.warn('Could not save picture URL to backend', updateErr);
        }
        setProfile(prev => prev ? { ...prev, profile_picture_url: pictureUrl } : prev);
        Alert.alert('Success', 'Profile picture updated');
      } else {
        Alert.alert('Error', 'Failed to update picture');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            
            // Clear all storage
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userRole');
            await AsyncStorage.removeItem('user');
            
            // Call the onLogout callback if provided
            if (onLogout) {
              onLogout();
            } else {
              // Fallback: navigation reset
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

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color="#2C3647" /></View>;
  if (!profile) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <View style={{ width: 24 }} />
          <TouchableOpacity onPress={handleLogout} disabled={isLoggingOut}>
            <Feather name="log-out" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploading} style={[styles.avatarPill, { borderColor: colors.border, backgroundColor: colors.avatarBg }]}>
            {profile.profile_picture_url ? (
              <Image source={{ uri: getFullImageUrl(profile.profile_picture_url) }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.text }]}>{profile.first_name.charAt(0)}{profile.last_name.charAt(0)}</Text>
            )}
            {uploading && <ActivityIndicator style={styles.uploadOverlay} size="small" color="#fff" />}
          </TouchableOpacity>
          <Text style={[styles.headerName, { color: colors.text }]}>{profile.first_name} {profile.last_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Faculty Instructor</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!editing && !showChangePassword ? (
          <>
            <View style={[styles.statsCard, { backgroundColor: colors.cardBg }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>84%</Text>
                <Text style={[styles.statLab, { color: colors.muted }]}>Avg. Attendance</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>12</Text>
                <Text style={[styles.statLab, { color: colors.muted }]}>Active Tasks</Text>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Details</Text>
              <View style={styles.infoRow}>
                <Feather name="hash" size={16} color="#C4B196" />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Employee ID</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.employee_id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="mail" size={16} color="#C4B196" />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Email</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="phone" size={16} color="#C4B196" />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Contact</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.contact_number || 'Not set'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color="#C4B196" />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Address</Text>
                <Text style={[styles.infoVal, { color: colors.text }]}>{profile.address || 'Not set'}</Text>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingMain}>
                  <Ionicons name="notifications-outline" size={20} color={colors.text} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>System Notifications</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: '#EAE6DF', true: '#2C3647' }}
                />
              </View>
            </View>

            <TouchableOpacity style={[styles.luxuryBtn, { borderColor: colors.text }]} onPress={() => setEditing(true)}>
              <Text style={[styles.luxuryBtnText, { color: colors.text }]}>Modify Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.luxuryBtn, { borderColor: colors.text, marginTop: 10 }]} onPress={() => setShowChangePassword(true)}>
              <Text style={[styles.luxuryBtnText, { color: colors.text }]}>Change Password</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {editing && (
          <View style={[styles.formCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.formHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => { setEditing(false); setFormData(profile); }}>
                <Text style={styles.cancelLink}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.muted }]}>First Name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]} value={formData.first_name} onChangeText={t => setFormData({ ...formData, first_name: t })} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Middle Name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]} value={formData.middle_name} onChangeText={t => setFormData({ ...formData, middle_name: t })} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Last Name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]} value={formData.last_name} onChangeText={t => setFormData({ ...formData, last_name: t })} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Email</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]} value={formData.email} onChangeText={t => setFormData({ ...formData, email: t })} keyboardType="email-address" autoCapitalize="none" />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Contact Number</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]} value={formData.contact_number} onChangeText={t => setFormData({ ...formData, contact_number: t })} keyboardType="phone-pad" />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Address</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]} value={formData.address} onChangeText={t => setFormData({ ...formData, address: t })} multiline />

            <TouchableOpacity style={[styles.luxuryBtn, { backgroundColor: '#2C3647', borderColor: '#2C3647', marginTop: 20 }]} onPress={handleSave}>
              <Text style={[styles.luxuryBtnText, { color: '#FFF' }]}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {showChangePassword && (
          <View style={[styles.formCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.formHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => { setShowChangePassword(false); setPasswordData({ current: '', new: '', confirm: '' }); }}>
                <Text style={styles.cancelLink}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Current Password</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]} secureTextEntry value={passwordData.current} onChangeText={t => setPasswordData({ ...passwordData, current: t })} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>New Password</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]} secureTextEntry value={passwordData.new} onChangeText={t => setPasswordData({ ...passwordData, new: t })} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Confirm New Password</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]} secureTextEntry value={passwordData.confirm} onChangeText={t => setPasswordData({ ...passwordData, confirm: t })} />

            <TouchableOpacity style={[styles.luxuryBtn, { backgroundColor: '#2C3647', borderColor: '#2C3647', marginTop: 20 }]} onPress={handleChangePassword}>
              <Text style={[styles.luxuryBtnText, { color: '#FFF' }]}>Update Password</Text>
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
    paddingHorizontal: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#D1C7B7',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  avatarSection: { alignItems: 'center', marginVertical: 25 },
  avatarPill: {
    width: 90,
    height: 90,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { fontSize: 32, fontWeight: '300' },
  uploadOverlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  headerName: { fontSize: 22, fontWeight: 'bold', marginTop: 15 },
  roleBadge: { backgroundColor: '#F9F7F2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 6 },
  roleText: { fontSize: 11, color: '#C4B196', fontWeight: 'bold', textTransform: 'uppercase' },
  content: { padding: 25, paddingBottom: 100 },
  statsCard: { flexDirection: 'row', borderRadius: 25, padding: 20, marginBottom: 25, alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: 'bold' },
  statLab: { fontSize: 9, textTransform: 'uppercase', marginTop: 4 },
  statDivider: { width: 1, height: 25 },
  infoCard: { borderRadius: 25, padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  infoLabel: { fontSize: 13, marginLeft: 12, flex: 1 },
  infoVal: { fontSize: 13, fontWeight: '600' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 14 },
  luxuryBtn: { height: 55, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  luxuryBtnText: { fontWeight: 'bold', fontSize: 15 },
  formCard: { borderRadius: 25, padding: 20 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  cancelLink: { color: '#ef4444', fontSize: 14 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginLeft: 5 },
  input: { borderRadius: 15, padding: 15, fontSize: 14, marginBottom: 20 },
});