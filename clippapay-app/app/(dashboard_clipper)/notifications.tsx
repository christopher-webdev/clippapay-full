// app/(dashboard)/notifications.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { formatDistanceToNow } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: string;
  data?: {
    campaignId?: string;
    applicationId?: string;
    amount?: number;
    currency?: string;
    [key: string]: any;
  };
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const limit = 20;

  const fetchNotifications = useCallback(async (isRefresh = false, loadMore = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setPage(1);
    } else if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        return;
      }

      const currentPage = isRefresh ? 1 : page;
      const res = await fetch(
        `${API_URL}/notifications?page=${currentPage}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load notifications');

      const newNotifs = data.data || [];

      setNotifications((prev) =>
        isRefresh ? newNotifs : [...prev, ...newNotifs]
      );

      setHasMore(newNotifs.length === limit);
      if (!isRefresh && !loadMore) setPage(1);
      else if (loadMore) setPage((p) => p + 1);

    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Could not load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notifId: string) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await fetch(`${API_URL}/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notifId ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const getIconAndColor = (type: string, priority: string) => {
    let icon = 'notifications-outline';
    let color = '#64748b';

    if (type.includes('offer_received') || type.includes('offer_accepted')) {
      icon = 'gift-outline';
      color = '#10b981';
    } else if (type.includes('submission_received') || type.includes('revision_requested')) {
      icon = 'videocam-outline';
      color = '#3b82f6';
    } else if (type.includes('payment_received')) {
      icon = 'cash-outline';
      color = '#f59e0b';
    } else if (type.includes('dispute')) {
      icon = 'alert-circle-outline';
      color = '#ef4444';
    } else if (priority === 'urgent' || priority === 'high') {
      icon = 'alert-circle';
      color = '#ef4444';
    }

    return { icon, color };
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const { icon, color } = getIconAndColor(item.type, item.priority);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.read && styles.unread,
        ]}
        onPress={() => {
          if (!item.read) markAsRead(item._id);

          // Navigate based on type (optional deep linking)
          if (item.data?.campaignId) {
            router.push({
              pathname: item.type.includes('offer_')
                ? '/(dashboard)/clipper/accept-offer/[applicationId]'
                : '/(dashboard)/advertiser/campaign-details/[id]',
              params: {
                id: item.data.applicationId || item.data.campaignId,
              },
            });
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, !item.read && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.time}>
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </Text>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} />
        }
        onEndReached={() => {
          if (hasMore && !loadingMore) fetchNotifications(false, true);
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#6366f1" style={{ margin: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 100 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                You'll see updates here when something happens
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
  list: { padding: 16 },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  unread: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  unreadTitle: { color: '#1e293b' },
  message: { fontSize: 14, color: '#475569', lineHeight: 20 },
  time: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366f1',
    marginTop: 8,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 8 },
});