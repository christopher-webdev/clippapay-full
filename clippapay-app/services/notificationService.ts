// mobile_app/services/notificationService.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE =  process.env.EXPO_PUBLIC_API_URL;

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  data?: {
    campaignId?: string;
    applicationId?: string;
    transactionId?: string;
    amount?: number;
    reason?: string;
    [key: string]: any;
  };
  richContent?: {
    image?: string;
    buttonText?: string;
    metadata?: Record<string, any>;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Helper to get auth token
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem('userToken');
  }
  let token = await SecureStore.getItemAsync('userToken');
  if (!token) token = await AsyncStorage.getItem('userToken');
  return token;
};

export const notificationService = {
  // Get user's notifications with pagination
  async getNotifications(page = 1, limit = 20): Promise<NotificationsResponse> {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await axios.get(
      `${API_BASE}/notifications?page=${page}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const token = await getToken();
    if (!token) return 0;

    try {
      const response = await axios.get(
        `${API_BASE}/notifications/unread-count`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    await axios.patch(
      `${API_BASE}/notifications/${notificationId}/read`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    await axios.post(
      `${API_BASE}/notifications/mark-all-read`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },

  // Delete single notification
  async delete(notificationId: string): Promise<void> {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    await axios.delete(
      `${API_BASE}/notifications/${notificationId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },

  // Delete all read notifications
  async deleteAllRead(): Promise<void> {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    await axios.post(
      `${API_BASE}/notifications/bulk-delete`,
      { type: 'read' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },

  // Get notification by ID
  async getById(notificationId: string): Promise<Notification> {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await axios.get(
      `${API_BASE}/notifications/${notificationId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};