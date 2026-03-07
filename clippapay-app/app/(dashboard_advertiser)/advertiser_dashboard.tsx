// app/(dashboard)/advertiser_dashboard.tsx
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ReadyLaunchText from './ReadyLaunchText';
import GetUGCsCard from './GetUGCsCard';
import GetUGCsCard_2 from './GetUGCsCard_2';




const { width } = Dimensions.get('window');
const scale = width / 428;           // ≈ iPhone 14 Pro Max / Figma 428px base

export default function AdvertiserDashboard() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Full-screen light gradient background */}
      <LinearGradient
        colors={['#ffffff1a', '#ffffff80', '#ffffffb2']}// very light – adjust to match design
        style={styles.background}
      >

        {/* Scrollable content starts below the header */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ReadyLaunchText />

          {/* First card */}
          <GetUGCsCard />
          <GetUGCsCard_2 />        
      
        </ScrollView>

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
    paddingTop: 60 * scale,     // ← Must be taller than header height (≈107 + safe area + margin)
    paddingHorizontal: 12 * scale,
    paddingBottom: 40 * scale,
  },
});