// app/(dashboard)/advertiser/my-campaigns.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

// ────────────────────────────────────────────────
// Use process.env — Expo injects EXPO_PUBLIC_* vars automatically
// ────────────────────────────────────────────────
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_BASE_URL = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL;

const toFullUrl = (path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('file://') || path.startsWith('content://')) return path;

  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${UPLOADS_BASE_URL}${cleanPath}`;
};

type Campaign = {
  _id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  category: string;
  status: 'draft' | 'active' | 'closed' | 'completed' | 'cancelled' | 'video_submitted' | 'revision_submitted';
  applicationDeadline: string;
  createdAt: string;
};

export default function MyCampaignsScreen() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCampaigns = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const response = await fetch(`${API_URL}/campaigns/my`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to load campaigns');
      }

      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      console.error('Failed to fetch campaigns:', err);
      Alert.alert('Error', err.message || 'Could not load your campaigns. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#f59e0b';      // amber
      case 'active': return '#10b981';      // emerald
      case 'closed': return '#6b7280';      // gray
      case 'video_submitted': return '#8b5cf6'; // purple
      case 'revision_submitted': return '#f97316'; // orange
      case 'completed': return '#3b82f6';    // blue
      case 'cancelled': return '#ef4444';    // red
      default: return '#6b7280';
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'video_submitted': return 'VIDEO TO REVIEW';
      case 'revision_submitted': return 'REVISION TO REVIEW';
      case 'draft': return 'DRAFT';
      case 'active': return 'ACTIVE';
      case 'closed': return 'CLOSED';
      case 'completed': return 'COMPLETED';
      case 'cancelled': return 'CANCELLED';
      default: return status.toUpperCase();
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
const getNavigationRoute = (campaign: Campaign) => {
  const basePath = '/(dashboard_advertiser)/';

  switch (campaign.status) {
    case 'draft':
    case 'active':
      return {
        pathname: `${basePath}campaign-details/[id]`,
        params: { id: campaign._id }
      };

    case 'video_submitted':
    case 'revision_submitted':
      return {
        pathname: `${basePath}review-submission/[campaignId]`,
        params: { campaignId: campaign._id }
      };

    case 'completed':
      return {
        pathname: `${basePath}completed/[campaignId]`,
        params: { campaignId: campaign._id }
      };

    case 'cancelled':
    case 'closed':
    default:
      return {
        pathname: `${basePath}campaign-details/[id]`,
        params: { id: campaign._id }   // ✅ FIXED
      };
  }
};
  const renderCampaign = ({ item }: { item: Campaign }) => {
    const handlePress = () => {
      const route = getNavigationRoute(item);
      router.push(route);
    };

    const statusColor = getStatusColor(item.status);
    const statusDisplayText = getStatusDisplayText(item.status);

    return (
      <TouchableOpacity
        style={styles.campaignCard}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.thumbnailContainer}>
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: toFullUrl(item.thumbnailUrl) || 'https://via.placeholder.com/300x300/6366f1/ffffff?text=No+Image' }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noThumbnail}>
              <Ionicons name="image-outline" size={40} color="#d1d5db" />
            </View>
          )}
          
          {/* Status indicator overlay */}
          {item.status === 'video_submitted' && (
            <View style={[styles.statusOverlay, { backgroundColor: '#8b5cf6' }]}>
              <Ionicons name="videocam" size={16} color="#fff" />
              <Text style={styles.statusOverlayText}>New Video</Text>
            </View>
          )}
          
          {item.status === 'revision_submitted' && (
            <View style={[styles.statusOverlay, { backgroundColor: '#f97316' }]}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.statusOverlayText}>Revised</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{statusDisplayText}</Text>
            </View>
            <Text style={styles.categoryBadge}>{item.category}</Text>
          </View>

          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.dateText}>
              Deadline: {formatDate(item.applicationDeadline)}
            </Text>
          </View>

          {/* Quick action hint based on status */}
          {item.status === 'video_submitted' && (
            <View style={styles.actionHint}>
              <Ionicons name="eye-outline" size={14} color="#8b5cf6" />
              <Text style={[styles.actionHintText, { color: '#8b5cf6' }]}>
                Tap to review video
              </Text>
            </View>
          )}
          
          {item.status === 'revision_submitted' && (
            <View style={styles.actionHint}>
              <Ionicons name="eye-outline" size={14} color="#f97316" />
              <Text style={[styles.actionHintText, { color: '#f97316' }]}>
                Tap to review revision
              </Text>
            </View>
          )}
          
          {item.status === 'active' && (
            <View style={styles.actionHint}>
              <Ionicons name="people-outline" size={14} color="#10b981" />
              <Text style={[styles.actionHintText, { color: '#10b981' }]}>
                {item.status === 'active' ? 'Tap to review applications' : 'Tap to edit draft'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading your campaigns...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Campaigns</Text>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(dashboard_advertiser)/CreateUgc')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={campaigns}
        renderItem={renderCampaign}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCampaigns(true)}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="folder-open-outline" size={64} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No campaigns yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first UGC campaign to start receiving applications from talented clippers
            </Text>
            <TouchableOpacity
              style={styles.createNowButton}
              onPress={() => router.push('/(dashboard_advertiser)/CreateUgc')}
            >
              <Text style={styles.createNowText}>Create Campaign</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  list: {
    padding: 16,
  },
  campaignCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnailContainer: {
    width: 120,
    height: 120,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  noThumbnail: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  statusOverlayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    fontSize: 12,
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  actionHintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 22,
  },
  createNowButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createNowText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});