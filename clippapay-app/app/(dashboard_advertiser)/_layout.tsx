// app/(dashboard)/_layout.tsx
import { Stack } from 'expo-router';
import { View, SafeAreaView, StyleSheet, Dimensions, Platform } from 'react-native';
import ProfileHeader from './ProfileHeader';
import Footer from './Footer';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const scale = width / 428;

// Header height based on platform
const HEADER_HEIGHT = Platform.OS === 'ios' ? 130 * scale : 120 * scale;
const FOOTER_HEIGHT = 98 * scale;

export default function DashboardLayout() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#34D3991A', '#D6CF8D80', '#ffffffb2']}
        style={styles.background}
      >
        {/* Fixed Header */}
        <View style={styles.headerContainer}>
          <ProfileHeader />
        </View>

        {/* Content Area (changes with navigation) */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: styles.stackContent,
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        >
          {/* Main Dashboard Screens */}
          <Stack.Screen 
            name="advertiser_dashboard" 
            options={{ 
              title: 'Dashboard',
              animation: 'fade' 
            }} 
          />
          <Stack.Screen 
            name="campaigns" 
            options={{ 
              title: 'Campaigns',
              animation: 'slide_from_right'
            }} 
          />
          <Stack.Screen 
            name="applications" 
            options={{ 
              title: 'Applications',
              animation: 'slide_from_right'
            }} 
          />
          <Stack.Screen 
            name="wallet" 
            options={{ 
              title: 'Wallet',
              animation: 'slide_from_right'
            }} 
          />
          <Stack.Screen 
            name="profile" 
            options={{ 
              title: 'Profile',
              animation: 'slide_from_right'
            }} 
          />

          {/* Campaign Creation Screens */}
          <Stack.Screen 
            name="create-pgc" 
            options={{ 
              title: 'Create PGC Campaign',
              animation: 'slide_from_bottom'
            }} 
          />
          <Stack.Screen 
            name="create-ugc" 
            options={{ 
              title: 'Create UGC Campaign',
              animation: 'slide_from_bottom'
            }} 
          />
          <Stack.Screen 
            name="create-clipping" 
            options={{ 
              title: 'Create Clipping Campaign',
              animation: 'slide_from_bottom'
            }} 
          />

          {/* Onboarding Screens */}
          <Stack.Screen 
            name="onboarding-ugc" 
            options={{ 
              title: 'UGC Onboarding',
              animation: 'slide_from_bottom',
              gestureEnabled: false
            }} 
          />
          <Stack.Screen 
            name="onboarding-clipping" 
            options={{ 
              title: 'Clipping Onboarding',
              animation: 'slide_from_bottom',
              gestureEnabled: false
            }} 
          />

          {/* Application Detail Screens */}
          <Stack.Screen 
            name="applications/[id]" 
            options={{ 
              title: 'Application Details',
              animation: 'slide_from_right'
            }} 
          />
          
          {/* Campaign Detail Screens */}
          <Stack.Screen 
            name="campaigns/[id]" 
            options={{ 
              title: 'Campaign Details',
              animation: 'slide_from_right'
            }} 
          />
          <Stack.Screen 
            name="campaigns/[id]/analytics" 
            options={{ 
              title: 'Campaign Analytics',
              animation: 'slide_from_right'
            }} 
          />

          {/* Video/Media Screens */}
          <Stack.Screen 
            name="video-player" 
            options={{ 
              title: 'Video Player',
              animation: 'fade',
              gestureEnabled: true
            }} 
          />

          {/* Creator Profile Screens */}
          <Stack.Screen 
            name="creator/[id]" 
            options={{ 
              title: 'Creator Profile',
              animation: 'slide_from_right'
            }} 
          />

          {/* Settings Screens */}
          <Stack.Screen 
            name="settings" 
            options={{ 
              title: 'Settings',
              animation: 'slide_from_right'
            }} 
          />
          <Stack.Screen 
            name="settings/notifications" 
            options={{ 
              title: 'Notification Settings',
              animation: 'slide_from_right'
            }} 
          />
          <Stack.Screen 
            name="settings/payment" 
            options={{ 
              title: 'Payment Settings',
              animation: 'slide_from_right'
            }} 
          />

          {/* Help & Support */}
          <Stack.Screen 
            name="help" 
            options={{ 
              title: 'Help Center',
              animation: 'slide_from_right'
            }} 
          />
          <Stack.Screen 
            name="help/faq" 
            options={{ 
              title: 'FAQ',
              animation: 'slide_from_right'
            }} 
          />
        </Stack>

        {/* Fixed Footer */}
        <View style={styles.footerContainer}>
          <Footer />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  background: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 1000,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
    zIndex: 1000,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  stackContent: {
    flex: 1,
    paddingTop: HEADER_HEIGHT,
    paddingBottom: FOOTER_HEIGHT,
    backgroundColor: 'transparent',
  },
});