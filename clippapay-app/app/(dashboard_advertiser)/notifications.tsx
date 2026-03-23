// app/(dashboard_advertiser)/notifications.tsx
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationsContext } from '../../hooks/useNotifications';
import type { Notification } from '../../services/notificationService';

// ── Icon / colour map ─────────────────────────────────────────────────────────
function getIconAndColor(type: string, priority: string) {
  if (type.includes('payment') || type.includes('wallet') || type.includes('withdrawal') || type.includes('deposit')) {
    return { icon: 'cash-outline', color: '#10b981' } as const;
  }
  if (type.includes('application') || type.includes('submission')) {
    return { icon: 'videocam-outline', color: '#3b82f6' } as const;
  }
  if (type.includes('offer')) {
    return { icon: 'gift-outline', color: '#8b5cf6' } as const;
  }
  if (type.includes('campaign')) {
    return { icon: 'megaphone-outline', color: '#f59e0b' } as const;
  }
  if (type.includes('dispute')) {
    return { icon: 'alert-circle-outline', color: '#ef4444' } as const;
  }
  if (priority === 'urgent' || priority === 'high') {
    return { icon: 'alert-circle', color: '#ef4444' } as const;
  }
  return { icon: 'notifications-outline', color: '#64748b' } as const;
}

// ── Notification card ─────────────────────────────────────────────────────────
function NotificationCard({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (id: string) => void;
}) {
  const { icon, color } = getIconAndColor(item.type, item.priority);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={() => onPress(item._id)}
    >
      {/* Left icon */}
      <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]}>
          {item.title}
        </Text>
        <Text style={styles.cardMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.cardTime}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function AdvertiserNotificationsScreen() {
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    refresh,
  } = useNotificationsContext();

  const handlePress = useCallback(
    async (id: string) => {
      const item = notifications.find(n => n._id === id);
      if (item && !item.read) {
        await markAsRead(id);
      }
      // No navigation — simplicity first.
    },
    [notifications, markAsRead]
  );

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationCard item={item} onPress={handlePress} />
    ),
    [handlePress]
  );

  const keyExtractor = useCallback((item: Notification) => item._id, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllAsRead}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done-outline" size={16} color="#6366f1" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#6366f1"
          />
        }
        onEndReached={() => { if (hasMore) loadMore(); }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          hasMore ? (
            <ActivityIndicator
              size="small"
              color="#6366f1"
              style={styles.footerLoader}
            />
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons name="notifications-off-outline" size={72} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyBody}>
                Updates about your campaigns and payments will appear here.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 20,
    paddingVertical:   16,
    backgroundColor:  '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle:  { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  headerSub:    { fontSize: 13, color: '#6366f1', marginTop: 2 },

  markAllBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    paddingHorizontal: 12,
    paddingVertical:    8,
    backgroundColor:   '#eef2ff',
    borderRadius:      20,
  },
  markAllText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },

  listContent: { padding: 16, paddingBottom: 40 },
  listEmpty:   { flex: 1 },

  card: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    backgroundColor: '#fff',
    borderRadius:   16,
    padding:        14,
    marginBottom:   10,
    borderWidth:    1,
    borderColor:    '#e5e7eb',
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    backgroundColor: '#fafafe',
  },

  iconWrap: {
    width:          44,
    height:         44,
    borderRadius:   22,
    justifyContent: 'center',
    alignItems:     'center',
    marginRight:    12,
    flexShrink:     0,
  },

  cardContent: { flex: 1 },
  cardTitle:   { fontSize: 15, fontWeight: '600', color: '#475569', marginBottom: 3 },
  cardTitleUnread: { color: '#1e293b' },
  cardMessage: { fontSize: 13, color: '#64748b', lineHeight: 19 },
  cardTime:    { fontSize: 11, color: '#94a3b8', marginTop: 5 },

  dot: {
    width:        9,
    height:       9,
    borderRadius: 5,
    backgroundColor: '#6366f1',
    marginTop:    6,
    marginLeft:   6,
    flexShrink:   0,
  },

  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     80,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#334155', marginTop: 16 },
  emptyBody:  { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8, paddingHorizontal: 30 },

  footerLoader: { marginVertical: 20 },
});