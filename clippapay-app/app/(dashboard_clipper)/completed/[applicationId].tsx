// app/(dashboard_clipper)/completed/[applicationId].tsx
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
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
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

type CompletedApplicationData = {
  _id: string;
  status: string;
  proposedRateNGN?: number;
  proposedRateUSDT?: number;
  paymentAmount?: number;
  paymentCurrency?: 'NGN' | 'USDT';
  currentVideoUrl?: string;
  currentThumbnailUrl?: string;
  completedAt?: string;
  createdAt: string;
  campaign?: {
    _id: string;
    title: string;
    description: string;
    category: string;
    script?: string;
    keyPhrases?: string[];
    preferredLength?: string;
    creativeDirection?: {
      aspectRatio?: string;
      moodTone?: string;
      backgroundStyle?: string;
      preferredLocation?: string;
    };
    advertiser: {
      _id: string;
      firstName: string;
      lastName: string;
      company?: string;
      profileImage?: string | null;
    };
    finalVideo?: {
      url: string;
      thumbnailUrl?: string;
      approvedAt: string;
    };
  };
  revisionCount?: number;
  lastFeedback?: string;
};

export default function CompletedApplicationScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();
  
  const [application, setApplication] = useState<CompletedApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  
  // Video player
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);
  
  // Share modal
  const [shareModalVisible, setShareModalVisible] = useState(false);
  
  // Download success modal
  const [downloadSuccessModalVisible, setDownloadSuccessModalVisible] = useState(false);

  // Media library permissions
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const fetchApplicationData = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Use the same endpoint but get single application
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
    if (applicationId) fetchApplicationData();
  }, [applicationId]);

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
    // Get the video URL from application or campaign finalVideo
    let videoUrl = application?.currentVideoUrl || application?.campaign?.finalVideo?.url;
    
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
      const sanitizedTitle = application?.campaign?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'video';
      const filename = `clippa_${sanitizedTitle}_${Date.now()}.mp4`;
      
      // Define the download directory and file URI
      const fileUri = FileSystem.documentDirectory + filename;

      // Download the file
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

  const handleShare = async () => {
    try {
      const videoUrl = application?.currentVideoUrl || application?.campaign?.finalVideo?.url;
      if (!videoUrl) {
        Alert.alert('Error', 'No video to share');
        return;
      }

      const fullUrl = toFullUrl(videoUrl);
      if (!fullUrl) throw new Error('Invalid video URL');

      await Share.share({
        title: `My UGC work for ${application?.campaign?.title}`,
        message: `Check out my UGC video I created for ${application?.campaign?.title} on Clippa!`,
        url: fullUrl,
      });
    } catch (err: any) {
      console.error('Share error:', err);
      Alert.alert('Share Failed', 'Could not share video. Please try again.');
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
    if (amount === undefined || amount === null) return 'N/A';
    
    try {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(numAmount)) return 'N/A';
      
      const formattedAmount = numAmount.toLocaleString(undefined, {
        minimumFractionDigits: currency === 'USDT' ? 2 : 0,
        maximumFractionDigits: currency === 'USDT' ? 2 : 0,
      });
      
      if (currency === 'NGN') {
        return `₦${formattedAmount}`;
      } else if (currency === 'USDT') {
        return `${formattedAmount} USDT`;
      } else {
        return formattedAmount;
      }
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading your work...</Text>
      </View>
    );
  }

  if (!application) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Work not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const campaign = application.campaign || {};
  const advertiser = campaign.advertiser || {};
  const videoUrl = application.currentVideoUrl || campaign.finalVideo?.url;
  const thumbnailUrl = application.currentThumbnailUrl || campaign.finalVideo?.thumbnailUrl;
  const paymentAmount = application.paymentAmount || application.proposedRateNGN || application.proposedRateUSDT;
  const paymentCurrency = application.paymentCurrency || 
    (application.proposedRateNGN ? 'NGN' : application.proposedRateUSDT ? 'USDT' : undefined);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Completed Work
        </Text>
        <TouchableOpacity 
          onPress={handleShare}
          style={styles.shareIcon}
        >
          <Ionicons name="share-outline" size={24} color="#6366f1" />
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
            <Text style={styles.bannerTitle}>Work Completed! 🎉</Text>
            <Text style={styles.bannerSubtitle}>
              Your video was approved and payment has been released
            </Text>
          </View>
        </LinearGradient>

        {/* Video Section */}
        <View style={styles.videoCard}>
          <Text style={styles.cardTitle}>Your Approved Video</Text>
          
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

          {/* Action Buttons */}
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
                  <Text style={styles.downloadButtonText}>Download</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              disabled={!videoUrl}
            >
              <Ionicons name="share-social-outline" size={20} color="#fff" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Card */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentHeader}>
            <Ionicons name="wallet-outline" size={24} color="#10b981" />
            <Text style={styles.paymentTitle}>Payment Received</Text>
          </View>
          
          <Text style={styles.paymentAmount}>
            {formatCurrency(paymentAmount, paymentCurrency)}
          </Text>
          
          <Text style={styles.paymentDate}>
            Paid on {formatDate(application.completedAt || application.createdAt)}
          </Text>
        </View>

        {/* Campaign Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Campaign Details</Text>
          
          <Text style={styles.campaignTitle}>{campaign.title || 'Untitled Campaign'}</Text>
          <Text style={styles.campaignCategory}>{campaign.category || 'Uncategorized'}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Completed: </Text>
            <Text style={styles.infoValue}>{formatDate(application.completedAt || application.createdAt)}</Text>
          </Text>
          
          {campaign.preferredLength && (
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Video length: </Text>
              <Text style={styles.infoValue}>{campaign.preferredLength}</Text>
            </Text>
          )}
          
          {application.revisionCount && application.revisionCount > 0 && (
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Revisions: </Text>
              <Text style={styles.infoValue}>{application.revisionCount}/3</Text>
            </Text>
          )}
        </View>

        {/* Advertiser Info */}
        <View style={styles.advertiserCard}>
          <Text style={styles.cardTitle}>Brand/Advertiser</Text>
          
          <View style={styles.advertiserRow}>
            <Image
              source={{ uri: toFullUrl(advertiser.profileImage) || 'https://via.placeholder.com/60' }}
              style={styles.advertiserAvatar}
            />
            <View style={styles.advertiserInfo}>
              <Text style={styles.advertiserName}>
                {advertiser.company || `${advertiser.firstName || ''} ${advertiser.lastName || ''}`}
              </Text>
              {advertiser.company && (
                <Text style={styles.advertiserContact}>
                  {advertiser.firstName} {advertiser.lastName}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Campaign Brief */}
        {campaign.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.cardTitle}>Campaign Brief</Text>
            <Text style={styles.description}>{campaign.description}</Text>
          </View>
        )}

        {/* Creative Direction */}
        {campaign.creativeDirection && (
          <View style={styles.creativeCard}>
            <Text style={styles.cardTitle}>Creative Direction</Text>
            
            {campaign.creativeDirection.moodTone && (
              <Text style={styles.creativeItem}>
                <Text style={styles.creativeLabel}>Mood/Tone: </Text>
                <Text style={styles.creativeValue}>{campaign.creativeDirection.moodTone}</Text>
              </Text>
            )}
            
            {campaign.creativeDirection.aspectRatio && (
              <Text style={styles.creativeItem}>
                <Text style={styles.creativeLabel}>Aspect Ratio: </Text>
                <Text style={styles.creativeValue}>{campaign.creativeDirection.aspectRatio}</Text>
              </Text>
            )}
            
            {campaign.creativeDirection.backgroundStyle && (
              <Text style={styles.creativeItem}>
                <Text style={styles.creativeLabel}>Background: </Text>
                <Text style={styles.creativeValue}>{campaign.creativeDirection.backgroundStyle}</Text>
              </Text>
            )}
          </View>
        )}

        {/* Key Phrases */}
        {campaign.keyPhrases && campaign.keyPhrases.length > 0 && (
          <View style={styles.phrasesCard}>
            <Text style={styles.cardTitle}>Key Phrases</Text>
            <View style={styles.phrasesContainer}>
              {campaign.keyPhrases.map((phrase, index) => (
                <View key={index} style={styles.phraseTag}>
                  <Text style={styles.phraseText}>{phrase}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Add to Portfolio CTA */}
        <TouchableOpacity style={styles.portfolioButton}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.portfolioGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="briefcase-outline" size={24} color="#fff" />
            <Text style={styles.portfolioButtonText}>Add to Portfolio</Text>
          </LinearGradient>
        </TouchableOpacity>

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
              Your video has been saved to your device's gallery.
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
    marginTop: 80,
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
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
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  paymentAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 14,
    color: '#64748b',
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
  advertiserCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  advertiserRow: {
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
  advertiserContact: {
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
  creativeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  creativeItem: {
    fontSize: 14,
    marginBottom: 8,
    color: '#334155',
  },
  creativeLabel: {
    fontWeight: '600',
    color: '#64748b',
  },
  creativeValue: {
    color: '#334155',
  },
  phrasesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  phrasesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  phraseTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  phraseText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '500',
  },
  portfolioButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  portfolioGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  portfolioButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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