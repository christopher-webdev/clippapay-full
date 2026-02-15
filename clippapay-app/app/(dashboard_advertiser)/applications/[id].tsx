// app/(dashboard_advertiser)/applications/[id].tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import { ApplicationWorkflow } from '../../components/applications/ApplicationWorkflow';
import { StatusBadge } from '../../components/applications/StatusBadge';
import { AddonBadge } from '../../components/applications/AddonBadge';

const { width } = Dimensions.get('window');
const API_BASE = 'https://clippapay.com/api';

interface Application {
  _id: string;
  campaign: {
    _id: string;
    title: string;
    kind: string;
    budget_total: number;
    desiredVideos: number;
    approvedVideosCount: number;
    pgcAddons?: string[];
    script?: string;
    thumb_url?: string;
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
    phone?: string;
    profileImage?: string;
  };
  status: 'pending' | 'shortlisted' | 'offer_sent' | 'accepted' | 'rejected' | 'expired' | 'working' | 'submitted' | 'revision_requested' | 'approved' | 'completed' | 'cancelled';
  scriptStatus?: 'not_required' | 'pending_review' | 'changes_requested' | 'approved';
  scriptExpiresAt?: string;
  creatorScript?: string;
  scriptRevisions?: Array<{
    submittedAt: string;
    content: string;
    feedback?: string;
    status: string;
  }>;
  submissionVideo?: string;
  submissionFiles?: string[];
  submittedAt?: string;
  submissionDeadline?: string;
  postUrls?: {
    instagram?: string;
    tiktok?: string;
    whatsapp?: string;
  };
  postScreenshots?: Array<{
    platform: string;
    url: string;
    uploadedAt: string;
  }>;
  revisions: Array<{
    requestedAt: string;
    notes: string;
    files?: string[];
    respondedAt?: string;
    responseNotes?: string;
  }>;
  revisionCount: number;
  maxRevisions: number;
  offerExpiresAt?: string;
  acceptedAt?: string;
  paidAt?: string;
  payoutAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullBrief, setShowFullBrief] = useState(false);

  useEffect(() => {
    loadApplication();
  }, [id]);

  const getToken = async () => {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('userToken');
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

  const loadApplication = async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      const response = await axios.get(`${API_BASE}/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setApplication(response.data);
    } catch (err: any) {
      console.error('Error loading application:', err);
      setError(err.response?.data?.error || 'Failed to load application');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadApplication();
  };

  const handleAction = async (action: string, data?: any) => {
    if (!application) return;

    setActionLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      let endpoint = '';
      let method = 'post';
      let body = {};

      switch (action) {
        case 'shortlist':
          endpoint = `${API_BASE}/applications/${application._id}/shortlist`;
          break;
        case 'send_offer':
          endpoint = `${API_BASE}/applications/${application._id}/send-offer`;
          break;
        case 'accept_offer':
          endpoint = `${API_BASE}/applications/${application._id}/accept`;
          break;
        case 'reject_offer':
          endpoint = `${API_BASE}/applications/${application._id}/reject`;
          break;
        case 'submit_script':
          endpoint = `${API_BASE}/applications/${application._id}/script`;
          body = { content: data.content };
          break;
        case 'approve_script':
          endpoint = `${API_BASE}/applications/${application._id}/approve-script`;
          break;
        case 'request_script_changes':
          endpoint = `${API_BASE}/applications/${application._id}/request-script-changes`;
          body = { feedback: data.feedback };
          break;
        case 'approve':
          endpoint = `${API_BASE}/applications/${application._id}/approve`;
          break;
        case 'request_revision':
          endpoint = `${API_BASE}/applications/${application._id}/request-revision`;
          body = { notes: data.notes };
          break;
        default:
          throw new Error('Unknown action');
      }

      await axios({
        method,
        url: endpoint,
        data: body,
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Success', 'Action completed successfully');
      loadApplication();

    } catch (err: any) {
      console.error('Action error:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const renderCreatorProfile = () => {
    if (!application) return null;
    const { clipper } = application;

    return (
      <TouchableOpacity 
        style={styles.creatorCard}
        onPress={() => router.push(`/(dashboard_advertiser)/creator/${clipper._id}`)}
      >
        <View style={styles.creatorAvatar}>
          {clipper.profileImage ? (
            <Image 
              source={{ uri: `${API_BASE}${clipper.profileImage}` }} 
              style={styles.avatarImage} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {clipper.firstName?.[0]}{clipper.lastName?.[0]}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.creatorInfo}>
          <Text style={styles.creatorName}>
            {clipper.firstName} {clipper.lastName}
          </Text>
          <Text style={styles.creatorEmail}>{clipper.email}</Text>
          {clipper.phone && (
            <Text style={styles.creatorPhone}>{clipper.phone}</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  const renderCampaignDetails = () => {
    if (!application) return null;
    const { campaign } = application;

    return (
      <View style={styles.campaignCard}>
        <View style={styles.campaignHeader}>
          {campaign.thumb_url ? (
            <Image 
              source={{ uri: `${API_BASE}${campaign.thumb_url}` }} 
              style={styles.campaignThumb}
            />
          ) : (
            <View style={styles.campaignThumbPlaceholder}>
              <Ionicons name="megaphone" size={24} color="#4F46E5" />
            </View>
          )}
          
          <View style={styles.campaignTitleContainer}>
            <Text style={styles.campaignTitle}>{campaign.title}</Text>
            <View style={styles.campaignMeta}>
              <View style={styles.budgetBadge}>
                <Ionicons name="wallet-outline" size={12} color="#059669" />
                <Text style={styles.budgetText}>
                  {formatCurrency(campaign.budget_total)}
                </Text>
              </View>
              <Text style={styles.campaignType}>
                {campaign.kind.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Add-ons */}
        {campaign.pgcAddons && campaign.pgcAddons.length > 0 && (
          <View style={styles.addonsSection}>
            <Text style={styles.sectionLabel}>Selected Add-ons:</Text>
            <View style={styles.addonsList}>
              {campaign.pgcAddons.map((addon, idx) => (
                <AddonBadge key={idx} addonId={addon} />
              ))}
            </View>
          </View>
        )}

        {/* Campaign Script/Instructions */}
        {campaign.script && (
          <View style={styles.scriptSection}>
            <Text style={styles.sectionLabel}>Script/Instructions:</Text>
            <Text style={styles.scriptText}>{campaign.script}</Text>
          </View>
        )}

        {/* Creative Brief */}
        {campaign.ugc?.brief && (
          <View style={styles.briefSection}>
            <View style={styles.briefHeader}>
              <Text style={styles.sectionLabel}>Creative Brief:</Text>
              <TouchableOpacity onPress={() => setShowFullBrief(!showFullBrief)}>
                <Text style={styles.showMoreText}>
                  {showFullBrief ? 'Show Less' : 'Show More'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text 
              style={styles.briefText}
              numberOfLines={showFullBrief ? undefined : 3}
            >
              {campaign.ugc.brief}
            </Text>
          </View>
        )}

        {/* Deliverables */}
        {campaign.ugc?.deliverables && campaign.ugc.deliverables.length > 0 && (
          <View style={styles.deliverablesSection}>
            <Text style={styles.sectionLabel}>Deliverables:</Text>
            {campaign.ugc.deliverables.map((item, idx) => (
              <View key={idx} style={styles.deliverableItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.deliverableText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Assets */}
        {campaign.ugc?.assets && campaign.ugc.assets.length > 0 && (
          <View style={styles.assetsSection}>
            <Text style={styles.sectionLabel}>Assets:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.assetsList}>
                {campaign.ugc.assets.map((asset, idx) => (
                  <TouchableOpacity key={idx} style={styles.assetItem}>
                    <Ionicons 
                      name={asset.match(/\.(jpg|jpeg|png|webp)$/i) ? 'image' : 'document'} 
                      size={20} 
                      color="#4F46E5" 
                    />
                    <Text style={styles.assetName} numberOfLines={1}>
                      {asset.split('/').pop()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Approval Criteria */}
        {campaign.ugc?.approvalCriteria && (
          <View style={styles.criteriaSection}>
            <Text style={styles.sectionLabel}>Approval Criteria:</Text>
            <Text style={styles.criteriaText}>{campaign.ugc.approvalCriteria}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading application...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !application) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorText}>{error || 'Application not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F9FAFB', '#F3F4F6']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Details</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.headerRefreshButton}>
          <Ionicons name="refresh" size={22} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Status Header */}
        <View style={styles.statusHeader}>
          <StatusBadge status={application.status} size="medium" />
          <Text style={styles.dateText}>
            Applied {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
          </Text>
        </View>

        {/* Creator Profile */}
        {renderCreatorProfile()}

        {/* Campaign Details */}
        {renderCampaignDetails()}

        {/* Workflow Panel */}
        <ApplicationWorkflow
          application={application}
          userRole="advertiser"
          onAction={handleAction}
          loading={actionLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
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
  backButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  creatorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  creatorEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  creatorPhone: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
  },
  campaignHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  campaignThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  campaignThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  campaignTitleContainer: {
    flex: 1,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  campaignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  budgetText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  campaignType: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  addonsSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  addonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scriptSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  scriptText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  briefSection: {
    marginBottom: 16,
  },
  briefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  showMoreText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  briefText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  deliverablesSection: {
    marginBottom: 16,
  },
  deliverableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  deliverableText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  assetsSection: {
    marginBottom: 16,
  },
  assetsList: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  assetName: {
    fontSize: 12,
    color: '#4F46E5',
    maxWidth: 80,
  },
  criteriaSection: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  criteriaText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
});