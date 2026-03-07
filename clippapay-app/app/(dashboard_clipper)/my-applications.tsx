// app/(dashboard_clipper)/my-applications.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_BASE_URL = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL;

const toFullUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${UPLOADS_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

type Application = {
  _id: string;
  campaign?: {
    _id: string;
    title: string;
    thumbnailUrl: string | null;
    category: string;
    preferredLength: string;
    applicationDeadline: string;
    advertiser: {
      firstName: string;
      lastName: string;
      company?: string;
    };
  };
  proposedRateNGN?: number;
  proposedRateUSDT?: number;
  note?: string;
  status: 'pending' | 'selected' | 'accepted' | 'submitted' | 'revision_requested' | 'approved' | 'rejected' | 'expired' | 'withdrawn' | 'disputed' | 'disputed_resolved';
  offerExpiresAt?: string;
  submissionDeadline?: string;
  createdAt: string;
  paymentAmount?: number;
  paymentCurrency?: 'NGN' | 'USDT';
  lastFeedback?: string;
  revisionCount?: number;
  currentVideoUrl?: string;
};

export default function MyApplicationsScreen() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyApplications = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const res = await fetch(`${API_URL}/applications/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load applications');

      setApplications(data.applications || []);
    } catch (err: any) {
      console.error('Fetch my applications error:', err);
      Alert.alert('Error', err.message || 'Could not load your applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';     // amber
      case 'selected': return '#3b82f6';    // blue
      case 'accepted': return '#10b981';    // green
      case 'submitted': return '#8b5cf6';   // purple
      case 'revision_requested': return '#f97316'; // orange
      case 'approved': return '#059669';    // dark green
      case 'rejected':
      case 'expired':
      case 'withdrawn': return '#ef4444';   // red
      case 'disputed': 
      case 'disputed_resolved': return '#dc2626'; // dark red
      default: return '#6b7280';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'revision_requested': return 'REVISION REQUESTED';
      case 'disputed_resolved': return 'DISPUTE RESOLVED';
      default: return status.replace('_', ' ').toUpperCase();
    }
  };

  const getActionText = (status: string) => {
    switch (status) {
      case 'pending':
      case 'selected':
        return 'Tap to review offer';
      case 'accepted':
        return 'Tap to submit video';
      case 'submitted':
        return 'Tap to view submission';
      case 'revision_requested':
        return 'Tap to resubmit video';
      case 'approved':
        return 'Tap to view details';
      case 'rejected':
      case 'expired':
      case 'withdrawn':
        return 'Tap to view details';
      case 'disputed':
      case 'disputed_resolved':
        return 'Tap to view dispute';
      default:
        return 'Tap to view';
    }
  };

  const handleApplicationPress = (item: Application) => {
    // Check if offer is expired for selected status
    if (item.status === 'selected' && item.offerExpiresAt) {
      const isExpired = new Date(item.offerExpiresAt) < new Date();
      if (isExpired) {
        // Still go to accept-offer screen but it will show as expired
        router.push({
          pathname: '/(dashboard_clipper)/accept-offer/[applicationId]',
          params: { applicationId: item._id },
        });
        return;
      }
    }

    // Route based on status
    switch (item.status) {
      case 'pending':
      case 'selected':
        router.push({
          pathname: '/(dashboard_clipper)/accept-offer/[applicationId]',
          params: { applicationId: item._id },
        });
        break;

      case 'accepted':
        router.push({
          pathname: '/(dashboard_clipper)/submit-video/[applicationId]',
          params: { applicationId: item._id },
        });
        break;

      case 'revision_requested':
        router.push({
          pathname: '/(dashboard_clipper)/review-revisions/[applicationId]',
          params: { applicationId: item._id },
        });
        break;

      case 'submitted':
        router.push({
          pathname: '/(dashboard_clipper)/submission-detail/[applicationId]',
          params: { applicationId: item._id },
        });
        break;

      case 'approved':
        router.push({
          pathname: '/(dashboard_clipper)/completed/[applicationId]',
          params: { applicationId: item._id },
        });
        break;

      case 'rejected':
      case 'expired':
      case 'withdrawn':
        router.push({
          pathname: '/(dashboard_clipper)/application-detail/[id]',
          params: { id: item._id },
        });
        break;

      case 'disputed':
      case 'disputed_resolved':
        router.push({
          pathname: '/(dashboard_clipper)/dispute-detail/[applicationId]',
          params: { applicationId: item._id },
        });
        break;

      default:
        // Fallback to detail screen
        router.push({
          pathname: '/(dashboard_clipper)/application-detail/[id]',
          params: { id: item._id },
        });
    }
  };

  const renderApplication = ({ item }: { item: Application }) => {
    const campaign = item.campaign || {};
    const isExpired = item.status === 'selected' && item.offerExpiresAt && new Date(item.offerExpiresAt) < new Date();
    const canAccept = item.status === 'selected' && !isExpired;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleApplicationPress(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: toFullUrl(campaign.thumbnailUrl) || 'https://via.placeholder.com/400x160/cccccc/000000?text=Campaign' }}
          style={styles.thumbnail}
          resizeMode="cover"
        />

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {campaign.title || 'Untitled Campaign'}
          </Text>

          <View style={styles.meta}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusDisplay(item.status)}</Text>
            </View>
            <Text style={styles.category}>
              {campaign.category || '—'}
            </Text>
          </View>

          <Text style={styles.advertiser}>
            by {campaign.advertiser?.company || `${campaign.advertiser?.firstName || ''} ${campaign.advertiser?.lastName || ''}` || 'Unknown'}
          </Text>

          <View style={styles.rates}>
            {item.proposedRateNGN && (
              <Text style={styles.rate}>₦{item.proposedRateNGN.toLocaleString()} NGN</Text>
            )}
            {item.proposedRateUSDT && (
              <Text style={styles.rate}>{item.proposedRateUSDT} USDT</Text>
            )}
          </View>

          {/* Show selected amount if available */}
          {item.status === 'selected' && item.paymentAmount && (
            <Text style={styles.offerAmount}>
              Offer: {item.paymentCurrency === 'NGN' ? '₦' : ''}{item.paymentAmount.toLocaleString()} {item.paymentCurrency}
            </Text>
          )}

          {/* Status-specific info */}
          {item.status === 'selected' && item.offerExpiresAt && (
            <Text style={[styles.statusInfo, isExpired ? styles.expiredText : styles.activeText]}>
              {isExpired 
                ? '⏰ Offer expired' 
                : `⏰ Expires: ${formatDate(item.offerExpiresAt)}`}
            </Text>
          )}

          {item.status === 'accepted' && item.submissionDeadline && (
            <Text style={[styles.statusInfo, styles.deadlineText]}>
              ⏰ Submit by: {formatDate(item.submissionDeadline)}
            </Text>
          )}

          {item.status === 'submitted' && (
            <Text style={[styles.statusInfo, styles.submittedText]}>
              ✓ Awaiting review
            </Text>
          )}

          {item.status === 'revision_requested' && (
            <Text style={[styles.statusInfo, styles.revisionText]}>
              ✏️ Revision {item.revisionCount}/3 - Tap to resubmit
            </Text>
          )}

          {item.status === 'approved' && (
            <Text style={[styles.statusInfo, styles.approvedText]}>
              ✓ Payment received
            </Text>
          )}

          {item.status === 'pending' && campaign.applicationDeadline && (
            <Text style={[styles.statusInfo, styles.deadlineText]}>
              Campaign deadline: {formatDate(campaign.applicationDeadline)}
            </Text>
          )}

          {/* Action hint */}
          <Text style={styles.actionHint}>
            {getActionText(item.status)} →
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Applications</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={styles.center} />
      ) : (
        <FlatList
          data={applications}
          renderItem={renderApplication}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchMyApplications(true)} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No applications yet</Text>
              <Text style={styles.emptySubtitle}>
                Browse campaigns and submit your proposals to get started
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push('/(dashboard_clipper)/join_ugc')}
              >
                <Text style={styles.browseBtnText}>Browse Campaigns</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginTop: 80,
  },

  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1e293b' },

  list: { padding: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  thumbnail: { width: '100%', height: 160 },

  content: { padding: 16 },

  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#1e293b' },

  meta: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },

  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },

  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  category: { 
    backgroundColor: '#f1f5f9', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16, 
    fontSize: 13,
    color: '#334155'
  },

  advertiser: { fontSize: 14, color: '#64748b', marginBottom: 8 },

  rates: { flexDirection: 'row', gap: 12, marginBottom: 8, flexWrap: 'wrap' },

  rate: { fontSize: 15, fontWeight: '600', color: '#1e293b' },

  offerAmount: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#059669', 
    marginBottom: 8,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },

  statusInfo: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f8fafc',
    alignSelf: 'flex-start',
  },

  activeText: {
    color: '#3b82f6',
  },

  expiredText: {
    color: '#ef4444',
  },

  deadlineText: {
    color: '#f97316',
  },

  submittedText: {
    color: '#8b5cf6',
  },

  revisionText: {
    color: '#f97316',
  },

  approvedText: {
    color: '#059669',
  },

  actionHint: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'right',
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 80 },

  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 20, color: '#1e293b' },

  emptySubtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 32 },

  browseBtn: { backgroundColor: '#6366f1', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },

  browseBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});