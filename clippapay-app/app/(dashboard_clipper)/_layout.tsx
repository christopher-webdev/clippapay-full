// app/(dashboard_clipper)/_layout.tsx
import { Stack } from 'expo-router';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import ProfileHeader from './ProfileHeader';
import FooterClipper from './FooterClipper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationsProvider } from '../../hooks/useNotifications';
import React from 'react';

const { width } = Dimensions.get('window');
const scale = width / 428;

const HEADER_HEIGHT = 42;
const FOOTER_HEIGHT = Math.round(98 * scale);

export default function DashboardClipperLayout() {
  return (
    <NotificationsProvider>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* ── Fixed header ── */}
        <View style={styles.headerContainer}>
          <ProfileHeader />
        </View>

        {/* ── Body — paddingTop clears header, paddingBottom clears footer ── */}
        <View style={styles.body}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: styles.stackContent,
              animation: 'slide_from_right',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          >
            <Stack.Screen name="clipper_dashboard"      options={{ animation: 'fade' }} />
            <Stack.Screen name="join_clipping"          options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="join_ugc"               options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="my_clipping"            options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="my-applications"        options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="wallet"                 options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="clipper_profile_edit"   options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="notifications"          options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="submit_clipping"        options={{ animation: 'slide_from_right' }} />
          </Stack>
        </View>

        {/* ── Footer — position absolute so it NEVER moves ── */}
        <View style={styles.footerContainer}>
          <FooterClipper />
        </View>

      </SafeAreaView>
    </NotificationsProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 6,
  },

  body: {
    flex: 1,
    paddingTop: HEADER_HEIGHT,
    paddingBottom: FOOTER_HEIGHT,
    backgroundColor: '#F5F5F7',
  },

  stackContent: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },

  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 6,
  },
});