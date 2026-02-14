// app/(dashboard_advertiser)/ApplicationsList.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
  RefreshControl,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');
const API_BASE = 'https://clippapay.com/api';

interface Application {
  _id: string;
  campaign: {
    _id: string;
    title: string;
    kind: string;
    clipper_cpm: number;
    desiredVideos: number;
    approvedVideosCount: number;
    pgcAddons?: string[];
    script?: string;
    ugc?: {
      brief: string;
      deliverables: string[];
      assets: string[];
      approvalCriteria: string;
    };
  };
  clipper: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    rating: number;
    isPremiumCreator: boolean;
    profileImage?: string;
  };
  status: 'pending' | 'shortlisted' | 'offer_sent' | 'accepted' | 'rejected' | 'expired' | 'working' | 'submitted' | 'revision_requested' | 'approved' | 'completed';
  offerExpiresAt?: string;
  submissionDeadline?: string;
  submittedAt?: string;
  submissionUrl?: string;
  submissionVideo?: string;
  submissionFiles?: string[];
  revisions: Array<{
    requestedAt: string;
    notes: string;
    files?: string[];
    respondedAt?: string;
    responseNotes?: string;
    responseFiles?: string[];
  }>;
  revisionCount: number;
  maxRevisions: number;
  messages?: Array<{
    sender: string;
    content: string;
    files?: string[];
    createdAt: string;
  }>;
  createdAt: string;
}

type FilterType = 'all' | 'pending' | 'offer_sent' | 'accepted' | 'submitted' | 'approved' | 'completed';

