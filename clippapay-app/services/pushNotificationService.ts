// mobile_app/services/pushNotificationService.ts

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  private expoPushToken: string | null = null;

  // Register for push notifications
  async registerForPushNotificationsAsync(): Promise<string | null> {
    let token;

    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    // Check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get Expo push token
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PROJECT_ID,
    })).data;

    this.expoPushToken = token;

    // Set up Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
        sound: 'default',
        showBadge: true,
        enableVibrate: true,
      });

      // Wallet notifications channel
      await Notifications.setNotificationChannelAsync('wallet', {
        name: 'Wallet Transactions',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
        showBadge: true,
        enableVibrate: true,
      });

      // Deposit notifications channel
      await Notifications.setNotificationChannelAsync('deposits', {
        name: 'Deposits',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
        sound: 'default',
        showBadge: true,
        enableVibrate: true,
      });

      // Withdrawal notifications channel
      await Notifications.setNotificationChannelAsync('withdrawals', {
        name: 'Withdrawals',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
        sound: 'default',
        showBadge: true,
        enableVibrate: true,
      });
    }

    // Save token to backend
    await this.savePushToken(token);

    return token;
  }

  // Save push token to backend
  async savePushToken(token: string): Promise<void> {
    try {
      // Get auth token
      let authToken: string | null = null;
      if (Platform.OS === 'web') {
        authToken = await AsyncStorage.getItem('userToken');
      } else {
        authToken = await SecureStore.getItemAsync('userToken');
        if (!authToken) authToken = await AsyncStorage.getItem('userToken');
      }

      if (!authToken) return;

      await axios.post(
        `${API_BASE}/user/push-token`,
        { token },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    } catch (err) {
      console.error('Failed to save push token:', err);
    }
  }

  // Schedule local notification (for testing or offline alerts)
  async scheduleLocalNotification(
    title: string,
    body: string,
    data: any = {},
    channelId: string = 'default'
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        badge: 1,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        channelId,
      },
      trigger: null, // Show immediately
    });

    return notificationId;
  }

  // Schedule a notification for later
  async scheduleFutureNotification(
    title: string,
    body: string,
    secondsFromNow: number,
    data: any = {},
    channelId: string = 'default'
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        badge: 1,
        channelId,
      },
      trigger: {
        seconds: secondsFromNow,
        channelId,
      },
    });

    return notificationId;
  }

  // Cancel a scheduled notification
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get Expo push token
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  // Add listeners for incoming notifications
  addNotificationListeners(
    onReceive: (notification: Notifications.Notification) => void,
    onResponse: (response: Notifications.NotificationResponse) => void
  ): { remove: () => void }[] {
    const receivedListener = Notifications.addNotificationReceivedListener(onReceive);
    const responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);

    return [
      { remove: () => Notifications.removeNotificationSubscription(receivedListener) },
      { remove: () => Notifications.removeNotificationSubscription(responseListener) },
    ];
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<boolean> {
    return await Notifications.setBadgeCountAsync(count);
  }
}

export const pushNotificationService = new PushNotificationService();