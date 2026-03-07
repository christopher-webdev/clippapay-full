// app/(dashboard)/clipper/review-revision/[applicationId].tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_BASE_URL = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL;

const toFullUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${UPLOADS_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

type ApplicationData = {
  _id: string;
  campaign: {
    _id: string;
    title: string;
    description: string;
    script: string;
    category: string;
    creativeDirection: {
      aspectRatio: string;
      preferredLocation: string;
      locationDescription: string;
      backgroundStyle: string;
      moodTone: string;
      referenceLinks: string[];
    };
    advertiser: {
      _id: string;
      firstName: string;
      lastName: string;
      company: string;
      profileImage: string | null;
      rating: number;
    };
  };
  status: string;
  revisionCount: number;
  lastFeedback: string;
  currentVideoUrl: string;
  currentThumbnailUrl: string;
  paymentCurrency: 'NGN' | 'USDT';
  paymentAmount: number;
  submissionDeadline: string;
};

export default function ReviewRevisionScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();
  
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Video player
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);
  
  // Resubmission
  const [resubmitModalVisible, setResubmitModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submissionNote, setSubmissionNote] = useState('');
  
  // Countdown timer
  const [timeRemaining, setTimeRemaining] = useState('');
  const [deadlinePassed, setDeadlinePassed] = useState(false);

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const response = await fetch(`${API_URL}/applications/${applicationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load');

      setApplication(data.application);
    } catch (err: any) {
      console.error('Fetch error:', err);
      Alert.alert('Error', err.message || 'Could not load application data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) fetchApplication();
  }, [applicationId]);

  // Timer for submission deadline
  useEffect(() => {
    if (!application?.submissionDeadline) return;

    const deadline = new Date(application.submissionDeadline).getTime();
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = deadline - now;

      if (distance < 0) {
        setTimeRemaining('Deadline passed');
        setDeadlinePassed(true);
        clearInterval(timer);
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [application?.submissionDeadline]);

  const openVideo = (url: string) => {
    const fullUrl = toFullUrl(url);
    if (fullUrl) {
      setCurrentVideoUrl(fullUrl);
      setVideoModalVisible(true);
    }
  };

  const closeVideoModal = async () => {
    if (videoRef.current) {
      await videoRef.current.pauseAsync();
      await videoRef.current.unloadAsync();
    }
    setVideoModalVisible(false);
    setCurrentVideoUrl(null);
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photo library to upload a video.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Videos',
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedVideo(result.assets[0]);
      }
    } catch (err: any) {
      console.error('Video picker error:', err);
      Alert.alert('Picker Failed', 'Could not open video picker. Please try again.');
    }
  };

  const pickThumbnail = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photo library to upload a thumbnail.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedThumbnail(result.assets[0]);
      }
    } catch (err: any) {
      console.error('Thumbnail picker error:', err);
      Alert.alert('Picker Failed', 'Could not open image picker. Please try again.');
    }
  };

  const handleResubmit = async () => {
    if (!selectedVideo) {
      Alert.alert('Error', 'Please select a video to upload');
      return;
    }

    // if (!selectedThumbnail) {
    //   Alert.alert('Error', 'Please select a thumbnail image');
    //   return;
    // }

    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) throw new Error('No auth token');

      const formData = new FormData();
      formData.append('video', {
        uri: selectedVideo.uri,
        name: selectedVideo.fileName || `video-${Date.now()}.mp4`,
        type: selectedVideo.mimeType || 'video/mp4',
      } as any);

      // formData.append('thumbnail', {
      //   uri: selectedThumbnail.uri,
      //   name: selectedThumbnail.fileName || `thumbnail-${Date.now()}.jpg`,
      //   type: selectedThumbnail.mimeType || 'image/jpeg',
      // } as any);

      if (submissionNote.trim()) {
        formData.append('note', submissionNote.trim());
      }

      const response = await fetch(`${API_URL}/applications/${applicationId}/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit');

      Alert.alert(
        'Success!',
        'Your revised video has been submitted successfully. The advertiser will review it shortly.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (err: any) {
      console.error('Submit error:', err);
      Alert.alert('Error', err.message || 'Failed to submit video');
    } finally {
      setSubmitting(false);
      setResubmitModalVisible(false);
      setSelectedVideo(null);
      setSelectedThumbnail(null);
      setSubmissionNote('');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading revision details...</Text>
      </View>
    );
  }

  if (!application) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Application not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasActiveRevision = application.status === 'revision_requested';
  const remainingRevisions = 3 - application.revisionCount;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Revision Request
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Deadline Banner */}
        {hasActiveRevision && (
          <View style={[styles.deadlineBanner, deadlinePassed && styles.deadlinePassedBanner]}>
            <Ionicons 
              name={deadlinePassed ? "alert-circle" : "timer-outline"} 
              size={24} 
              color={deadlinePassed ? "#ef4444" : "#f59e0b"} 
            />
            <View style={styles.deadlineTextContainer}>
              <Text style={[styles.deadlineLabel, deadlinePassed && styles.deadlinePassedText]}>
                {deadlinePassed ? 'Deadline Passed' : 'Time Remaining'}
              </Text>
              <Text style={[styles.deadlineTime, deadlinePassed && styles.deadlinePassedText]}>
                {timeRemaining}
              </Text>
            </View>
          </View>
        )}

        {/* Campaign Info Card */}
        <View style={styles.campaignCard}>
          <Text style={styles.campaignTitle}>{application.campaign.title}</Text>
          <Text style={styles.campaignCategory}>{application.campaign.category}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionLabel}>Campaign Brief</Text>
          <Text style={styles.campaignDescription}>{application.campaign.description}</Text>
          
          {application.campaign.script && (
            <>
              <Text style={styles.sectionLabel}>Script</Text>
              <Text style={styles.campaignScript}>{application.campaign.script}</Text>
            </>
          )}

          {/* Creative Direction */}
          <Text style={styles.sectionLabel}>Creative Direction</Text>
          <View style={styles.creativeDirectionGrid}>
            {application.campaign.creativeDirection.aspectRatio !== 'any' && (
              <View style={styles.directionItem}>
                <Ionicons name="phone-portrait-outline" size={16} color="#6366f1" />
                <Text style={styles.directionText}>
                  {application.campaign.creativeDirection.aspectRatio}
                </Text>
              </View>
            )}
            {application.campaign.creativeDirection.preferredLocation !== 'anywhere' && (
              <View style={styles.directionItem}>
                <Ionicons name="location-outline" size={16} color="#6366f1" />
                <Text style={styles.directionText}>
                  {application.campaign.creativeDirection.preferredLocation}
                  {application.campaign.creativeDirection.locationDescription && 
                    `: ${application.campaign.creativeDirection.locationDescription}`}
                </Text>
              </View>
            )}
            {application.campaign.creativeDirection.backgroundStyle && (
              <View style={styles.directionItem}>
                <Ionicons name="color-palette-outline" size={16} color="#6366f1" />
                <Text style={styles.directionText}>
                  {application.campaign.creativeDirection.backgroundStyle}
                </Text>
              </View>
            )}
            {application.campaign.creativeDirection.moodTone && (
              <View style={styles.directionItem}>
                <Ionicons name="happy-outline" size={16} color="#6366f1" />
                <Text style={styles.directionText}>
                  {application.campaign.creativeDirection.moodTone}
                </Text>
              </View>
            )}
          </View>

          {/* Reference Links */}
          {application.campaign.creativeDirection.referenceLinks?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Reference Links</Text>
              {application.campaign.creativeDirection.referenceLinks.map((link, index) => (
                <Text key={index} style={styles.referenceLink} numberOfLines={1}>
                  • {link}
                </Text>
              ))}
            </>
          )}
        </View>

        {/* Advertiser Info */}
        <View style={styles.advertiserCard}>
          <View style={styles.advertiserHeader}>
            <Image
              source={{ uri: toFullUrl(application.campaign.advertiser.profileImage) || 'https://via.placeholder.com/60' }}
              style={styles.advertiserAvatar}
            />
            <View style={styles.advertiserInfo}>
              <Text style={styles.advertiserName}>
                {application.campaign.advertiser.company || 
                  `${application.campaign.advertiser.firstName} ${application.campaign.advertiser.lastName}`}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#fbbf24" />
                <Text style={styles.rating}>{application.campaign.advertiser.rating?.toFixed(1) || '0.0'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Revision Details */}
        <View style={styles.revisionCard}>
          <View style={styles.revisionHeader}>
            <View style={styles.revisionBadge}>
              <Ionicons name="refresh" size={20} color="#f59e0b" />
              <Text style={styles.revisionTitle}>Revision {application.revisionCount} of 3</Text>
            </View>
            <Text style={styles.revisionsLeft}>{remainingRevisions} left</Text>
          </View>

          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackLabel}>Advertiser Feedback:</Text>
            <Text style={styles.feedbackText}>{application.lastFeedback}</Text>
          </View>

          {/* Previous Submission */}
          {application.currentVideoUrl && (
            <View style={styles.previousSubmission}>
              <Text style={styles.previousSubmissionLabel}>Your Previous Submission:</Text>
              <TouchableOpacity
                style={styles.previousVideoThumb}
                onPress={() => openVideo(application.currentVideoUrl)}
              >
                {application.currentThumbnailUrl ? (
                  <Image
                    source={{ uri: toFullUrl(application.currentThumbnailUrl) || '' }}
                    style={styles.previousThumbImage}
                  />
                ) : (
                  <View style={styles.previousThumbPlaceholder}>
                    <Ionicons name="videocam" size={32} color="#6366f1" />
                  </View>
                )}
                <View style={styles.playIcon}>
                  <Ionicons name="play-circle" size={48} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Payment Info */}
          <View style={styles.paymentInfo}>
            <Ionicons name="wallet-outline" size={16} color="#10b981" />
            <Text style={styles.paymentText}>
              Payment upon approval: {application.paymentCurrency === 'NGN' ? '₦' : ''}
              {application.paymentAmount?.toLocaleString()}
              {application.paymentCurrency === 'USDT' ? ' USDT' : ''}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        {hasActiveRevision && !deadlinePassed && (
          <TouchableOpacity
            style={styles.resubmitButton}
            onPress={() => setResubmitModalVisible(true)}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.resubmitGradient}
            >
              <Ionicons name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.resubmitButtonText}>Resubmit Revised Video</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {deadlinePassed && (
          <View style={styles.deadlineMessage}>
            <Ionicons name="time" size={24} color="#ef4444" />
            <Text style={styles.deadlineMessageText}>
              Submission deadline has passed. This revision request has expired.
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Video Player Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={videoModalVisible}
        onRequestClose={closeVideoModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={closeVideoModal}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          
          {currentVideoUrl && (
            <Video
              ref={videoRef}
              source={{ uri: currentVideoUrl }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
              shouldPlay={true}
              onError={(error) => {
                console.error('Video playback error:', error);
                Alert.alert('Error', 'Failed to load video');
                closeVideoModal();
              }}
            />
          )}
        </View>
      </Modal>

      {/* Resubmit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={resubmitModalVisible}
        onRequestClose={() => {
          setResubmitModalVisible(false);
          setSelectedVideo(null);
          setSelectedThumbnail(null);
          setSubmissionNote('');
        }}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.resubmitModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resubmit Video</Text>
              <TouchableOpacity 
                onPress={() => {
                  setResubmitModalVisible(false);
                  setSelectedVideo(null);
                  setSelectedThumbnail(null);
                  setSubmissionNote('');
                }}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalHint}>
                Upload your revised video addressing the advertiser's feedback.
              </Text>

              {/* Video Upload */}
              <Text style={styles.uploadLabel}>Video *</Text>
              <TouchableOpacity style={styles.uploadArea} onPress={pickVideo}>
                {selectedVideo ? (
                  <View style={styles.selectedFile}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {selectedVideo.fileName || 'video.mp4'}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedVideo(null)}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.uploadIconContainer}>
                      <Ionicons name="videocam" size={32} color="#6366f1" />
                    </View>
                    <Text style={styles.uploadTitle}>Tap to select video</Text>
                    <Text style={styles.uploadHint}>MP4, MOV (max 200MB)</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Thumbnail Upload */}
              {/* <Text style={styles.uploadLabel}>Thumbnail *</Text>
              <TouchableOpacity style={styles.uploadArea} onPress={pickThumbnail}>
                {selectedThumbnail ? (
                  <View style={styles.selectedFile}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {selectedThumbnail.fileName || 'thumbnail.jpg'}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedThumbnail(null)}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.uploadIconContainer}>
                      <Ionicons name="image" size={32} color="#6366f1" />
                    </View>
                    <Text style={styles.uploadTitle}>Tap to select thumbnail</Text>
                    <Text style={styles.uploadHint}>JPG, PNG (9:16 recommended)</Text>
                  </>
                )}
              </TouchableOpacity> */}

              {/* Optional Note */}
              {/* <Text style={styles.uploadLabel}>Note to Advertiser (Optional)</Text>
              <TextInput
                style={styles.noteInput}
                value={submissionNote}
                onChangeText={setSubmissionNote}
                placeholder="Add a note about your revision..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              /> */}

              {/* Submit Button */}
              {/* <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedVideo || !selectedThumbnail || submitting) && styles.disabledButton,
                ]}
                onPress={handleResubmit}
                disabled={!selectedVideo || !selectedThumbnail || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Revision</Text>
                )}
              </TouchableOpacity> */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedVideo || submitting) && styles.disabledButton,
                ]}
                onPress={handleResubmit}
                disabled={!selectedVideo || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Revision</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.modalNote}>
                Time remaining: {timeRemaining}
              </Text>
            </ScrollView>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginTop: 40,
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  deadlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  deadlinePassedBanner: {
    backgroundColor: '#fee2e2',
  },
  deadlineTextContainer: {
    flex: 1,
  },
  deadlineLabel: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  deadlineTime: {
    fontSize: 20,
    fontWeight: '700',
    color: '#b45309',
  },
  deadlinePassedText: {
    color: '#b91c1c',
  },
  campaignCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  campaignTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  campaignCategory: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    marginTop: 8,
  },
  campaignDescription: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 12,
  },
  campaignScript: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  creativeDirectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  directionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  directionText: {
    fontSize: 13,
    color: '#4f46e5',
  },
  referenceLink: {
    fontSize: 13,
    color: '#3b82f6',
    marginBottom: 4,
  },
  advertiserCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  advertiserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  advertiserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  advertiserInfo: {
    flex: 1,
  },
  advertiserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: '#64748b',
  },
  revisionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  revisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  revisionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  revisionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  revisionsLeft: {
    fontSize: 14,
    color: '#64748b',
  },
  feedbackContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 15,
    color: '#78350f',
    lineHeight: 22,
  },
  previousSubmission: {
    marginBottom: 16,
  },
  previousSubmissionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  previousVideoThumb: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  previousThumbImage: {
    width: '100%',
    height: '100%',
  },
  previousThumbPlaceholder: {
    backgroundColor: '#334155',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    position: 'absolute',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paymentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
  },
  resubmitButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  resubmitGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deadlineMessage: {
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  deadlineMessageText: {
    fontSize: 15,
    color: '#b91c1c',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  bottomPadding: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: width,
    height: height * 0.7,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  resubmitModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: width * 0.95,
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalBody: {
    padding: 20,
  },
  modalHint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#f9fafb',
    marginBottom: 16,
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: '#64748b',
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 14,
    color: '#10b981',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    backgroundColor: '#f9fafb',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalNote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
  },
});