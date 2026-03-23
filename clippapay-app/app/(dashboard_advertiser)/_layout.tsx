// app/(dashboard_advertiser)/_layout.tsx
import { Stack } from 'expo-router';
import { View, StyleSheet, Dimensions } from 'react-native';
import ProfileHeader from './ProfileHeader';
import Footer from './Footer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationsProvider } from '../../hooks/useNotifications';

const { width } = Dimensions.get('window');
const scale = width / 428;

// ProfileHeader is fixed at 72px. Footer is ~98px * scale.
// stackContent paddingTop = 72 (header), paddingBottom = footer height.
const HEADER_HEIGHT = 72;
const FOOTER_HEIGHT = Math.round(98 * scale);

export default function DashboardLayout() {
  return (
    <NotificationsProvider>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* ── Fixed header — sits above everything ── */}
        <View style={styles.headerContainer}>
          <ProfileHeader />
        </View>

        {/* ── Stack fills remaining height between header and footer ── */}
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
            {/* ── Main tabs ── */}
            <Stack.Screen name="advertiser_dashboard"    options={{ animation: 'fade' }} />
            <Stack.Screen name="campaigns_hub"           options={{ animation: 'fade' }} />
            <Stack.Screen name="Campaigns"               options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="my_clipping_campaigns"   options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="WalletScreen"            options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Profile"                 options={{ animation: 'slide_from_right' }} />

            {/* ── Campaign creation ── */}
            <Stack.Screen name="create-clipping"         options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="create_clipping"         options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="create-ugc"              options={{ animation: 'slide_from_bottom' }} />

            {/* ── Onboarding ── */}
            <Stack.Screen name="onboarding_ugc"          options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
            <Stack.Screen name="onboarding_clipping"     options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />

            {/* ── Detail / sub-screens — these have their own back button headers
                 so we DON'T want the shared ProfileHeader showing.
                 We handle this by hiding the layout header on those screens. ── */}
            <Stack.Screen name="clipping_campaign_detail" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="notifications"            options={{ animation: 'slide_from_right' }} />

            {/* ── Catch-all for any other screens in this group ── */}
          </Stack>
        </View>

        {/* ── Fixed footer ── */}
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

  // ProfileHeader — fixed at top, full width, sits above body
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#FFF',
    // shadow cast downward
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 6,
  },

  // Body fills flex=1 between safe-area top and bottom. We add top/bottom
  // padding equal to the fixed header/footer so content is never hidden.
  body: {
    flex: 1,
    paddingTop: HEADER_HEIGHT,       // slides content below header
    paddingBottom: FOOTER_HEIGHT,    // slides content above footer
    marginTop: -9,    
    backgroundColor: '#F5F5F7', 
  },

  // Stack screens themselves should be transparent — no extra padding needed
  // because the body already provides it.
  stackContent: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },

  // Footer — fixed at bottom, full width
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