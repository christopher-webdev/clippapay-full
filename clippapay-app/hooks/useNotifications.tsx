// mobile_app/hooks/useNotifications.ts (updated)

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { notificationService, Notification, NotificationsResponse } from '../services/notificationService';
import { pushNotificationService } from '../services/pushNotificationService';
import { useAuth } from './useAuth';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

interface UseNotificationsReturn {
  // Data
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: string | null;
  pushToken: string | null;
  
  // Actions
  loadInitial: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  registerPushNotifications: () => Promise<void>;
  
  // State helpers
  getNotificationById: (id: string) => Notification | undefined;
  getUnreadByType: (type: string) => number;
}

export function useNotifications(): UseNotificationsReturn {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [pushToken, setPushToken] = useState<string | null>(null);
  
  const appState = useRef(AppState.currentState);
  const pollingInterval = useRef<NodeJS.Timeout>();
  const notificationListeners = useRef<{ remove: () => void }[]>([]);

  // Cleanup polling and listeners on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      // Remove notification listeners
      notificationListeners.current.forEach(listener => listener.remove());
    };
  }, []);

  // Handle app state changes (stop polling when app is in background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Set up push notification listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // Set up listeners for incoming notifications
    const listeners = pushNotificationService.addNotificationListeners(
      // When notification is received while app is foregrounded
      (notification) => {
        console.log('Notification received:', notification);
        // You can show an in-app alert here if needed
      },
      // When user taps on notification
      (response) => {
        console.log('Notification response:', response);
        handleNotificationResponse(response);
      }
    );

    notificationListeners.current = listeners;

    // Register for push notifications
    registerPushNotifications();

    return () => {
      notificationListeners.current.forEach(listener => listener.remove());
    };
  }, [isAuthenticated]);

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    if (!data) return;

    // Navigate based on notification type
    if (data.type === 'deposit' && data.depositId) {
      router.push(`../(dashboard_advertiser)/wallet?tab=deposits&highlight=${data.depositId}`);
    } else if (data.type === 'withdrawal' && data.withdrawalId) {
      router.push(`../(dashboard_advertiser)/wallet?tab=withdrawals&highlight=${data.withdrawalId}`);
    } else if (data.type === 'campaign' && data.campaignId) {
      router.push(`../(dashboard_advertiser)/campaigns/${data.campaignId}`);
    } else if (data.type === 'application' && data.applicationId) {
      router.push(`../(dashboard_advertiser)/applications/${data.applicationId}`);
    } else {
      // Default: go to notifications screen
      router.push('../(dashboard)/notifications');
    }
  };

  const registerPushNotifications = useCallback(async () => {
    try {
      const token = await pushNotificationService.registerForPushNotificationsAsync();
      setPushToken(token);
    } catch (err) {
      console.error('Failed to register for push notifications:', err);
    }
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - refresh data
      refresh();
      startPolling();
      
      // Update badge count
      updateBadgeCount();
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background - stop polling
      stopPolling();
    }
    appState.current = nextAppState;
  };

  const updateBadgeCount = useCallback(async () => {
    try {
      await pushNotificationService.setBadgeCount(unreadCount);
    } catch (err) {
      console.error('Failed to update badge count:', err);
    }
  }, [unreadCount]);

  const startPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    // Poll for unread count every 30 seconds
    pollingInterval.current = setInterval(() => {
      if (isAuthenticated) {
        loadUnreadCount();
      }
    }, 30000);
  }, [isAuthenticated]);

  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = undefined;
    }
  }, []);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
      
      // Update badge count
      await pushNotificationService.setBadgeCount(count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  }, [isAuthenticated]);

  // Load notifications with pagination
  const loadNotifications = useCallback(async (pageNum: number, refreshMode = false) => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response: NotificationsResponse = await notificationService.getNotifications(pageNum);
      
      setNotifications(prev => 
        refreshMode ? response.notifications : [...prev, ...response.notifications]
      );
      
      setTotalPages(response.pagination.pages);
      setHasMore(response.pagination.page < response.pagination.pages);
      
      // Also load unread count
      await loadUnreadCount();
      
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, loadUnreadCount]);

  // Load initial data
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setPage(1);
    await loadNotifications(1, true);
    startPolling();
  }, [loadNotifications, startPolling]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    await loadNotifications(nextPage, false);
  }, [hasMore, loading, refreshing, page, loadNotifications]);

  // Refresh (pull to refresh)
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadNotifications(1, true);
  }, [loadNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => 
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Update badge
      await pushNotificationService.setBadgeCount(unreadCount - 1);

      // API call
      await notificationService.markAsRead(notificationId);
      
    } catch (err) {
      console.error('Failed to mark as read:', err);
      // Revert on error
      setNotifications(prev =>
        prev.map(n => 
          n._id === notificationId ? { ...n, read: false } : n
        )
      );
      setUnreadCount(prev => prev + 1);
      setError('Failed to mark notification as read');
    }
  }, [notifications, unreadCount]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      // Update badge
      await pushNotificationService.setBadgeCount(0);

      // API call
      await notificationService.markAllAsRead();
      
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      // Revert on error
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: false }))
      );
      setUnreadCount(notifications.filter(n => !n.read).length);
      setError('Failed to mark all as read');
    }
  }, [notifications]);

  // Delete single notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      const deletedNotification = notifications.find(n => n._id === notificationId);
      const wasUnread = deletedNotification && !deletedNotification.read;
      
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        await pushNotificationService.setBadgeCount(unreadCount - 1);
      }

      // API call
      await notificationService.delete(notificationId);
      
    } catch (err) {
      console.error('Failed to delete notification:', err);
      // Refresh to get correct state
      await refresh();
      setError('Failed to delete notification');
    }
  }, [notifications, unreadCount, refresh]);

  // Delete all read notifications
  const deleteAllRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.filter(n => !n.read));

      // API call
      await notificationService.deleteAllRead();
      
    } catch (err) {
      console.error('Failed to delete read notifications:', err);
      // Refresh to get correct state
      await refresh();
      setError('Failed to delete read notifications');
    }
  }, [refresh]);

  // Get notification by ID
  const getNotificationById = useCallback((id: string) => {
    return notifications.find(n => n._id === id);
  }, [notifications]);

  // Get unread count by type
  const getUnreadByType = useCallback((type: string) => {
    return notifications.filter(n => n.type === type && !n.read).length;
  }, [notifications]);

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadInitial();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      stopPolling();
    }
  }, [isAuthenticated, loadInitial, stopPolling]);

  // Set up real-time connection (WebSocket) if available
  useEffect(() => {
    if (!isAuthenticated) return;

    // You can implement WebSocket connection here for real-time notifications
    // Example with Socket.io:
    /*
    const socket = io(API_BASE, {
      auth: { token: getToken() }
    });

    socket.on('new_notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      if (!notification.read) {
        setUnreadCount(prev => prev + 1);
        // Show local notification if app is in background
        if (AppState.currentState !== 'active') {
          pushNotificationService.scheduleLocalNotification(
            notification.title,
            notification.message,
            notification.data,
            notification.type.includes('deposit') ? 'deposits' : 
            notification.type.includes('withdrawal') ? 'withdrawals' : 'wallet'
          );
        }
      }
    });

    return () => socket.disconnect();
    */
  }, [isAuthenticated]);

  return {
    // Data
    notifications,
    unreadCount,
    loading,
    refreshing,
    hasMore,
    error,
    pushToken,
    
    // Actions
    loadInitial,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    registerPushNotifications,
    
    // State helpers
    getNotificationById,
    getUnreadByType,
  };
}

// Optional: Create a context provider for global notification state
import React, { createContext, useContext } from 'react';

const NotificationsContext = createContext<UseNotificationsReturn | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const notifications = useNotifications();
  
  return (
    <NotificationsContext.Provider value={notifications}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
}