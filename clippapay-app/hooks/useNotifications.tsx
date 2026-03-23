// hooks/useNotifications.tsx
// Fixed: imports, auth check via SecureStore (no useAuth dependency),
//        proper polling, badge sync, push registration on login.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import {
  notificationService,
  type Notification,
  type NotificationsResponse,
} from '../services/notificationService';
import { pushNotificationService } from '../services/pushNotificationService';

// ── Types ─────────────────────────────────────────────────────────────────────
interface UseNotificationsReturn {
  notifications:    Notification[];
  unreadCount:      number;
  loading:          boolean;
  refreshing:       boolean;
  hasMore:          boolean;
  error:            string | null;
  pushToken:        string | null;

  loadInitial:             () => Promise<void>;
  loadMore:                () => Promise<void>;
  refresh:                 () => Promise<void>;
  markAsRead:              (id: string) => Promise<void>;
  markAllAsRead:           () => Promise<void>;
  deleteNotification:      (id: string) => Promise<void>;
  deleteAllRead:           () => Promise<void>;
  registerPushNotifications: () => Promise<void>;
  getUnreadByType:         (type: string) => number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const getToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('userToken');
    const t = await SecureStore.getItemAsync('userToken');
    return t ?? (await AsyncStorage.getItem('userToken'));
  } catch {
    return null;
  }
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [page,          setPage]          = useState(1);
  const [hasMore,       setHasMore]       = useState(false);
  const [pushToken,     setPushToken]     = useState<string | null>(null);
  const [isAuthed,      setIsAuthed]      = useState(false);

  const appState          = useRef(AppState.currentState);
  const pollingInterval   = useRef<ReturnType<typeof setInterval>>();
  const notifListeners    = useRef<{ remove: () => void }[]>([]);

  // ── Check auth on mount ─────────────────────────────────────────────────
  useEffect(() => {
    getToken().then(t => setIsAuthed(!!t));
  }, []);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      notifListeners.current.forEach(l => l.remove());
    };
  }, []);

  // ── App state: resume/pause polling ─────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        next === 'active'
      ) {
        refresh();
        _startPolling();
      } else if (next.match(/inactive|background/)) {
        _stopPolling();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Push notification listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!isAuthed) return;

    const listeners = pushNotificationService.addNotificationListeners(
      (_notification) => {
        // Notification received while app is foregrounded — refresh list
        _loadUnreadCount();
      },
      (response) => {
        // User tapped notification — mark related as read if we have its id
        const data = response.notification.request.content.data as any;
        if (data?.notificationId) {
          markAsRead(data.notificationId);
        }
        // Refresh list regardless
        refresh();
      }
    );

    notifListeners.current = listeners;
    return () => {
      notifListeners.current.forEach(l => l.remove());
      notifListeners.current = [];
    };
  }, [isAuthed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Register push on auth ────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthed) {
      registerPushNotifications();
      loadInitial();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      _stopPolling();
    }
  }, [isAuthed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Internal: polling ────────────────────────────────────────────────────
  const _startPolling = useCallback(() => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    pollingInterval.current = setInterval(() => {
      getToken().then(t => { if (t) _loadUnreadCount(); });
    }, 30_000);
  }, []);

  const _stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = undefined;
    }
  }, []);

  // ── Internal: unread count ───────────────────────────────────────────────
  const _loadUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
      await pushNotificationService.setBadgeCount(count);
    } catch {
      // silent
    }
  }, []);

  // ── Load notifications ───────────────────────────────────────────────────
  const _loadPage = useCallback(
    async (pageNum: number, refreshMode = false) => {
      try {
        setError(null);
        const resp: NotificationsResponse =
          await notificationService.getNotifications(pageNum);

        setNotifications(prev =>
          refreshMode
            ? resp.notifications
            : [...prev, ...resp.notifications]
        );
        setUnreadCount(resp.unreadCount);
        setHasMore(resp.pagination.page < resp.pagination.pages);
        await pushNotificationService.setBadgeCount(resp.unreadCount);
      } catch (err: any) {
        setError(err.message || 'Failed to load notifications');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setPage(1);
    await _loadPage(1, true);
    _startPolling();
  }, [_loadPage, _startPolling]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing) return;
    const next = page + 1;
    setPage(next);
    await _loadPage(next, false);
  }, [hasMore, loading, refreshing, page, _loadPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await _loadPage(1, true);
  }, [_loadPage]);

  // ── markAsRead ───────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic
    setNotifications(prev =>
      prev.map(n => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await notificationService.markAsRead(id);
      await pushNotificationService.setBadgeCount(
        Math.max(0, unreadCount - 1)
      );
    } catch (err: any) {
      // Revert
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: false } : n))
      );
      setUnreadCount(prev => prev + 1);
      setError(err.message);
    }
  }, [unreadCount]);

  // ── markAllAsRead ────────────────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    const snapshot = notifications;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    await pushNotificationService.clearBadge();

    try {
      await notificationService.markAllAsRead();
    } catch (err: any) {
      setNotifications(snapshot);
      setUnreadCount(snapshot.filter(n => !n.read).length);
      setError(err.message);
    }
  }, [notifications]);

  // ── deleteNotification ───────────────────────────────────────────────────
  const deleteNotification = useCallback(async (id: string) => {
    const item = notifications.find(n => n._id === id);
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (item && !item.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      await notificationService.delete(id);
    } catch (err: any) {
      setError(err.message);
      refresh();
    }
  }, [notifications, refresh]);

  // ── deleteAllRead ────────────────────────────────────────────────────────
  const deleteAllRead = useCallback(async () => {
    setNotifications(prev => prev.filter(n => !n.read));
    try {
      await notificationService.deleteAllRead();
    } catch (err: any) {
      setError(err.message);
      refresh();
    }
  }, [refresh]);

  // ── registerPushNotifications ────────────────────────────────────────────
  const registerPushNotifications = useCallback(async () => {
    try {
      const token = await pushNotificationService.registerForPushNotificationsAsync();
      if (token) setPushToken(token);
    } catch (err) {
      console.error('[useNotifications] Push registration failed:', err);
    }
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getUnreadByType = useCallback(
    (type: string) => notifications.filter(n => n.type === type && !n.read).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    hasMore,
    error,
    pushToken,
    loadInitial,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    registerPushNotifications,
    getUnreadByType,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────
const NotificationsContext = createContext<UseNotificationsReturn | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const value = useNotifications();
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): UseNotificationsReturn {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationsContext must be used inside <NotificationsProvider>');
  }
  return ctx;
}