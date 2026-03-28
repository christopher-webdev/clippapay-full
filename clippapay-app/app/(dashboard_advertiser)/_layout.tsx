// app/(dashboard_advertiser)/_layout.tsx
import { Stack } from 'expo-router';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import ProfileHeader from './ProfileHeader';
import Footer from './Footer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationsProvider } from '../../hooks/useNotifications';
import React from 'react';

const { width } = Dimensions.get('window');
const scale = width / 428;

const HEADER_HEIGHT = 42;
const FOOTER_HEIGHT = Math.round(98 * scale);

export default function DashboardLayout() {
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
            <Stack.Screen name="advertiser_dashboard"    options={{ animation: 'fade' }} />
            <Stack.Screen name="campaigns_hub"           options={{ animation: 'fade' }} />
            <Stack.Screen name="Campaigns"               options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="my_clipping_campaigns"   options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="WalletScreen"            options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Profile"                 options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="create_clipping"         options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="CreateUgc"               options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="onboarding_ugc"          options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
            <Stack.Screen name="onboarding_clipping"     options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
            <Stack.Screen name="clipping_campaign_detail" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="notifications"            options={{ animation: 'slide_from_right' }} />
          </Stack>
        </View>

        {/* ── Footer — position absolute so it NEVER moves ── */}
        <View style={styles.footerContainer}>
          <Footer />
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

  // Padding keeps content from hiding under the fixed header/footer
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

  // Absolutely positioned — keyboard cannot move this
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