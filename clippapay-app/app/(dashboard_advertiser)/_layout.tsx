// app/(dashboard)/_layout.tsx
import { Stack } from 'expo-router';
import { View, SafeAreaView, StyleSheet, Dimensions } from 'react-native';
import ProfileHeader from './ProfileHeader';
import Footer from './Footer';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const scale = width / 428;

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
            contentStyle: styles.stackContent
          }}
        >
          <Stack.Screen name="clipper_dashboard" />
          <Stack.Screen name="advertiser_dashboard" />
          <Stack.Screen name="Campaigns" />
          <Stack.Screen name="WalletScreen" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="CreatePgc" />
          <Stack.Screen name="onboarding_ugc" />
          <Stack.Screen name="onboarding_clipping" />

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
    zIndex: 1000,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  stackContent: {
    flex: 1,
    paddingTop: 25 * scale, // Space for header
    paddingBottom: 90 * scale, // Space for footer
  },
});