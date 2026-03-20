// app/(dashboard)/advertiser/completed/[campaignId].tsx
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
  SafeAreaView,
  Dimensions,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
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

type CompletedCampaignData = {
  _id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  completedAt?: string;
  finalVideo?: {
    url: string;
    thumbnailUrl?: string;
    approvedAt: string;
  };
  selectedClipper?: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
    rating?: number;
  };
  paymentAmount?: number;
  paymentCurrency?: 'NGN' | 'USDT';
  videoSubmissions?: Array<{
    _id: string;
    videoUrl: string;
    submissionDate: string;
    status: string;
  }>;
};

export default function CompletedCampaignScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router = useRouter();
  
  const [campaign, setCampaign] = useState<CompletedCampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Video player
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);
  
  // Delete confirmation modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  
  // Download success modal
  const [downloadSuccessModalVisible, setDownloadSuccessModalVisible] = useState(false);

  // Media library permissions
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const fetchCampaignData = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const response = await fetch(`${API_URL}/campaigns/${campaignId}/with-submissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load');
      console.log(data)

      const campaignData = data.campaign;

      
      // Ensure finalVideo exists - if not, use the most recent approved submission
      if (!campaignData.finalVideo && campaignData.videoSubmissions?.length > 0) {
        const approvedSubmission = campaignData.videoSubmissions.find(
          (s: any) => s.status === 'approved'
        );
        if (approvedSubmission) {
          campaignData.finalVideo = {
            url: approvedSubmission.videoUrl,
            thumbnailUrl: approvedSubmission.thumbnailUrl,
            approvedAt: approvedSubmission.approvedAt || campaignData.completedAt || new Date().toISOString()
          };
        }
      }

      setCampaign(campaignData);
    } catch (err: any) {
      console.error('Fetch error:', err);
      Alert.alert('Error', err.message || 'Could not load campaign data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) fetchCampaignData();
  }, [campaignId]);

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

  const handleDownload = async () => {
    // Get the video URL from finalVideo or the most recent submission
    let videoUrl = campaign?.finalVideo?.url;
    
    if (!videoUrl && campaign?.videoSubmissions && campaign.videoSubmissions.length > 0) {
      // If no finalVideo, use the most recent submission
      const latestSubmission = [...campaign.videoSubmissions].sort(
        (a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
      )[0];
      videoUrl = latestSubmission.videoUrl;
    }

    if (!videoUrl) {
      Alert.alert('Error', 'No video available to download');
      return;
    }

    // Request permissions if not granted
    if (!mediaPermission?.granted) {
      const { status } = await requestMediaPermission();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your media library to save videos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
    }

    setDownloading(true);
    try {
      const fullVideoUrl = toFullUrl(videoUrl);
      if (!fullVideoUrl) throw new Error('Invalid video URL');

      // Generate filename
      const sanitizedTitle = campaign?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'video';
      const filename = `clippa_${sanitizedTitle}_${Date.now()}.mp4`;
      
      // Define the download directory and file URI
      const fileUri = FileSystem.documentDirectory + filename;

      // Download the file using the correct FileSystem API
      const downloadResult = await FileSystem.downloadAsync(
        fullVideoUrl,
        fileUri
      );
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync('Clippa Videos', asset, false);

      setDownloadSuccessModalVisible(true);
    } catch (err: any) {
      console.error('Download error:', err);
      Alert.alert('Download Failed', err.message || 'Could not download video. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteCampaign = async () => {
    setDeleting(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_URL}/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete campaign');

      Alert.alert(
        'Campaign Deleted',
        'Your campaign has been permanently deleted.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(dashboard_advertiser)/Campaigns')
          }
        ]
      );
    } catch (err: any) {
      console.error('Delete error:', err);
      Alert.alert('Delete Failed', err.message || 'Could not delete campaign. Please try again.');
      setDeleteModalVisible(false);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount?: number, currency?: 'NGN' | 'USDT') => {
    // Return early if amount is undefined or null
    if (amount === undefined || amount === null) {
      return 'N/A';
    }

    // Format the amount safely
    try {
      const formattedAmount = amount.toLocaleString();
      if (currency === 'NGN') {
        return `₦${formattedAmount}`;
      } else if (currency === 'USDT') {
        return `${formattedAmount} USDT`;
      } else {
        return formattedAmount;
      }
    } catch (error) {
      console.error('Currency formatting error:', error);
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading campaign details...</Text>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Campaign not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get the video URL from finalVideo or the most recent submission
  const videoUrl = campaign.finalVideo?.url || 
    (campaign.videoSubmissions && campaign.videoSubmissions.length > 0 
      ? [...campaign.videoSubmissions].sort(
          (a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
        )[0].videoUrl 
      : null);

  const thumbnailUrl = campaign.finalVideo?.thumbnailUrl;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Campaign Completed
        </Text>
        <TouchableOpacity 
          onPress={() => setDeleteModalVisible(true)}
          style={styles.deleteIcon}
        >
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Banner */}
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.successBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="checkmark-circle" size={48} color="#fff" />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Campaign Complete!</Text>
            <Text style={styles.bannerSubtitle}>
              Video approved and payment released on {formatDate(campaign.completedAt || campaign.createdAt)}
            </Text>
          </View>
        </LinearGradient>

        {/* Final Video Section */}
        <View style={styles.videoCard}>
          <Text style={styles.cardTitle}>Final Approved Video</Text>
          
          {videoUrl ? (
            <TouchableOpacity
              style={styles.videoContainer}
              onPress={() => openVideo(videoUrl)}
            >
              {thumbnailUrl ? (
                <Image
                  source={{ uri: toFullUrl(thumbnailUrl) || '' }}
                  style={styles.videoThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Ionicons name="videocam" size={48} color="#6366f1" />
                </View>
              )}
              <View style={styles.playButton}>
                <Ionicons name="play-circle" size={64} color="#fff" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noVideoContainer}>
              <Ionicons name="videocam-off" size={48} color="#94a3b8" />
              <Text style={styles.noVideoText}>No video available</Text>
            </View>
          )}

          {/* Download Button */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleDownload}
              disabled={downloading || !videoUrl}
            >
              {downloading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={styles.downloadButtonText}>Download Video</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Campaign Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Campaign Details</Text>
          
          <Text style={styles.campaignTitle}>{campaign.title || 'Untitled Campaign'}</Text>
          <Text style={styles.campaignCategory}>{campaign.category || 'Uncategorized'}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created: </Text>
            <Text style={styles.infoValue}>{formatDate(campaign.createdAt)}</Text>
          </Text>
          
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Completed: </Text>
            <Text style={styles.infoValue}>{formatDate(campaign.completedAt || campaign.createdAt)}</Text>
          </Text>
          
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment: </Text>
            <Text style={styles.paymentValue}>
              {formatCurrency(campaign.paymentAmount, campaign.paymentCurrency)}
            </Text>
          </Text>
        </View>

        {/* Clipper Info */}
        {campaign.selectedClipper && (
          <View style={styles.clipperCard}>
            <Text style={styles.cardTitle}>Clipper</Text>
            
            <View style={styles.clipperRow}>
              <Image
                source={{ uri: toFullUrl(campaign.selectedClipper.profileImage) || 'https://via.placeholder.com/60' }}
                style={styles.clipperAvatar}
              />
              <View style={styles.clipperInfo}>
                <Text style={styles.clipperName}>
                  {campaign.selectedClipper.firstName || ''} {campaign.selectedClipper.lastName || ''}
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#fbbf24" />
                  <Text style={styles.rating}>
                    {campaign.selectedClipper.rating?.toFixed(1) || '0.0'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Campaign Description */}
        <View style={styles.descriptionCard}>
          <Text style={styles.cardTitle}>Campaign Brief</Text>
          <Text style={styles.description}>{campaign.description || 'No description provided'}</Text>
        </View>

        {/* Previous Submissions - Only show if there are multiple submissions */}
        {campaign.videoSubmissions && campaign.videoSubmissions.length > 1 && (
          <View style={styles.submissionsCard}>
            <Text style={styles.cardTitle}>Previous Submissions</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.submissionsScroll}>
              {campaign.videoSubmissions
                .filter(s => s.status !== 'approved')
                .map((submission) => (
                  <TouchableOpacity
                    key={submission._id}
                    style={styles.submissionThumb}
                    onPress={() => openVideo(submission.videoUrl)}
                  >
                    <View style={styles.submissionPlaceholder}>
                      <Ionicons name="videocam" size={24} color="#6366f1" />
                    </View>
                    <View style={styles.submissionPlayOverlay}>
                      <Ionicons name="play-circle" size={32} color="#fff" />
                    </View>
                    <Text style={styles.submissionDate}>
                      {new Date(submission.submissionDate).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
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

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="warning" size={48} color="#ef4444" />
            </View>
            
            <Text style={styles.deleteTitle}>Delete Campaign?</Text>
            
            <Text style={styles.deleteText}>
              Are you sure you want to permanently delete this campaign? 
              This action cannot be undone, but your downloaded videos will remain on your device.
            </Text>

            <View style={styles.deleteButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteConfirmButton, deleting && styles.disabledButton]}
                onPress={handleDeleteCampaign}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Download Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={downloadSuccessModalVisible}
        onRequestClose={() => setDownloadSuccessModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            </View>
            
            <Text style={styles.successTitle}>Download Complete!</Text>
            
            <Text style={styles.successText}>
              Video has been saved to your device's gallery.
            </Text>

            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setDownloadSuccessModalVisible(false)}
            >
              <Text style={styles.successButtonText}>Great!</Text>
            </TouchableOpacity>
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
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    gap: 16,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
  },
  noVideoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noVideoText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  infoCard: {
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
  infoRow: {
    fontSize: 15,
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#64748b',
  },
  infoValue: {
    color: '#334155',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  clipperCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  clipperRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clipperAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  clipperInfo: {
    flex: 1,
  },
  clipperName: {
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
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  description: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  submissionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  submissionsScroll: {
    marginTop: 8,
  },
  submissionThumb: {
    width: 120,
    height: 80,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    position: 'relative',
  },
  submissionPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submissionPlayOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  submissionDate: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    fontSize: 9,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
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
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: width * 0.85,
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  deleteText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  deleteCancelText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  deleteConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: width * 0.8,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});