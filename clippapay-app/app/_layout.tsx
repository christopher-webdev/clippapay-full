import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';

import {
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';

import {
  OpenSans_800ExtraBold,
} from '@expo-google-fonts/open-sans';

// Prevent splash from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Google Fonts
    Poppins: Poppins_800ExtraBold,
    OpenSans: OpenSans_800ExtraBold,

    // Local font
    Urbanist: require('../assets/fonts/Urbanist-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#000000" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(dashboard_advertiser)" />
        <Stack.Screen name="(dashboard_clipper)" />
        <Stack.Screen name="(dashboard_ad_worker)" />
      </Stack>
    </>
  );
}
