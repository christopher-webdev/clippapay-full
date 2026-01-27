// app/index.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context'; // Fixed import (removes warning)
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash from auto-hiding (call this early, outside components if possible)
SplashScreen.preventAutoHideAsync();

const { width: W, height: H } = Dimensions.get('window');
const BG_WIDTH = 400;
const BG_HEIGHT = 337;

export default function SplashLoader() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // ← Put any async prep here (e.g., load fonts, check auth, etc.)
        // For now, just simulate your original 2-sec delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide the splash now that content is ready
      await SplashScreen.hideAsync();
      // Then navigate away from this splash screen
      router.replace('/(auth)/launch');
    }
  }, [appIsReady]);

  // Don't render anything until ready (prevents flash of unthemed content)
  if (!appIsReady) {
    return null;
  }

  const bgLeft = W / 2 - BG_WIDTH / 2;
  const bgTop = H / 2 - BG_HEIGHT / 2 - 0.5;

  const ICON_SIZE = Math.min(W * 0.28, 140);
  const iconLeft = W / 2 - ICON_SIZE / 2;
  const iconTop = H / 2 - ICON_SIZE / 2;

  return (
    <SafeAreaProvider>
      <SafeAreaView 
        style={styles.container} 
        onLayout={onLayoutRootView} // Trigger hide + navigate when layout happens
      >
        <StatusBar hidden />

        <Image
          source={require('../assets/images/blur.png')}
          fadeDuration={0}
          style={[
            styles.bg,
            { width: BG_WIDTH, height: BG_HEIGHT, left: bgLeft, top: bgTop },
          ]}
        />

        <Image
          source={require('../assets/images/icon.png')}
          fadeDuration={0}
          style={[
            styles.icon,
            { width: ICON_SIZE, height: ICON_SIZE, left: iconLeft, top: iconTop },
          ]}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bg: {
    position: 'absolute',
    resizeMode: 'contain',
  },
  icon: {
    position: 'absolute',
    resizeMode: 'contain',
    zIndex: 10,
  },
});