export default function ApplicationsList() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const getToken = async () => {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('userToken');
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

  const loadApplications = async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      // Fetch all applications for advertiser's campaigns
      // You'll need to create this endpoint
      const response = await axios.get(`${API_BASE}/applications/advertiser/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setApplications(response.data);
    } catch (err: any) {
      console.error('Error loading applications:', err);
      setError(err.response?.data?.error || 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadApplications();
  };

  const handleSendOffer = async (applicationId: string) => {
    try {
      setSendingOffer(true);
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      await axios.post(
        `${API_BASE}/applications/${applicationId}/send-offer`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success', 'Offer sent to creator! They have 2 hours to respond.');
      setOfferModalVisible(false);
      loadApplications();

    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send offer');
    } finally {
      setSendingOffer(false);
    }
  };

  const handleShortlist = async (applicationId: string) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      await axios.post(
        `${API_BASE}/applications/${applicationId}/shortlist`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      loadApplications();

    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to shortlist');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { bg: '#FEF3C7', text: '#D97706', label: 'Pending Review', icon: 'time-outline' },
      shortlisted: { bg: '#DBEAFE', text: '#2563EB', label: 'Shortlisted', icon: 'star-outline' },
      offer_sent: { bg: '#DCFCE7', text: '#16A34A', label: 'Offer Sent', icon: 'mail-outline' },
      accepted: { bg: '#DCFCE7', text: '#16A34A', label: 'Accepted', icon: 'checkmark-circle-outline' },
      rejected: { bg: '#FEE2E2', text: '#DC2626', label: 'Rejected', icon: 'close-circle-outline' },
      expired: { bg: '#F3F4F6', text: '#6B7280', label: 'Expired', icon: 'time-outline' },
      working: { bg: '#DBEAFE', text: '#2563EB', label: 'Working', icon: 'construct-outline' },
      submitted: { bg: '#FEF3C7', text: '#D97706', label: 'Submitted', icon: 'videocam-outline' },
      revision_requested: { bg: '#FEF3C7', text: '#D97706', label: 'Revision Needed', icon: 'create-outline' },
      approved: { bg: '#DCFCE7', text: '#16A34A', label: 'Approved', icon: 'checkmark-done-outline' },
      completed: { bg: '#DCFCE7', text: '#16A34A', label: 'Completed', icon: 'flag-outline' }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const getAddonIcon = (addonId: string) => {
    const icons = {
      script: 'document-text-outline',
      whatsapp: 'logo-whatsapp',
      ig: 'logo-instagram',
      tiktok: 'logo-tiktok',
      outdoor: 'sunny-outline'
    };
    return icons[addonId as keyof typeof icons] || 'apps-outline';
  };

  const getAddonLabel = (addonId: string): string => {
    const labels = {
      script: 'Creator provides script',
      whatsapp: 'Post on WhatsApp',
      ig: 'Post on Instagram',
      tiktok: 'Post on TikTok',
      outdoor: 'Outdoor shoot'
    };
    return labels[addonId as keyof typeof labels] || addonId;
  };

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const filteredApplications = applications.filter(app => {
    if (activeFilter === 'all') return true;
    return app.status === activeFilter;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    offer_sent: applications.filter(a => a.status === 'offer_sent').length,
    submitted: applications.filter(a => a.status === 'submitted' || a.status === 'revision_requested').length,
    approved: applications.filter(a => a.status === 'approved' || a.status === 'completed').length,
  };

  const renderApplicationCard = ({ item }: { item: Application }) => {
    const statusConfig = getStatusConfig(item.status);
    const campaign = item.campaign;
    const clipper = item.clipper;
    const hasOffer = item.status === 'offer_sent';
    const hasSubmitted = item.status === 'submitted' || item.status === 'revision_requested';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedApplication(item);
          setModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.cardGradient}>
          {/* Header with status */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.text} />
                <Text style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </Text>
              </View>
              {item.offerExpiresAt && item.status === 'offer_sent' && (
                <View style={styles.expiryBadge}>
                  <Ionicons name="time-outline" size={12} color="#D97706" />
                  <Text style={styles.expiryText}>
                    Expires {formatDistanceToNow(new Date(item.offerExpiresAt), { addSuffix: true })}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.dateText}>
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </Text>
          </View>

          {/* Campaign Info */}
          <View style={styles.campaignInfo}>
            <View style={styles.campaignTitleContainer}>
              <Ionicons name="megaphone-outline" size={16} color="#4F46E5" />
              <Text style={styles.campaignTitle} numberOfLines={1}>
                {campaign.title}
              </Text>
            </View>
            
            {/* Add-ons badges */}
            {campaign.pgcAddons && campaign.pgcAddons.length > 0 && (
              <View style={styles.addonsContainer}>
                {campaign.pgcAddons.map((addon, index) => (
                  <View key={index} style={styles.addonBadge}>
                    <Ionicons 
                      name={getAddonIcon(addon) as any} 
                      size={12} 
                      color="#4F46E5" 
                    />
                    <Text style={styles.addonBadgeText}>
                      {getAddonLabel(addon)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Creator Info */}
          <View style={styles.creatorInfo}>
            <View style={styles.creatorAvatar}>
              {clipper.profileImage ? (
                <Image source={{ uri: clipper.profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {clipper.firstName?.[0]}{clipper.lastName?.[0]}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.creatorDetails}>
              <View style={styles.creatorNameRow}>
                <Text style={styles.creatorName}>
                  {clipper.firstName} {clipper.lastName}
                </Text>
                {clipper.isPremiumCreator && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.premiumText}>PREMIUM</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.creatorMeta}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={12} color="#FBBF24" />
                  <Text style={styles.ratingText}>{clipper.rating?.toFixed(1) || '0.0'}</Text>
                </View>
                
                <View style={styles.payoutContainer}>
                  <Ionicons name="cash-outline" size={12} color="#059669" />
                  <Text style={styles.payoutText}>
                    {formatCurrency(campaign.clipper_cpm)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Progress/Status specific info */}
          {hasOffer && (
            <View style={styles.offerInfo}>
              <Ionicons name="information-circle" size={16} color="#2563EB" />
              <Text style={styles.offerInfoText}>
                Waiting for creator to accept offer
              </Text>
            </View>
          )}

          {hasSubmitted && (
            <View style={styles.submissionInfo}>
              <View style={styles.revisionCounter}>
                <Text style={styles.revisionText}>
                  Revision {item.revisionCount}/{item.maxRevisions}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.reviewButton}
                onPress={() => {
                  setSelectedApplication(item);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.reviewButtonText}>Review Submission</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          {item.status === 'pending' && (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.shortlistButton]}
                onPress={() => handleShortlist(item._id)}
              >
                <Ionicons name="star-outline" size={16} color="#2563EB" />
                <Text style={styles.shortlistText}>Shortlist</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.offerButton]}
                onPress={() => {
                  setSelectedApplication(item);
                  setOfferModalVisible(true);
                }}
              >
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  style={styles.offerButtonGradient}
                >
                  <Text style={styles.offerButtonText}>Send Offer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {item.status === 'shortlisted' && (
            <TouchableOpacity
              style={[styles.fullWidthButton, styles.sendOfferFullButton]}
              onPress={() => {
                setSelectedApplication(item);
                setOfferModalVisible(true);
              }}
            >
              <Text style={styles.sendOfferFullText}>Send Offer to Creator</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading applications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F9FAFB', '#F3F4F6']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Creator Applications</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.statCardTotal]}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, styles.statCardPending]}>
              <Text style={styles.statNumber}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statCard, styles.statCardOffer]}>
              <Text style={styles.statNumber}>{stats.offer_sent}</Text>
              <Text style={styles.statLabel}>Offers</Text>
            </View>
            <View style={[styles.statCard, styles.statCardSubmitted]}>
              <Text style={styles.statNumber}>{stats.submitted}</Text>
              <Text style={styles.statLabel}>Submitted</Text>
            </View>
            <View style={[styles.statCard, styles.statCardApproved]}>
              <Text style={styles.statNumber}>{stats.approved}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
          </View>
        </ScrollView>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterContainer}>
            {(['all', 'pending', 'offer_sent', 'submitted', 'approved'] as FilterType[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  activeFilter === filter && styles.filterChipActive
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterTextActive
                ]}>
                  {filter === 'all' ? 'All' : 
                   filter === 'offer_sent' ? 'Offers' :
                   filter === 'submitted' ? 'To Review' :
                   filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadApplications}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredApplications}
        renderItem={renderApplicationCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !error && (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Applications Yet</Text>
              <Text style={styles.emptyText}>
                When creators apply to your campaigns, they'll appear here.
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/(dashboard_advertiser)/campaigns')}
              >
                <Text style={styles.browseButtonText}>View Your Campaigns</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Application Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        {selectedApplication && (
          <ApplicationDetailsModal
            application={selectedApplication}
            onClose={() => setModalVisible(false)}
            onRefresh={loadApplications}
            formatCurrency={formatCurrency}
            getAddonIcon={getAddonIcon}
            getAddonLabel={getAddonLabel}
            getStatusConfig={getStatusConfig}
          />
        )}
      </Modal>

      {/* Send Offer Modal */}
      <Modal
        visible={offerModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <View style={styles.offerModalOverlay}>
          <View style={styles.offerModalContent}>
            <View style={styles.offerModalHeader}>
              <Text style={styles.offerModalTitle}>Send Offer to Creator</Text>
              <TouchableOpacity onPress={() => setOfferModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedApplication && (
              <>
                <View style={styles.offerModalBody}>
                  <View style={styles.offerCreatorInfo}>
                    <View style={styles.offerAvatar}>
                      {selectedApplication.clipper.profileImage ? (
                        <Image source={{ uri: selectedApplication.clipper.profileImage }} style={styles.offerAvatarImage} />
                      ) : (
                        <View style={styles.offerAvatarPlaceholder}>
                          <Text style={styles.offerAvatarText}>
                            {selectedApplication.clipper.firstName?.[0]}
                            {selectedApplication.clipper.lastName?.[0]}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View>
                      <Text style={styles.offerCreatorName}>
                        {selectedApplication.clipper.firstName} {selectedApplication.clipper.lastName}
                      </Text>
                      <Text style={styles.offerCreatorEmail}>{selectedApplication.clipper.email}</Text>
                    </View>
                  </View>

                  <View style={styles.offerDetails}>
                    <View style={styles.offerDetailRow}>
                      <Text style={styles.offerDetailLabel}>Campaign:</Text>
                      <Text style={styles.offerDetailValue}>{selectedApplication.campaign.title}</Text>
                    </View>
                    <View style={styles.offerDetailRow}>
                      <Text style={styles.offerDetailLabel}>Payout:</Text>
                      <Text style={styles.offerPayout}>
                        {formatCurrency(selectedApplication.campaign.clipper_cpm)}
                      </Text>
                    </View>
                    <View style={styles.offerDetailRow}>
                      <Text style={styles.offerDetailLabel}>Deadline:</Text>
                      <Text style={styles.offerDetailValue}>3 days after acceptance</Text>
                    </View>
                  </View>

                  <View style={styles.offerWarning}>
                    <Ionicons name="information-circle" size={20} color="#F59E0B" />
                    <Text style={styles.offerWarningText}>
                      Creator will have 2 hours to accept this offer. If they don't respond, the offer will expire.
                    </Text>
                  </View>
                </View>

                <View style={styles.offerModalFooter}>
                  <TouchableOpacity
                    style={styles.cancelOfferButton}
                    onPress={() => setOfferModalVisible(false)}
                  >
                    <Text style={styles.cancelOfferText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmOfferButton}
                    onPress={() => handleSendOffer(selectedApplication._id)}
                    disabled={sendingOffer}
                  >
                    {sendingOffer ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.confirmOfferText}>Send Offer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Application Details Modal Component
function ApplicationDetailsModal({ 
  application, 
  onClose, 
  onRefresh,
  formatCurrency,
  getAddonIcon,
  getAddonLabel,
  getStatusConfig
}: any) {
  const router = useRouter();
  const [revisionNotes, setRevisionNotes] = useState('');
  const [sendingRevision, setSendingRevision] = useState(false);
  const [approving, setApproving] = useState(false);

  const statusConfig = getStatusConfig(application.status);
  const campaign = application.campaign;
  const clipper = application.clipper;

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      Alert.alert('Error', 'Please provide revision notes');
      return;
    }

    try {
      setSendingRevision(true);
      const token = await SecureStore.getItemAsync('userToken');
      
      await axios.post(
        `${API_BASE}/applications/${application._id}/request-revision`,
        { notes: revisionNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success', 'Revision requested');
      onRefresh();
      setRevisionNotes('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to request revision');
    } finally {
      setSendingRevision(false);
    }
  };

  const handleApprove = async () => {
    Alert.alert(
      'Approve Video',
      'Once approved, the creator will be paid and this application will be completed. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'destructive',
          onPress: async () => {
            try {
              setApproving(true);
              const token = await SecureStore.getItemAsync('userToken');
              
              await axios.post(
                `${API_BASE}/applications/${application._id}/approve`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );

              Alert.alert('Success', 'Video approved and payment sent!');
              onRefresh();
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to approve');
            } finally {
              setApproving(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <View style={[styles.modalStatusBadge, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={16} color={statusConfig.text} />
              <Text style={[styles.modalStatusText, { color: statusConfig.text }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          {/* Campaign Info */}
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Campaign Details</Text>
            <View style={styles.modalCampaignCard}>
              <Text style={styles.modalCampaignTitle}>{campaign.title}</Text>
              
              {campaign.pgcAddons && campaign.pgcAddons.length > 0 && (
                <View style={styles.modalAddons}>
                  <Text style={styles.modalAddonsLabel}>Selected Add-ons:</Text>
                  <View style={styles.modalAddonsList}>
                    {campaign.pgcAddons.map((addon: string, idx: number) => (
                      <View key={idx} style={styles.modalAddonItem}>
                        <Ionicons name={getAddonIcon(addon)} size={16} color="#4F46E5" />
                        <Text style={styles.modalAddonText}>{getAddonLabel(addon)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {campaign.script && (
                <View style={styles.modalScript}>
                  <Text style={styles.modalScriptLabel}>Script/Instructions:</Text>
                  <Text style={styles.modalScriptText}>{campaign.script}</Text>
                </View>
              )}

              {campaign.ugc?.brief && (
                <View style={styles.modalBrief}>
                  <Text style={styles.modalBriefLabel}>Creative Brief:</Text>
                  <Text style={styles.modalBriefText}>{campaign.ugc.brief}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Creator Info */}
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Creator</Text>
            <TouchableOpacity 
              style={styles.modalCreatorCard}
              onPress={() => router.push(`/(dashboard_advertiser)/creator/${clipper._id}`)}
            >
              <View style={styles.modalCreatorAvatar}>
                {clipper.profileImage ? (
                  <Image source={{ uri: clipper.profileImage }} style={styles.modalAvatarImage} />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Text style={styles.modalAvatarText}>
                      {clipper.firstName?.[0]}{clipper.lastName?.[0]}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.modalCreatorInfo}>
                <Text style={styles.modalCreatorName}>
                  {clipper.firstName} {clipper.lastName}
                </Text>
                <Text style={styles.modalCreatorEmail}>{clipper.email}</Text>
                <View style={styles.modalCreatorRating}>
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text style={styles.modalCreatorRatingText}>{clipper.rating?.toFixed(1) || '0.0'}</Text>
                  {clipper.isPremiumCreator && (
                    <View style={styles.modalPremiumBadge}>
                      <Text style={styles.modalPremiumText}>PREMIUM</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Submission Details (if submitted) */}
          {(application.status === 'submitted' || application.status === 'revision_requested') && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Submission</Text>
              <View style={styles.modalSubmissionCard}>
                {application.submissionVideo && (
                  <TouchableOpacity 
                    style={styles.modalVideoButton}
                    onPress={() => {
                      // Navigate to video player
                      router.push({
                        pathname: '/(dashboard_advertiser)/video-player',
                        params: { url: application.submissionVideo }
                      });
                    }}
                  >
                    <Ionicons name="play-circle" size={48} color="#4F46E5" />
                    <Text style={styles.modalVideoText}>View Submitted Video</Text>
                  </TouchableOpacity>
                )}

                {application.submissionUrl && (
                  <View style={styles.modalUrlContainer}>
                    <Text style={styles.modalUrlLabel}>Post URL:</Text>
                    <TouchableOpacity onPress={() => {
                      // Open URL in browser
                    }}>
                      <Text style={styles.modalUrlText} numberOfLines={1}>
                        {application.submissionUrl}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {application.submissionFiles && application.submissionFiles.length > 0 && (
                  <View style={styles.modalFiles}>
                    <Text style={styles.modalFilesLabel}>Additional Files:</Text>
                    {application.submissionFiles.map((file: string, idx: number) => (
                      <TouchableOpacity key={idx} style={styles.modalFileItem}>
                        <Ionicons name="document-outline" size={20} color="#6B7280" />
                        <Text style={styles.modalFileName} numberOfLines={1}>
                          {file.split('/').pop()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Revision History */}
                {application.revisions.length > 0 && (
                  <View style={styles.revisionHistory}>
                    <Text style={styles.revisionHistoryTitle}>Revision History</Text>
                    {application.revisions.map((rev: any, idx: number) => (
                      <View key={idx} style={styles.revisionItem}>
                        <View style={styles.revisionHeader}>
                          <Ionicons name="create-outline" size={16} color="#D97706" />
                          <Text style={styles.revisionDate}>
                            {new Date(rev.requestedAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={styles.revisionNotes}>{rev.notes}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Section */}
          {(application.status === 'submitted' || application.status === 'revision_requested') && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Review & Approve</Text>
              
              {application.revisionCount < application.maxRevisions && (
                <View style={styles.revisionInputContainer}>
                  <TextInput
                    style={styles.revisionInput}
                    placeholder="Enter revision notes..."
                    value={revisionNotes}
                    onChangeText={setRevisionNotes}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={styles.requestRevisionButton}
                    onPress={handleRequestRevision}
                    disabled={sendingRevision}
                  >
                    {sendingRevision ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.requestRevisionText}>
                        Request Revision ({application.revisionCount}/{application.maxRevisions})
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.approveButton}
                onPress={handleApprove}
                disabled={approving}
              >
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  style={styles.approveButtonGradient}
                >
                  {approving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <Text style={styles.approveButtonText}>Approve & Release Payment</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsScroll: {
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  statCardTotal: {
    backgroundColor: '#EEF2FF',
  },
  statCardPending: {
    backgroundColor: '#FEF3C7',
  },
  statCardOffer: {
    backgroundColor: '#DCFCE7',
  },
  statCardSubmitted: {
    backgroundColor: '#DBEAFE',
  },
  statCardApproved: {
    backgroundColor: '#DCFCE7',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  expiryText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  campaignInfo: {
    marginBottom: 12,
  },
  campaignTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  addonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  addonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  addonBadgeText: {
    fontSize: 10,
    color: '#4F46E5',
    fontWeight: '500',
  },
  creatorInfo: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  creatorDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  premiumText: {
    fontSize: 8,
    color: '#D97706',
    fontWeight: '700',
  },
  creatorMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  payoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payoutText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  offerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  offerInfoText: {
    fontSize: 13,
    color: '#2563EB',
    flex: 1,
  },
  submissionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  revisionCounter: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  revisionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  reviewButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortlistButton: {
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    gap: 6,
  },
  shortlistText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  offerButton: {
    overflow: 'hidden',
  },
  offerButtonGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fullWidthButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  sendOfferFullButton: {
    backgroundColor: '#22C55E',
  },
  sendOfferFullText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Offer Modal Styles
  offerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  offerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  offerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  offerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  offerModalBody: {
    padding: 16,
  },
  offerCreatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  offerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  offerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  offerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  offerCreatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  offerCreatorEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  offerDetails: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  offerDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offerDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  offerDetailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  offerPayout: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '700',
  },
  offerWarning: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    alignItems: 'center',
  },
  offerWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#D97706',
  },
  offerModalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelOfferButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelOfferText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmOfferButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmOfferText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 16,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  modalCampaignCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  modalCampaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  modalAddons: {
    marginTop: 8,
  },
  modalAddonsLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  modalAddonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalAddonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  modalAddonText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '500',
  },
  modalScript: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  modalScriptLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalScriptText: {
    fontSize: 13,
    color: '#111827',
    lineHeight: 18,
  },
  modalBrief: {
    marginTop: 12,
  },
  modalBriefLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalBriefText: {
    fontSize: 13,
    color: '#111827',
    lineHeight: 18,
  },
  modalCreatorCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  modalCreatorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  modalAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  modalCreatorInfo: {
    flex: 1,
  },
  modalCreatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalCreatorEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalCreatorRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  modalCreatorRatingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalPremiumBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalPremiumText: {
    fontSize: 9,
    color: '#D97706',
    fontWeight: '700',
  },
  modalSubmissionCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  modalVideoButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    marginBottom: 12,
  },
  modalVideoText: {
    marginTop: 8,
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  modalUrlContainer: {
    marginBottom: 12,
  },
  modalUrlLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalUrlText: {
    fontSize: 13,
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  modalFiles: {
    marginBottom: 12,
  },
  modalFilesLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  modalFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
    gap: 8,
  },
  modalFileName: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },
  revisionHistory: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  revisionHistoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  revisionItem: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  revisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  revisionDate: {
    fontSize: 11,
    color: '#6B7280',
  },
  revisionNotes: {
    fontSize: 12,
    color: '#374151',
    paddingLeft: 20,
  },
  revisionInputContainer: {
    marginBottom: 12,
  },
  revisionInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 8,
  },
  requestRevisionButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestRevisionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  approveButton: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  approveButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});