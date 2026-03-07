// app/(dashboard)/advertiser/review-submission/[campaignId].tsx
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

type VideoSubmission = {
  _id: string;
  applicationId: {
    _id: string;
    proposedRateNGN?: number;
    proposedRateUSDT?: number;
    paymentCurrency?: 'NGN' | 'USDT';
    paymentAmount?: number;
    revisionCount: number;
  };
  clipperId: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
    rating: number;
  };
  videoUrl: string;
  thumbnailUrl: string;
  submissionDate: string;
  status: 'pending_review' | 'approved' | 'revision_requested';
  revisionCount: number;
  feedback: Array<{
    message: string;
    createdAt: string;
    fromAdvertiser: string;
  }>;
  approvedAt?: string;
};

type CampaignData = {
  _id: string;
  title: string;
  description: string;
  script: string;
  category: string;
  status: string;
  videoSubmissions: VideoSubmission[];
  selectedClipper: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
    rating: number;
  };
  finalVideo?: {
    url: string;
    thumbnailUrl: string;
    approvedAt: string;
  };
};

export default function ReviewSubmissionScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router = useRouter();
  
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<VideoSubmission | null>(null);
  
  // Video player
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);
  
  // Revision modal
  const [revisionModalVisible, setRevisionModalVisible] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [submittingRevision, setSubmittingRevision] = useState(false);
  
  // Approval modal
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [approving, setApproving] = useState(false);

  // Success modal
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

      setCampaign(data.campaign);
      
      // Auto-select the pending submission if any
      const pendingSubmission = data.campaign.videoSubmissions?.find(
        (s: VideoSubmission) => s.status === 'pending_review'
      );
      if (pendingSubmission) {
        setSelectedSubmission(pendingSubmission);
      }
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

  const handleRequestRevision = async () => {
    if (!revisionFeedback.trim()) {
      Alert.alert('Error', 'Please provide feedback for the revision');
      return;
    }

    if (!selectedSubmission) return;

    setSubmittingRevision(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API_URL}/applications/${selectedSubmission.applicationId._id}/revision`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback: revisionFeedback.trim() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to request revision');

      setSuccessMessage('Revision requested successfully. The clipper has been notified.');
      setSuccessModalVisible(true);
      
      // Refresh data
      fetchCampaignData();
      
      // Close modals
      setRevisionModalVisible(false);
      setRevisionFeedback('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to request revision');
    } finally {
      setSubmittingRevision(false);
    }
  };

  const handleApproveVideo = async () => {
    if (!selectedSubmission) return;

    setApproving(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API_URL}/applications/${selectedSubmission.applicationId._id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to approve video');

      const amount = selectedSubmission.applicationId.paymentCurrency === 'NGN' 
        ? `₦${selectedSubmission.applicationId.paymentAmount?.toLocaleString()}`
        : `${selectedSubmission.applicationId.paymentAmount} USDT`;

      setSuccessMessage(`Video approved! Payment of ${amount} has been released to the clipper.`);
      setSuccessModalVisible(true);
      
      // Refresh data
      fetchCampaignData();
      
      // Close modal
      setApproveModalVisible(false);
      setSelectedSubmission(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve video');
    } finally {
      setApproving(false);
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
        <Text style={styles.loadingText}>Loading submission...</Text>
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

  const pendingSubmission = campaign.videoSubmissions?.find(s => s.status === 'pending_review');
  const hasApprovedVideo = campaign.finalVideo;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Review Submission
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Campaign Info Card */}
        <View style={styles.campaignCard}>
          <Text style={styles.campaignTitle}>{campaign.title}</Text>
          <Text style={styles.campaignCategory}>{campaign.category}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionLabel}>Campaign Brief</Text>
          <Text style={styles.campaignDescription}>{campaign.description}</Text>
          
          {campaign.script && (
            <>
              <Text style={styles.sectionLabel}>Script</Text>
              <Text style={styles.campaignScript}>{campaign.script}</Text>
            </>
          )}
        </View>

        {/* Clipper Info */}
        {campaign.selectedClipper && (
          <View style={styles.clipperCard}>
            <View style={styles.clipperHeader}>
              <Image
                source={{ uri: toFullUrl(campaign.selectedClipper.profileImage) || 'https://via.placeholder.com/60' }}
                style={styles.clipperAvatar}
              />
              <View style={styles.clipperInfo}>
                <Text style={styles.clipperName}>
                  {campaign.selectedClipper.firstName} {campaign.selectedClipper.lastName}
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#fbbf24" />
                  <Text style={styles.rating}>{campaign.selectedClipper.rating.toFixed(1)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Video Submissions */}
        {campaign.videoSubmissions && campaign.videoSubmissions.length > 0 ? (
          <View style={styles.submissionsSection}>
            <Text style={styles.sectionTitle}>Video Submissions</Text>
            
            {campaign.videoSubmissions.map((submission) => (
              <TouchableOpacity
                key={submission._id}
                style={[
                  styles.submissionCard,
                  selectedSubmission?._id === submission._id && styles.selectedSubmission,
                  submission.status === 'approved' && styles.approvedSubmission,
                ]}
                onPress={() => setSelectedSubmission(submission)}
              >
                <View style={styles.submissionHeader}>
                  <View style={styles.submissionBadge}>
                    <Ionicons 
                      name={
                        submission.status === 'approved' ? 'checkmark-circle' :
                        submission.status === 'revision_requested' ? 'refresh' :
                        'time'
                      } 
                      size={20} 
                      color={
                        submission.status === 'approved' ? '#10b981' :
                        submission.status === 'revision_requested' ? '#f59e0b' :
                        '#6366f1'
                      } 
                    />
                    <Text style={[
                      styles.submissionStatus,
                      submission.status === 'approved' && styles.approvedText,
                      submission.status === 'revision_requested' && styles.revisionText,
                    ]}>
                      {submission.status === 'pending_review' ? 'Pending Review' :
                       submission.status === 'approved' ? 'Approved' :
                       submission.status === 'revision_requested' ? `Revision ${submission.revisionCount}` :
                       submission.status}
                    </Text>
                  </View>
                  <Text style={styles.submissionDate}>
                    {formatDate(submission.submissionDate)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.videoThumbnail}
                  onPress={() => openVideo(submission.videoUrl)}
                >
                  {submission.thumbnailUrl ? (
                    <Image
                      source={{ uri: toFullUrl(submission.thumbnailUrl) || '' }}
                      style={styles.thumbnailImage}
                    />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <Ionicons name="videocam" size={32} color="#6366f1" />
                    </View>
                  )}
                  <View style={styles.playButton}>
                    <Ionicons name="play-circle" size={48} color="#fff" />
                  </View>
                </TouchableOpacity>

                {/* Feedback History */}
                {submission.feedback && submission.feedback.length > 0 && (
                  <View style={styles.feedbackHistory}>
                    <Text style={styles.feedbackTitle}>Revision History:</Text>
                    {submission.feedback.map((fb, index) => (
                      <View key={index} style={styles.feedbackItem}>
                        <Text style={styles.feedbackMessage}>• {fb.message}</Text>
                        <Text style={styles.feedbackDate}>
                          {new Date(fb.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Payment Info */}
                {submission.applicationId.paymentAmount && (
                  <View style={styles.paymentInfo}>
                    <Ionicons name="wallet-outline" size={16} color="#10b981" />
                    <Text style={styles.paymentText}>
                      Payment: {submission.applicationId.paymentCurrency === 'NGN' ? '₦' : ''}
                      {submission.applicationId.paymentAmount?.toLocaleString()}
                      {submission.applicationId.paymentCurrency === 'USDT' ? ' USDT' : ''}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptySubmissions}>
            <Ionicons name="videocam-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No submissions yet</Text>
            <Text style={styles.emptySubtitle}>
              The clipper hasn't submitted any videos yet
            </Text>
          </View>
        )}

        {/* Action Buttons - Only show for pending submission */}
        {selectedSubmission && selectedSubmission.status === 'pending_review' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.revisionButton}
              onPress={() => setRevisionModalVisible(true)}
            >
              <LinearGradient
                colors={['#f59e0b', '#f97316']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Request Revision</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => setApproveModalVisible(true)}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Approve & Pay</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Completed State */}
        {hasApprovedVideo && (
          <View style={styles.completedCard}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.completedTitle}>Campaign Completed!</Text>
            <Text style={styles.completedText}>
              Video approved on {campaign.finalVideo?.approvedAt ? formatDate(campaign.finalVideo.approvedAt) : ''}
            </Text>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => openVideo(campaign.finalVideo?.url || '')}
            >
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.downloadButtonText}>View Final Video</Text>
            </TouchableOpacity>
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

      {/* Revision Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={revisionModalVisible}
        onRequestClose={() => setRevisionModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.revisionModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Revision</Text>
              <TouchableOpacity 
                onPress={() => {
                  setRevisionModalVisible(false);
                  setRevisionFeedback('');
                }}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.revisionHint}>
                Please provide clear feedback for the clipper. What changes would you like to see?
              </Text>

              <TextInput
                style={styles.revisionInput}
                value={revisionFeedback}
                onChangeText={setRevisionFeedback}
                placeholder="Enter your revision feedback here..."
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <View style={styles.revisionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setRevisionModalVisible(false);
                    setRevisionFeedback('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitRevisionButton,
                    (!revisionFeedback.trim() || submittingRevision) && styles.disabledButton,
                  ]}
                  onPress={handleRequestRevision}
                  disabled={!revisionFeedback.trim() || submittingRevision}
                >
                  {submittingRevision ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitRevisionText}>Send Revision Request</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.revisionNote}>
                Note: Maximum 3 revisions allowed. The clipper will be notified immediately.
              </Text>
            </ScrollView>
          </View>
        </BlurView>
      </Modal>

      {/* Approve Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={approveModalVisible}
        onRequestClose={() => setApproveModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            </View>
            
            <Text style={styles.confirmTitle}>Approve Video?</Text>
            
            <Text style={styles.confirmText}>
              Are you sure you want to approve this video? 
              Once approved, the payment of {
                selectedSubmission?.applicationId.paymentCurrency === 'NGN' 
                  ? `₦${selectedSubmission?.applicationId.paymentAmount?.toLocaleString()}`
                  : `${selectedSubmission?.applicationId.paymentAmount} USDT`
              } will be released to the clipper.
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setApproveModalVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmApproveButton, approving && styles.disabledButton]}
                onPress={handleApproveVideo}
                disabled={approving}
              >
                {approving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmApproveText}>Yes, Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            </View>
            
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>

            <TouchableOpacity
             onPress={() => {
              setSuccessModalVisible(false);
              router.replace(`(dashboard_advertiser)/completed/${selectedSubmission?.campaignId}`);
            }}
            >
              <Text style={styles.successButtonText}>Continue</Text>
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
  clipperCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  clipperHeader: {
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
  submissionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  submissionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedSubmission: {
    borderColor: '#6366f1',
    borderWidth: 2,
  },
  approvedSubmission: {
    backgroundColor: '#f0fdf4',
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  submissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submissionStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  approvedText: {
    color: '#10b981',
  },
  revisionText: {
    color: '#f59e0b',
  },
  submissionDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  videoThumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: '#334155',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackHistory: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  feedbackItem: {
    marginBottom: 8,
  },
  feedbackMessage: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  feedbackDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  revisionButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  approveButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubmissions: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  completedCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86efac',
    marginBottom: 24,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#166534',
    marginTop: 12,
    marginBottom: 4,
  },
  completedText: {
    fontSize: 14,
    color: '#16a34a',
    marginBottom: 16,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 15,
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
  revisionModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: width * 0.85,
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: width * 0.8,
    alignItems: 'center',
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
  revisionHint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  revisionInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    backgroundColor: '#f8fafc',
  },
  revisionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  submitRevisionButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
  },
  submitRevisionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  revisionNote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
  },
  confirmIcon: {
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  confirmText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmApproveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  confirmApproveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});