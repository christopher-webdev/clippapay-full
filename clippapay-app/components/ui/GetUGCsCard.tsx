// app/components/GetUGCsCard.tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const scale = width / 428; // your base scale (Figma 428px wide artboard)

export default function GetUGCsCard() {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.cardContainer}
      onPress={() => {
        // TODO: navigate to creators list / campaign creation screen
        router.push('/creators'); // ← change this route to your actual screen
      }}
    >
      {/* Outer card wrapper – white background with rounded corners */}
      <View style={styles.outerCard}>
        {/* Inner gradient background with shadow effect */}
        <LinearGradient
          colors={['#605C3C', '#3C3B3F']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradientInner}
        >
          {/* Main content */}
          <View style={styles.contentWrapper}>
            {/* Colored banner strip – "Get UGCs for My Brand/Service" */}
            <View style={styles.bannerStrip}>
              <View style={styles.bannerBackground} />
              <Text style={styles.bannerText}>
                Get UGCs for My Brand/Service
              </Text>
            </View>

            {/* Main title */}
            <Text style={styles.mainTitle}>
              Order custom branded content.
            </Text>

            {/* Megaphone guy image */}
            <Image
              source={require('../../assets/images/megaphone_guy.png')}
              style={styles.megaphoneImage}
              resizeMode="contain"
            />

            {/* Call-to-action link */}
            <Text style={styles.ctaText}>
              View Talented Creators →
            </Text>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: 402 * scale,
    height: 244 * scale,
    marginTop: 20 * scale, // spacing from previous elements (adjust as needed)
    alignSelf: 'center',
  },

  outerCard: {
    flex: 1,
    borderRadius: 10 * scale,
    overflow: 'hidden',
    // subtle outer shadow if you want more depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  gradientInner: {
    width: 354 * scale,
    height: 215 * scale,
    position: 'absolute',
    top: 14 * scale,
    left: 24 * scale,
    borderRadius: 10 * scale,
  },

  contentWrapper: {
    flex: 1,
    position: 'relative',
  },

  // Banner strip (greenish-yellow overlay)
  bannerStrip: {
    position: 'absolute',
    top: 9 * scale,
    left: -29 * scale, // negative left as per Figma
    width: 285 * scale,
    height: 37 * scale,
  },

  bannerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D6CF8D80', // semi-transparent yellowish
    borderTopRightRadius: 18 * scale,
    borderBottomRightRadius: 18 * scale,
  },

  bannerText: {
    position: 'absolute',
    top: 9 * scale,
    left: 4 * scale + 29 * scale, // offset to match visual alignment
    width: 222 * scale,
    fontFamily: 'OpenSans',
    fontWeight: '700',
    fontSize: 14 * scale,
    lineHeight: 14 * scale * 1.4,
    letterSpacing: 0.2 * scale,
    color: '#000000',
  },

  // Main title "Order custom branded content."
  mainTitle: {
    position: 'absolute',
    top: 64 * scale,
    left: 29 * scale,
    width: 142 * scale,
    fontFamily: 'OpenSans',
    fontWeight: '700',
    fontSize: 20 * scale,
    lineHeight: 20 * scale * 1.4,
    letterSpacing: 0.2 * scale,
    color: '#FFFFFF',
  },

  // Megaphone guy
  megaphoneImage: {
    position: 'absolute',
    top: 9 * scale,
    right: 24 * scale,          // aligned to right side
    width: 152 * scale,
    height: 206 * scale,
  },

  // CTA "View Talented Creators →"
  ctaText: {
    position: 'absolute',
    bottom: 28 * scale,         // ~174px from top in inner gradient
    left: 29 * scale,
    fontFamily: 'OpenSans',
    fontWeight: '700',
    fontSize: 12 * scale,
    lineHeight: 12 * scale * 1.4,
    letterSpacing: 0.2 * scale,
    color: '#FFFFFF',
  },
});