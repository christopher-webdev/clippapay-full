// services/pushNotificationService.ts  — MOBILE / FRONTEND
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

// ── Configure how notifications are presented when app is in foreground ───────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── Auth helper ───────────────────────────────────────────────────────────────
const getAuthToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('userToken');
    const t = await SecureStore.getItemAsync('userToken');
    return t ?? await AsyncStorage.getItem('userToken');
  } catch {
    return null;
  }
};

class PushNotificationService {
  private expoPushToken: string | null = null;

  // ── Set up Android notification channels ──────────────────────────────────
  private async setupAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    const channels = [
      {
        id:         'default',
        name:       'General',
        importance: Notifications.AndroidImportance.HIGH,
        color:      '#4F46E5',
      },
      {
        id:         'wallet',
        name:       'Wallet Transactions',
        importance: Notifications.AndroidImportance.HIGH,
        color:      '#10B981',
      },
      {
        id:         'deposits',
        name:       'Deposits',
        importance: Notifications.AndroidImportance.HIGH,
        color:      '#4F46E5',
      },
      {
        id:         'withdrawals',
        name:       'Withdrawals',
        importance: Notifications.AndroidImportance.HIGH,
        color:      '#EF4444',
      },
      {
        id:         'campaigns',
        name:       'Campaigns',
        importance: Notifications.AndroidImportance.DEFAULT,
        color:      '#F59E0B',
      },
    ];

    for (const ch of channels) {
      await Notifications.setNotificationChannelAsync(ch.id, {
        name:              ch.name,
        importance:        ch.importance,
        vibrationPattern:  [0, 250, 250, 250],
        lightColor:        ch.color,
        sound:             'default',
        showBadge:         true,
        enableVibrate:     true,
      });
    }
  }

  // ── Register device for push notifications ────────────────────────────────
  async registerForPushNotificationsAsync(): Promise<string | null> {
    // Push notifications require a real device
    if (!Device.isDevice) {
      console.log('[Push] Emulator detected — skipping push registration');
      return null;
    }

    // 1. Check / request permission
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted');
      return null;
    }

    // 2. Set up Android channels
    await this.setupAndroidChannels();

    // 3. Get Expo push token
    //    projectId comes from app.json → extra.eas.projectId via Constants
    //    or from EXPO_PUBLIC_PROJECT_ID env var
    try {
      const projectId =
        process.env.EXPO_PUBLIC_PROJECT_ID ??
        // fallback: read from expo Constants at runtime
        (await import('expo-constants').then(m => m.default.expoConfig?.extra?.eas?.projectId ?? null));

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      this.expoPushToken = tokenData.data;
      console.log('[Push] Token registered:', this.expoPushToken);

      // 4. Save token to backend
      await this.savePushToken(this.expoPushToken);

      return this.expoPushToken;
    } catch (err) {
      console.error('[Push] Failed to get push token:', err);
      return null;
    }
  }

  // ── Save / update push token on backend ──────────────────────────────────
  async savePushToken(token: string): Promise<void> {
    const authToken = await getAuthToken();
    if (!authToken) return;

    try {
      const res = await fetch(`${API_BASE}/user/push-token`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error('[Push] Save token error:', json.error);
      }
    } catch (err) {
      console.error('[Push] Failed to save token to backend:', err);
    }
  }

  // ── Attach notification listeners ─────────────────────────────────────────
  addNotificationListeners(
    onReceive:  (n: Notifications.Notification) => void,
    onResponse: (r: Notifications.NotificationResponse) => void
  ): { remove: () => void }[] {
    const recv = Notifications.addNotificationReceivedListener(onReceive);
    const resp = Notifications.addNotificationResponseReceivedListener(onResponse);
    // expo-notifications ≥0.28: subscriptions have a .remove() method directly.
    // Notifications.removeNotificationSubscription() was removed in that version.
    return [
      { remove: () => recv.remove() },
      { remove: () => resp.remove() },
    ];
  }

  // ── Badge helpers ─────────────────────────────────────────────────────────
  async getBadgeCount(): Promise<number> {
    return Notifications.getBadgeAsync();
  }

  async setBadgeCount(count: number): Promise<boolean> {
    return Notifications.setBadgeAsync(Math.max(0, count));
  }

  async clearBadge(): Promise<boolean> {
    return Notifications.setBadgeAsync(0);
  }

  // ── Schedule local notification (show immediately) ────────────────────────
  async scheduleLocalNotification(
    title:     string,
    body:      string,
    data:      Record<string, any> = {},
    channelId: string = 'default'
  ): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound:    true,
        badge:    1,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null, // fire immediately
    });
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

export const pushNotificationService = new PushNotificationService();