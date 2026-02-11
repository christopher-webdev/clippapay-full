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
const scale = width / 428;

export default function CreateUGCsCard() {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.cardOuter}
      onPress={() => router.push('/join_ugc')} // ← your route
    >
      <View style={styles.cardWrapper}>
        {/* Gradient inner card */}
         <LinearGradient
              colors={['#485563', '#29323C']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 0.5, y: 0 }}
              style={styles.gradient}
            >
          {/* Banner tab (yellowish, sticks out left) */}
          <View style={styles.bannerContainer}>
            <View style={styles.bannerBackground} />
            <View style={styles.bannerTextWrapper}>
              <Text style={styles.bannerText}>
                Create UGC for Brands
              </Text>
            </View>
          </View>

          {/* Main title */}
          <Text style={styles.title}>
            Create original branded{'\n'}content and get paid{'\n'}
            by campaigns
          </Text>

          {/* Megaphone guy – positioned on right, overlapping */}
          <Image
            source={require('../../assets/images/38.png')}
            style={styles.megaphone}
            resizeMode="contain"
          />

          {/* CTA link */}
          <Text style={styles.cta}>
            View UGC Campaigns →
          </Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    width: 390 * scale,
    height: 230 * scale,
    alignSelf: 'center',
    marginTop: 50 * scale, // spacing from "Ready to launch..." text
  },
  cardWrapper: {
    flex: 1,
    borderRadius: 10 * scale,
    overflow: 'hidden',
    shadowColor: '#fcfcfc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  gradient: {
    flex: 1,
    borderRadius: 10 * scale,
  },

  // Banner (desired tab effect)
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 51 * scale,
    width: 285 * scale,
    height: 37 * scale,
    zIndex: 2,
  },
  bannerBackground: {
    flex: 1,
    backgroundColor: '#2C5364',
    borderTopRightRadius: 1 * scale,
    borderBottomRightRadius: 100 * scale,
    borderBottomLeftRadius: 100 * scale,
  },
  bannerTextWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingLeft: 33 * scale, // offset to center text nicely
  },
  bannerText: {
    // fontFamily: 'OpenSans',
    fontWeight: '700',
    fontSize: 14 * scale,
    color: '#ffffff',
    lineHeight: 19.6 * scale, // 140%
    letterSpacing: 0.2 * scale,
    left:30,
  },

  // Title with line break for better fit
  title: {
    position: 'absolute',
    top: 64 * scale,
    left: 29 * scale,
    // fontFamily: 'OpenSans',
    fontWeight: '700',
    fontSize: 20 * scale,
    lineHeight: 28 * scale,
    letterSpacing: 0.2 * scale,
    color: '#FFFFFF',
  },

  // Megaphone image (right-aligned, tall)
  megaphone: {
    position: 'absolute',
    top: 15 * scale,
    right: -150,
    width: 402 * scale,
    height: 226 * scale,
  },

  // CTA at bottom-left
  cta: {
    position: 'absolute',
    bottom: 28 * scale, // roughly matches ~174px from top in 215px inner height
    left: 29 * scale,
    // fontFamily: 'OpenSans',
    fontWeight: '700',
    fontSize: 12 * scale,
    color: '#FFFFFF',
    lineHeight: 16.8 * scale,
    letterSpacing: 0.2 * scale,
  },
});