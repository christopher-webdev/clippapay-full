// app/(auth)/launch.tsx

import React, { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

export default function LaunchScreen() {

  useEffect(() => {
    const bootstrap = async () => {
      try {

        /* ================= GET TOKEN ================= */

        let token: string | null = null;

        if (Platform.OS === 'web') {
          token = await AsyncStorage.getItem('userToken');
          console.log('[WEB] launch token:', token);
        } else {
          token = await SecureStore.getItemAsync('userToken');

          if (!token) {
            token = await AsyncStorage.getItem('userToken');
          }

          console.log('[MOBILE] launch token:', token);
        }

        /* ================= IF TOKEN EXISTS ================= */

        if (token) {

          const res = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/auth/verify-token`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (res.ok) {

            const user = await res.json();

            console.log('VERIFY USER:', user);

            /* ================= ROLE ROUTING ================= */

            if (user.role === 'advertiser') {
              router.replace('(dashboard_advertiser)/advertiser_dashboard');
              return;
            }

            if (user.role === 'clipper') {
              router.replace('(dashboard_clipper)/clipper_dashboard');
              return;
            }

            if (user.role === 'ad-worker') {
              router.replace('(dashboard_ad_worker)/ad_worker_dashboard');
              return;
            }

            // fallback
            router.replace('/(auth)/onboarding_1');
            return;
          }
        }

        /* ================= NO TOKEN ================= */

        router.replace('/(auth)/onboarding_1');

      } catch (err) {
        console.log('Auth check failed:', err);
        router.replace('/(auth)/onboarding_1');
      } finally {
        await SplashScreen.hideAsync();
      }
    };

    bootstrap();
  }, []);

  return null;
}
