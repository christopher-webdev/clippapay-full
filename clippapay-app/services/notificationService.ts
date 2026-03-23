// services/notificationService.ts
// All endpoints match routes/notifications.js exactly.

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: {
    campaignId?: string;
    applicationId?: string;
    transactionId?: string;
    amount?: number;
    reason?: string;
    [key: string]: any;
  };
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ── Auth token helper ─────────────────────────────────────────────────────────
const getToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('userToken');
    const token = await SecureStore.getItemAsync('userToken');
    return token ?? await AsyncStorage.getItem('userToken');
  } catch {
    return null;
  }
};

// ── Base fetch helper ─────────────────────────────────────────────────────────
async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');

  return fetch(`${API_BASE}/notifications${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

// ── Service ───────────────────────────────────────────────────────────────────
export const notificationService = {

  async getNotifications(page = 1, limit = 20): Promise<NotificationsResponse> {
    const res = await apiFetch(`?page=${page}&limit=${limit}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load notifications');

    // Backend returns both `notifications` and `data` keys; normalise here.
    return {
      notifications: json.notifications ?? json.data ?? [],
      unreadCount:   json.unreadCount ?? 0,
      pagination:    json.pagination  ?? { page, limit, total: 0, pages: 1 },
    };
  },

  async getUnreadCount(): Promise<number> {
    try {
      const res  = await apiFetch('/unread-count');
      const json = await res.json();
      return json.count ?? 0;
    } catch {
      return 0;
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    const res = await apiFetch(`/${notificationId}/read`, { method: 'POST' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to mark as read');
    }
  },

  async markAllAsRead(): Promise<void> {
    const res = await apiFetch('/read-all', { method: 'POST' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to mark all as read');
    }
  },

  async delete(notificationId: string): Promise<void> {
    const res = await apiFetch(`/${notificationId}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to delete notification');
    }
  },

  async deleteAllRead(): Promise<void> {
    const res = await apiFetch('/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ type: 'read' }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to delete read notifications');
    }
  },

  async getById(notificationId: string): Promise<Notification> {
    const res  = await apiFetch(`/${notificationId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to get notification');
    return json;
  },
};