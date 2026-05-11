import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Image, Modal
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

export default function StudentActivitiesScreen() {
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

  // Helper function to get full image URL
  const getFullImageUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    // If already full URL, return as is
    if (url.startsWith('http')) return url;
    // If starts with /storage, add base URL
    if (url.startsWith('/storage')) {
      return `http://10.0.0.79:8000${url}`;
    }
    // If just the path
    return `http://10.0.0.79:8000/storage/${url}`;
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

      console.log('Activities response:', JSON.stringify(activitiesRes.data, null, 2));
      setActivities(activitiesRes.data.activities);
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

      console.log('Submitting to:', endpoint);

      const response = await apiClient.post(endpoint, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Response:', response.data);

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
      console.error('Submit error:', error.response?.data || error.message);
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
      case 'pending': return 'Not Submitted';
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
        <ActivityIndicator size="large" color="#2C3647" />
      </View>
    );
  }

  const pendingCount = activities.filter(a => a.status === 'pending').length;
  const submittedCount = activities.filter(a => a.status === 'submitted').length;
  const gradedCount = activities.filter(a => a.status === 'graded').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Activities</Text>
          <View style={styles.headerBadge}>
            <Feather name="clipboard" size={16} color={colors.text} />
            <Text style={[styles.headerBadgeText, { color: colors.muted }]}>{activities.length} Total</Text>
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
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>All</Text>
            <Text style={[styles.filterCount, selectedFilter === 'all' && styles.filterCountActive]}>{activities.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'pending' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('pending')}
          >
            <Text style={[styles.filterText, selectedFilter === 'pending' && styles.filterTextActive]}>Pending</Text>
            <Text style={[styles.filterCount, selectedFilter === 'pending' && styles.filterCountActive]}>{pendingCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'submitted' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('submitted')}
          >
            <Text style={[styles.filterText, selectedFilter === 'submitted' && styles.filterTextActive]}>Submitted</Text>
            <Text style={[styles.filterCount, selectedFilter === 'submitted' && styles.filterCountActive]}>{submittedCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'graded' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('graded')}
          >
            <Text style={[styles.filterText, selectedFilter === 'graded' && styles.filterTextActive]}>Graded</Text>
            <Text style={[styles.filterCount, selectedFilter === 'graded' && styles.filterCountActive]}>{gradedCount}</Text>
          </TouchableOpacity>
        </View>

        {/* Activities List */}
        <View style={styles.activitiesWrapper}>
          {filteredActivities.map((item) => {
            const overdue = isOverdue(item.due_date) && item.status === 'pending';
            const statusColor = getStatusColor(item.status);
            const canEdit = item.status === 'submitted' && !isDueDatePassed(item.due_date);
            const imageUrl = getFullImageUrl(item.submission_image);
            
            return (
              <View key={item.id} style={[styles.activityCard, { backgroundColor: colors.cardBg }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.subjectInfo}>
                    <View style={[styles.subjectIcon, { backgroundColor: colors.inputBg }]}>
                      <Feather name="book" size={16} color={colors.text} />
                    </View>
                    <Text style={[styles.subjectName, { color: colors.text }]}>{item.subject}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Feather name={getStatusIcon(item.status)} size={10} color={statusColor} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(item.status)}</Text>
                  </View>
                </View>

                <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.activityDescription, { color: colors.muted }]} numberOfLines={2}>
                  {item.description}
                </Text>

                {/* Show submitted image preview */}
                {imageUrl && (
                  <TouchableOpacity 
                    style={styles.submittedImageContainer}
                    onPress={() => viewSubmissionImage(item.submission_image!)}
                  >
                    <Image 
                      source={{ uri: imageUrl }} 
                      style={styles.submittedImage}
                      resizeMode="cover"
                    />
                    <Text style={[styles.viewImageText, { color: colors.primary }]}>Tap to view</Text>
                  </TouchableOpacity>
                )}

                {/* Show submitted date */}
                {item.submitted_at && (
                  <Text style={[styles.submittedDate, { color: colors.muted }]}>
                    Submitted: {new Date(item.submitted_at).toLocaleString()}
                  </Text>
                )}

                {/* Show feedback if graded */}
                {item.feedback && (
                  <View style={[styles.feedbackContainer, { backgroundColor: colors.inputBg }]}>
                    <Feather name="message-circle" size={14} color={colors.primary} />
                    <Text style={[styles.feedbackText, { color: colors.text }]}>{item.feedback}</Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.dueContainer}>
                    <Feather name="calendar" size={12} color={overdue ? colors.danger : colors.muted} />
                    <Text style={[styles.dueText, { color: overdue ? colors.danger : colors.muted }]}>
                      Due: {new Date(item.due_date).toLocaleDateString()}
                    </Text>
                    {overdue && <Text style={[styles.overdueBadge, { backgroundColor: colors.danger + '20', color: colors.danger }]}>OVERDUE</Text>}
                  </View>
                  {item.score !== undefined && item.max_score && (
                    <View style={styles.scoreContainer}>
                      <Feather name="award" size={12} color={colors.success} />
                      <Text style={[styles.scoreText, { color: colors.success }]}>
                        Score: {item.score}/{item.max_score}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {item.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.submitButton, { backgroundColor: colors.primary }]}
                      onPress={() => showImageOptions(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="upload" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Submit</Text>
                    </TouchableOpacity>
                  )}

                  {canEdit && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton, { borderColor: colors.warning, borderWidth: 1 }]}
                      onPress={() => showEditOptions(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="edit-2" size={16} color={colors.warning} />
                      <Text style={[styles.editButtonText, { color: colors.warning }]}>Edit</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === 'submitted' && !isDueDatePassed(item.due_date) && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton, { borderColor: colors.danger, borderWidth: 1 }]}
                      onPress={() => deleteSubmission(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="trash-2" size={16} color={colors.danger} />
                      <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  )}

                  {imageUrl && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.viewButton, { borderColor: colors.primary, borderWidth: 1 }]}
                      onPress={() => viewSubmissionImage(item.submission_image!)}
                      activeOpacity={0.8}
                    >
                      <Feather name="eye" size={16} color={colors.primary} />
                      <Text style={[styles.viewButtonText, { color: colors.primary }]}>View</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          {filteredActivities.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
              <Feather name="inbox" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No activities found</Text>
            </View>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowImageModal(false)}
            >
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
            {selectedImage && (
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Uploading Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={[styles.uploadingCard, { backgroundColor: colors.cardBg }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.uploadingText, { color: colors.text }]}>Processing...</Text>
          </View>
        </View>
      )}

      {/* Confirmation Modal for submit/edit */}
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
              <Text style={[styles.confirmTitle, { color: colors.text }]}>
                {isEditing ? 'Update Submission' : 'Review Submission'}
              </Text>
              <Text style={[styles.confirmActivity, { color: colors.text }]}>{selectedActivity.title}</Text>
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.confirmImage}
                resizeMode="contain"
              />
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => {
                    setSelectedImage(null);
                    setSelectedActivity(null);
                    setIsEditing(false);
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.muted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.submitConfirmButton, { backgroundColor: colors.primary }]}
                  onPress={confirmSubmit}
                >
                  <Text style={styles.submitConfirmText}>
                    {isEditing ? 'Update Now' : 'Submit Now'}
                  </Text>
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
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterTabActive: {
    backgroundColor: '#2C3647',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterCountActive: {
    color: '#fff',
  },
  activitiesWrapper: {
    gap: 16,
  },
  activityCard: {
    borderRadius: 20,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
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
    gap: 8,
  },
  subjectIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  activityDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  submittedImageContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  submittedImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  viewImageText: {
    fontSize: 11,
    marginTop: 4,
  },
  submittedDate: {
    fontSize: 11,
    marginBottom: 8,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 12,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueText: {
    fontSize: 11,
  },
  overdueBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  editButton: {
    backgroundColor: 'transparent',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewButton: {
    backgroundColor: 'transparent',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 16,
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  modalImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
  },
  confirmModalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  confirmActivity: {
    fontSize: 16,
    marginBottom: 16,
  },
  confirmImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitConfirmButton: {
    backgroundColor: '#3b82f6',
  },
  submitConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  uploadingText: {
    fontSize: 14,
    marginTop: 12,
  },
});