// app/(auth)/launch.tsx
import React, { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

export default function LaunchScreen() {
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem('token');

        if (token) {
          const res = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/auth/verify-token`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (res.ok) {
            const user = await res.json();

            if (user.role === 'advertiser') {
              return
              // router.replace('/(dashboard)/advertiser_dashboard');
            } else if (user.role === 'clipper') {
              return
              // router.replace('/(dashboard)/clipper_dashboard');
            } else if (user.role === 'ad-worker') {
              return
              // router.replace('/(dashboard)/ad-worker');
            } else {
              router.replace('/onboarding_1');
            }

            return;
          }
        }

        // No token → onboarding
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

  return null; // no UI, splash is from index.tsx
}
