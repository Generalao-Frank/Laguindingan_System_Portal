import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Image, Modal, ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/client';

interface Activity {
  id: number;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  status: 'pending' | 'submitted' | 'graded';
  score?: number | null;
  max_score?: number;
  submission_image?: string;
  submitted_at?: string;
  feedback?: string;
}

interface Profile {
  first_name: string;
  last_name: string;
  grade_level: string;
  section: string;
}

// 💎 Listahan ng mga de-kalidad na Bubble Abstract Backgrounds para sa random card assignment
const BUBBLE_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop', // Blue/Teal Bubbles
  'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=600&auto=format&fit=crop', // Dark Greenish Neon Bubbles
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=600&auto=format&fit=crop', // Soft Glassmorphism Bubbles
  'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop', // Deep Violet/Dark Bubbles
  'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=600&auto=format&fit=crop', // Grey/Silver Minimal Bubbles
];

export default function StudentActivitiesScreen() {
  // 🎨 Premium High-Graphics Dashboard Color Palette
  const colors = {
    background: '#0B0F19', // Mas pinadilim para lumitaw ang cards (tulad ng screenshot)
    cardBg: '#131C2E',     // Deep premium navy card fill
    text: '#F8FAFC',       // Crisp premium white text
    muted: '#94A3B8',      // Sleek silver-grey for secondary details
    border: 'rgba(255, 255, 255, 0.08)', // Translucent glassmorphism borders
    inputBg: '#1E293B',    // Inner fields overlay color
    success: '#10B981',    // Glowing Emerald (Graded)
    warning: '#F59E0B',    // Glowing Amber (Submitted)
    danger: '#EF4444',     // Crimson Red (Pending / Overdue)
    primary: '#6366F1',    // Electric Indigo Primary
  };

  const [activities, setActivities] = useState<Activity[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [uploading, setUploading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const getFullImageUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/storage')) {
      return `http://192.168.1.64:8000${url}`;
    }
    return `http://192.168.1.64:8000/storage/${url}`;
  };

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const [activitiesRes, profileRes] = await Promise.all([
        apiClient.get('/student/activities', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        apiClient.get('/student/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      setActivities(activitiesRes.data.activities || []);
      setProfile(profileRes.data.profile);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your gallery');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to use camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const showImageOptions = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsEditing(false);
    Alert.alert(
      'Submit Assignment',
      'Choose an option to submit your work',
      [
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Take a Photo', onPress: takePhoto },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const showEditOptions = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsEditing(true);
    Alert.alert(
      'Edit Submission',
      'Choose an option to update your submission',
      [
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Take a Photo', onPress: takePhoto },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadAndSubmit = async () => {
    if (!selectedImage || !selectedActivity) return;

    setUploading(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const formData = new FormData();
      const filename = selectedImage.split('/').pop() || 'submission.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('submission_image', {
        uri: selectedImage,
        name: `submission_${selectedActivity.id}_${Date.now()}.jpg`,
        type,
      } as any);
      
      formData.append('activity_id', selectedActivity.id.toString());

      const endpoint = isEditing 
        ? `/student/activities/${selectedActivity.id}/update-submission`
        : `/student/activities/${selectedActivity.id}/submit`;

      const response = await apiClient.post(endpoint, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success) {
        Alert.alert('Success', isEditing ? 'Submission updated successfully!' : 'Activity submitted successfully!');
        setSelectedImage(null);
        setSelectedActivity(null);
        setIsEditing(false);
        fetchData();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to submit activity');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors || 'Failed to submit activity';
      Alert.alert('Error', typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const confirmSubmit = () => {
    Alert.alert(
      'Confirm Submission',
      isEditing ? 'Are you sure you want to update your submission?' : 'Are you sure you want to submit this assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: uploadAndSubmit },
      ]
    );
  };

  const viewSubmissionImage = (imageUrl: string) => {
    const fullUrl = getFullImageUrl(imageUrl);
    if (fullUrl) {
      setSelectedImage(fullUrl);
      setShowImageModal(true);
    } else {
      Alert.alert('Error', 'Cannot display image');
    }
  };

  const deleteSubmission = async (activity: Activity) => {
    Alert.alert(
      'Delete Submission',
      'Are you sure you want to delete your submission? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUploading(true);
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await apiClient.delete(`/student/activities/${activity.id}/submission`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (response.data.success) {
                Alert.alert('Success', 'Submission deleted successfully');
                fetchData();
              } else {
                Alert.alert('Error', response.data.message || 'Failed to delete submission');
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete submission');
            } finally {
              setUploading(false);
            }
          }
        },
      ]
    );
  };

  const isDueDatePassed = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.danger;
      case 'submitted': return colors.warning;
      case 'graded': return colors.success;
      default: return colors.muted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock';
      case 'submitted': return 'send';
      case 'graded': return 'check-circle';
      default: return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'submitted': return 'Submitted';
      case 'graded': return 'Graded';
      default: return status;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const filteredActivities = activities.filter(activity => {
    if (selectedFilter === 'all') return true;
    return activity.status === selectedFilter;
  });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const pendingCount = activities.filter(a => a.status === 'pending').length;
  const submittedCount = activities.filter(a => a.status === 'submitted').length;
  const gradedCount = activities.filter(a => a.status === 'graded').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* Premium Glass Header */}
      <SafeAreaView edges={['top']} style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Academic Tasks</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
              {profile?.grade_level || 'BSRT 1D'} • {profile?.section || 'College of Radiologic Technology'}
            </Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Feather name="layers" size={14} color={colors.primary} />
            <Text style={[styles.headerBadgeText, { color: colors.text }]}>{activities.length} Total</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Sleek High-Graphics Filter Segment */}
        <View style={styles.filterContainer}>
          {(['all', 'pending', 'submitted', 'graded'] as const).map((filterType) => {
            const isActive = selectedFilter === filterType;
            const count = filterType === 'all' ? activities.length : 
                          filterType === 'pending' ? pendingCount : 
                          filterType === 'submitted' ? submittedCount : gradedCount;
            
            return (
              <TouchableOpacity
                key={filterType}
                style={[
                  styles.filterTab, 
                  { backgroundColor: isActive ? colors.primary : colors.cardBg, borderColor: colors.border }
                ]}
                onPress={() => setSelectedFilter(filterType)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, { color: isActive ? '#FFFFFF' : colors.muted }]}>
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Text>
                <View style={[styles.filterCountBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(148,163,184,0.15)' }]}>
                  <Text style={[styles.filterCount, { color: isActive ? '#FFFFFF' : colors.text }]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* High Graphic Activities List */}
        <View style={styles.activitiesWrapper}>
          {filteredActivities.map((item, index) => {
            const overdue = isOverdue(item.due_date) && item.status === 'pending';
            const statusColor = getStatusColor(item.status);
            const canEdit = item.status === 'submitted' && !isDueDatePassed(item.due_date);
            const imageUrl = getFullImageUrl(item.submission_image);
            
            // Gumamit ng index para mag-assign ng random bubble background na hindi nagbabago kapag rerender
            const bubbleBg = BUBBLE_BACKGROUNDS[index % BUBBLE_BACKGROUNDS.length];
            
            return (
              <View key={item.id} style={[styles.activityCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                
                {/* 🌌 Bubble Abstract Background Wrapper */}
                <ImageBackground 
                  source={{ uri: bubbleBg }} 
                  style={StyleSheet.absoluteFillObject}
                  imageStyle={styles.cardBackgroundImage}
                />
                
                {/* Overlay layer para mabasa ang text nang malinaw sa ibabaw ng bubbles */}
                <View style={styles.cardContentOverlay}>
                  <View style={styles.cardHeader}>
                    <View style={styles.subjectInfo}>
                      <View style={[styles.subjectIcon, { backgroundColor: colors.inputBg }]}>
                        <Feather name="book" size={13} color={colors.primary} />
                      </View>
                      <Text style={[styles.subjectName, { color: colors.muted }]}>{item.subject}</Text>
                    </View>
                    
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderColor: statusColor + '70' }]}>
                      <Feather name={getStatusIcon(item.status)} size={10} color={statusColor} />
                      <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(item.status)}</Text>
                    </View>
                  </View>

                  <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.activityDescription, { color: colors.muted }]} numberOfLines={3}>
                    {item.description}
                  </Text>

                  {/* Styled Image Preview */}
                  {imageUrl && (
                    <TouchableOpacity 
                      style={[styles.submittedImageContainer, { borderColor: colors.border }]}
                      onPress={() => viewSubmissionImage(item.submission_image!)}
                      activeOpacity={0.9}
                    >
                      <Image source={{ uri: imageUrl }} style={styles.submittedImage} resizeMode="cover" />
                      <View style={styles.viewImageOverlay}>
                        <Feather name="maximize-2" size={14} color="#FFF" />
                        <Text style={styles.viewImageText}>Tap to full preview</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {item.submitted_at && (
                    <Text style={[styles.submittedDate, { color: colors.muted }]}>
                      Sent: {new Date(item.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}

                  {/* Luxury Glass Feedback Box */}
                  {item.feedback && (
                    <View style={[styles.feedbackContainer, { backgroundColor: 'rgba(30, 41, 59, 0.8)', borderColor: 'rgba(99,102,241,0.2)' }]}>
                      <View style={styles.feedbackHeaderRow}>
                        <Feather name="message-square" size={12} color={colors.primary} />
                        <Text style={[styles.feedbackLabel, { color: colors.primary }]}>Professor Feedback</Text>
                      </View>
                      <Text style={[styles.feedbackText, { color: colors.text }]}>{item.feedback}</Text>
                    </View>
                  )}

                  <View style={[styles.cardFooter, { borderTopColor: 'rgba(255,255,255,0.08)' }]}>
                    <View style={styles.dueContainer}>
                      <Feather name="calendar" size={12} color={overdue ? colors.danger : colors.muted} />
                      <Text style={[styles.dueText, { color: overdue ? colors.danger : colors.muted }]}>
                        Due: {new Date(item.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                      {overdue && <Text style={[styles.overdueBadge, { backgroundColor: colors.danger + '20', color: colors.danger }]}>OVERDUE</Text>}
                    </View>
                    
                    {item.score !== undefined && item.max_score && (
                      <View style={[styles.scoreContainer, { backgroundColor: colors.success + '20' }]}>
                        <Feather name="award" size={12} color={colors.success} />
                        <Text style={[styles.scoreText, { color: colors.success }]}>
                          {item.score} / {item.max_score}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    {item.status === 'pending' && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                        onPress={() => showImageOptions(item)}
                        activeOpacity={0.8}
                      >
                        <Feather name="upload-cloud" size={15} color="#fff" />
                        <Text style={styles.actionButtonText}>Upload Solution</Text>
                      </TouchableOpacity>
                    )}

                    {canEdit && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.borderedButton, { borderColor: colors.warning, backgroundColor: 'rgba(15, 23, 42, 0.5)' }]}
                        onPress={() => showEditOptions(item)}
                        activeOpacity={0.8}
                      >
                        <Feather name="edit-3" size={14} color={colors.warning} />
                        <Text style={[styles.buttonText, { color: colors.warning }]}>Change File</Text>
                      </TouchableOpacity>
                    )}

                    {item.status === 'submitted' && !isDueDatePassed(item.due_date) && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.borderedButton, { borderColor: colors.danger, backgroundColor: 'rgba(15, 23, 42, 0.5)' }]}
                        onPress={() => deleteSubmission(item)}
                        activeOpacity={0.8}
                      >
                        <Feather name="trash-2" size={14} color={colors.danger} />
                        <Text style={[styles.buttonText, { color: colors.danger }]}>Cancel Turn-In</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {filteredActivities.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Feather name="folder-minus" size={40} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>Clear checklist! No tasks found.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 80 }} /> 
      </ScrollView>

      {/* Modern Blackout Image Preview Modal */}
      <Modal visible={showImageModal} transparent={true} animationType="fade" onRequestClose={() => setShowImageModal(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowImageModal(false)}>
            <Feather name="x" size={24} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Premium Uploading Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={[styles.uploadingCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.uploadingText, { color: colors.text }]}>Securing submission pipeline...</Text>
          </View>
        </View>
      )}

      {/* Confirmation Slide Sheet Modal */}
      {selectedImage && selectedActivity && !uploading && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setSelectedImage(null);
            setSelectedActivity(null);
            setIsEditing(false);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.confirmModalContent, { backgroundColor: colors.cardBg }]}>
              <View style={styles.notchIndicator} />
              <Text style={[styles.confirmTitle, { color: colors.text }]}>
                {isEditing ? 'Verify New Attachment' : 'Confirm Assignment File'}
              </Text>
              <Text style={[styles.confirmActivity, { color: colors.muted }]}>{selectedActivity.title}</Text>
              
              <Image source={{ uri: selectedImage }} style={styles.confirmImage} resizeMode="cover" />
              
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: colors.inputBg }]}
                  onPress={() => {
                    setSelectedImage(null);
                    setSelectedActivity(null);
                    setIsEditing(false);
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                  onPress={confirmSubmit}
                >
                  <Text style={styles.submitConfirmText}>Push Submission</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    paddingTop: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filterCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  filterCount: {
    fontSize: 9,
    fontWeight: '800',
  },
  activitiesWrapper: {
    gap: 14,
  },
  activityCard: {
    borderRadius: 20,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardBackgroundImage: {
    opacity: 0.35, // Sapat lang para makita ang bubbles pero hindi tatakpan ang text
    resizeMode: 'cover',
  },
  cardContentOverlay: {
    padding: 18,
    backgroundColor: 'rgba(19, 28, 46, 0.70)', // Nagbibigay ng malasalaming tint para readable ang teksto
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subjectIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  activityDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  submittedImageContainer: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    height: 140,
    position: 'relative',
  },
  submittedImage: {
    width: '100%',
    height: '100%',
  },
  viewImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  viewImageText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  submittedDate: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 10,
  },
  feedbackContainer: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  feedbackLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  feedbackText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 4,
  },
  dueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dueText: {
    fontSize: 11,
    fontWeight: '600',
  },
  overdueBadge: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  borderedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    padding: 10,
    zIndex: 10,
  },
  modalImage: {
    width: '95%',
    height: '75%',
  },
  confirmModalContent: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
  },
  notchIndicator: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmActivity: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitConfirmText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  uploadingCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
});