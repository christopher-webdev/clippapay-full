import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const scale = width / 428;
const SWIPE_THRESHOLD = 80;

export default function Onboarding2() {
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 20,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swipe LEFT → Next
          router.push('/onboarding_3');
        } else if (gesture.dx > SWIPE_THRESHOLD) {
          // Swipe RIGHT → Previous
          router.push('/onboarding_1');
        }
      },
    })
  ).current;

  return (
    <SafeAreaView style={styles.safe} {...panResponder.panHandlers}>
      <ImageBackground
        source={require('../../assets/images/3.png')}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Skip Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.replace('/login')}
          style={[
            styles.skipBtn,
            {
              top: 59 * scale,
              left: 284 * scale,
            },
          ]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Content Container */}
        <View style={[styles.contentWrapper, { top: 570 * scale }]}>
          <BlurView intensity={15} tint="dark" style={styles.blurContainer}>
            <LinearGradient
              colors={[
                'rgba(40, 38, 14, 0.07)',
                'rgba(0, 0, 0, 0.7)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradientContainer}
            >
              {/* Title */}
              <Text style={styles.title}>CREATOR</Text>

              {/* Subtitle */}
              <Text style={styles.subtitle}>
                Create UGC. Earn Per View. {' '}
                <Text style={styles.bold}>Get paid.</Text>
              </Text>

              {/* Dots */}
              <View style={styles.dots}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={[styles.dot, styles.dotInactive]} />
                <View style={[styles.dot, styles.dotInactive]} />
              </View>

              {/* Next Button */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/onboarding_3')}
                style={styles.nextWrapper}
              >
                <LinearGradient
                  colors={['#0F2027', '#203A43', '#2C5364']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextBtn}
                >
                  <Text style={styles.nextText}>Next</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </BlurView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
  },

  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  skipBtn: {
    position: 'absolute',
    width: 93,
    height: 39,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  skipText: {
    fontFamily: 'Urbanist',
    fontWeight: '600',
    fontSize: 14,
    color: '#000',
  },

  contentWrapper: {
    position: 'absolute',
    left: 13 * scale,
    width: 402 * scale,
    height: 304 * scale,
    borderRadius: 24,
    overflow: 'hidden',
  },

  blurContainer: {
    flex: 1,
  },

  gradientContainer: {
    flex: 1,
    paddingVertical: 28,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  title: {
    fontFamily: 'Poppins',
    fontWeight: '800',
    fontSize: 40,
    lineHeight: 56,
    letterSpacing: 0.2,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  subtitle: {
    fontFamily: 'OpenSans',
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 20.4,
    letterSpacing: 0.5,
    color: '#fbfbfb',
    textAlign: 'center',
    marginTop: 1,
  },

  bold: {
    fontWeight: '800',
  },

  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 24,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },

  dotActive: {
    backgroundColor: '#FFFFFF',
  },

  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  nextWrapper: {
    alignItems: 'center',
    marginTop: 24,
  },

  nextBtn: {
    width: 354,
    height: 56,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nextText: {
    fontFamily: 'Urbanist',
    fontWeight: '600',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
