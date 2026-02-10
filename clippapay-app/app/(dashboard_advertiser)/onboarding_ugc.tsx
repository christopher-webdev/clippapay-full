// app/(dashboard)/onboarding_ugc.tsx

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Real UGC-style YouTube video examples (thumbnails + links)
const sampleVideos = [
  {
    title: "Real Customer Unboxing",
    thumbnail: "https://img.youtube.com/vi/6ZfuNTqbHE8/maxresdefault.jpg", // Real unboxing example
    youtubeUrl: "https://www.youtube.com/watch?v=6ZfuNTqbHE8",
    description: "Authentic product reveal with natural reactions and honest opinions",
  },
  {
    title: "Day-in-the-Life with Product",
    thumbnail: "https://img.youtube.com/vi/3qHkcs3kG44/maxresdefault.jpg", // Lifestyle / daily use example
    youtubeUrl: "https://www.youtube.com/watch?v=3qHkcs3kG44",
    description: "How real people integrate the product into their everyday routine",
  },
  {
    title: "Quick Testimonial + Demo",
    thumbnail: "https://img.youtube.com/vi/0q5f0jZ6r0Y/maxresdefault.jpg", // Short review + demo
    youtubeUrl: "https://www.youtube.com/watch?v=0q5f0jZ6r0Y",
    description: "Honest feedback and quick showcase of key features",
  },
];

export default function OnboardingUGC() {
  const router = useRouter();

  const openVideo = (url) => {
    Linking.openURL(url).catch((err) => {
      console.error("Couldn't open YouTube link", err);
      alert("Could not open video. Please try again.");
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <LinearGradient
        colors={['#34D3991A', '#D6CF8D80', '#d8d8d8b2']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Ionicons name="videocam" size={48} color="#FFFFFF" />
            </View>

            <Text style={styles.heroTitle}>UGC Campaigns</Text>
            <Text style={styles.heroSubtitle}>
              Get real people to create authentic videos for your brand
            </Text>
          </View>

          {/* What is UGC? */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What is UGC?</Text>
            <Text style={styles.sectionText}>
              UGC stands for <Text style={styles.bold}>User-Generated Content</Text>.{'\n\n'}
              Instead of expensive studio shoots, real people (creators) make natural, relatable videos about your product or service.{'\n\n'}
              These videos feel genuine, build more trust, and usually perform better on TikTok, Instagram, and YouTube.
            </Text>

            <View style={styles.benefits}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                <Text style={styles.benefitText}>Feels real, not like a paid ad</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                <Text style={styles.benefitText}>Higher likes, shares & conversions</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                <Text style={styles.benefitText}>Affordable & easy to scale</Text>
              </View>
            </View>
          </View>

          {/* Sample Videos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Real UGC Video Examples</Text>
            <Text style={styles.sectionSubtitle}>
              Tap any video below to watch how authentic content looks
            </Text>

            {sampleVideos.map((video, index) => (
              <TouchableOpacity
                key={index}
                style={styles.videoCard}
                activeOpacity={0.8}
                onPress={() => openVideo(video.youtubeUrl)}
              >
                <Image
                  source={{ uri: video.thumbnail }}
                  style={styles.videoThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.videoOverlay}>
                  <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.tapToWatch}>Tap to Watch</Text>
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{video.title}</Text>
                  <Text style={styles.videoDesc}>{video.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Final CTA */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/(dashboard)/CreatePgc')}
            >
              <Text style={styles.ctaText}>Start Your UGC Campaign Now</Text>
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.ctaSubtext}>
              Set your budget • Share your vision • Receive real videos from creators
            </Text>
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  gradient: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 120,
    paddingBottom: 40,
  },

  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },

  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 8,
  },

  heroSubtitle: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
  },

  section: {
    marginBottom: 40,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  sectionSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
  },

  sectionText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },

  bold: {
    fontWeight: '700',
    color: '#1E40AF',
  },

  benefits: {
    marginTop: 16,
    gap: 12,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  benefitText: {
    fontSize: 15,
    color: '#374151',
  },

  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  videoThumbnail: {
    width: '100%',
    height: 200,
  },

  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  tapToWatch: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  videoInfo: {
    padding: 16,
  },

  videoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  videoDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  ctaContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },

  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },

  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },

  ctaSubtext: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});