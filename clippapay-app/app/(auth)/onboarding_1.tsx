import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');
const scale = width / 428;

export default function Onboarding1() {
  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground
        source={require('../../assets/images/4.png')}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Dark overlay */}
        <View style={styles.overlay} />

        {/* Content */}
        <View style={styles.content}>
          {/* Logo */}
          <Image
            source={require('../../assets/images/logo.png')}
            style={[
              styles.logo,
              {
                top: 405 * scale,
                left: (width - 323 * scale) / 2, // Center horizontally
              },
            ]}
            resizeMode="contain"
          />

          {/* Sub text */}
          <Text style={[styles.subText, { top: 590 * scale }]}>
            Turn Your Views{'\n'}Into Income
          </Text>

          {/* TRUE Gradient Text */}
          <View style={[styles.gradientTextContainer, { top: 650 * scale }]}>
            <MaskedView
              maskElement={
                <Text style={styles.mainText}>
                  Create. Share. Earn
                </Text>
              }
            >
              <LinearGradient
                colors={['#45A247', '#283C86']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.mainText, { opacity: 0 }]}>
                  Create. Share. Earn
                </Text>
              </LinearGradient>
            </MaskedView>
          </View>

          {/* Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/onboarding_2')}
            style={[styles.buttonWrapper, { top: 740 * scale }]}
          >
            <LinearGradient
              colors={['#0F2027', '#203A43', '#2C5364']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  content: {
    flex: 1,
  },
  logo: {
    position: 'absolute',
    width: 323 * (width / 428),
    height: 64 * (width / 428),
  },
  subText: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'open-sans',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22.4,
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  gradientTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mainText: {
    fontFamily: 'OpenSans',
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 39.2,
    letterSpacing: 0.2,
    textAlign: 'center',
    color: '#000',
  },
  buttonWrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Urbanist',
  },
});