// app/(dashboard)/advertiser_dashboard.tsx
import React from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ProfileHeader from './ProfileHeaderClipper';
import ReadyLaunchText from './ReadyLaunchText_clipper';
import CreateUGCsCard from './CreateUGCsCard';
import CreateUGCsCard_2 from './CreateUGCsCard_2';
import CreateUGCsCard_3 from './CreateUGCsCard_3';
import FooterClipper from './FooterClipper';
// Import the next cards when you create them
// import ShareClipCard from '../../components/ShareClipCard';
// import PremiumCreatorsCard from '../../components/PremiumCreatorsCard';

const { width } = Dimensions.get('window');
const scale = width / 428;           // ≈ iPhone 14 Pro Max / Figma 428px base

export default function AdvertiserDashboard() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Full-screen light gradient background */}
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB', '#F3F4F6']} // very light – adjust to match design
        style={styles.background}
      >
        {/* Fixed / absolute header – stays at top */}
        <View style={styles.headerContainer}>
          <ProfileHeader />
        </View>

        {/* Scrollable content starts below the header */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ReadyLaunchText />

          {/* First card */}
          <CreateUGCsCard />
          <CreateUGCsCard_2 />
          <CreateUGCsCard_3 /> 
        

          {/* Next cards – add when ready */}
          {/* <ShareClipCard /> */}
          {/* <PremiumCreatorsCard /> */}

          {/* Bottom padding so last card isn't cut off by bottom nav */}
      
        </ScrollView>
        <View style={styles.footerContainer}>
          <FooterClipper />
        </View>

        {/* Optional: bottom tab bar placeholder if you have one */}
        {/* <BottomTabBar /> */}
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
    zIndex: 10,
    // Optional shadow under header
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
    zIndex: 10,
    // Optional shadow under header
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    paddingTop: 120 * scale,     // ← Must be taller than header height (≈107 + safe area + margin)
    paddingHorizontal: 12 * scale,
    paddingBottom: 40 * scale,
  },
});