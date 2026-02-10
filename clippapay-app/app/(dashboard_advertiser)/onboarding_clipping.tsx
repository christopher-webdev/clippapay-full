// app/(dashboard)/onboarding_clipping.tsx

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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

type SampleVideo = {
  title: string;
  thumbnail: string;
  youtubeUrl: string;
  description: string;
};

// Sample clipping-style video examples
const sampleVideos: SampleVideo[] = [
  {
    title: 'Viral Product Highlight Clip',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    description:
      'Quick, engaging clip from longer product demo - posted on TikTok for max views',
  },
  {
    title: 'Funny Meme Edit from Ad',
    thumbnail: 'https://img.youtube.com/vi/3JZ_D3ELwOQ/maxresdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/shorts/3JZ_D3ELwOQ',
    description:
      'Edited funny moment from your video - perfect for Instagram Reels',
  },
  {
    title: 'Inspirational Quote Clip',
    thumbnail: 'https://img.youtube.com/vi/L_jWHffIx5E/maxresdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/shorts/L_jWHffIx5E',
    description:
      'Short motivational snippet posted on X for quick shares and views',
  },
];

export default function OnboardingClipping() {
  const router = useRouter();

  const openVideo = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this video link.');
      }
    } catch (err) {
      console.error('Open URL error:', err);
      Alert.alert('Error', 'Could not open video. Please try again.');
    }
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
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Ionicons name="cut" size={48} color="#FFFFFF" />
            </View>

            <Text style={styles.heroTitle}>Clipping Campaigns</Text>

            <Text style={styles.heroSubtitle}>
              Turn your videos into viral clips across social media
            </Text>
          </View>

          {/* What is Clipping */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              What is a Clipping Campaign?
            </Text>

            <Text style={styles.sectionText}>
              In a Clipping Campaign, you upload your video content, and our
              community of creators edit it into short, engaging clips. They
              post these clips on platforms like TikTok, Instagram, YouTube
              Shorts, X, and more.
              {'\n\n'}
              You pay based on real views generated, turning your content into
              widespread viral exposure.
              {'\n\n'}
              Perfect for promoting products, events, tutorials, or any video
              you want to reach millions organically.
            </Text>

            <View style={styles.benefits}>
              <View style={styles.benefitItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="#22C55E"
                />
                <Text style={styles.benefitText}>
                  Get thousands of authentic posts
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="#22C55E"
                />
                <Text style={styles.benefitText}>
                  Pay per real view - no wasted budget
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="#22C55E"
                />
                <Text style={styles.benefitText}>
                  Reach audiences on multiple platforms
                </Text>
              </View>
            </View>
          </View>

          {/* Sample Clips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Examples of Clipped Videos
            </Text>

            <Text style={styles.sectionSubtitle}>
              Tap to watch how creators turn long videos into short, viral
              content
            </Text>

            {sampleVideos.map((video, index) => (
              <TouchableOpacity
                key={index}
                style={styles.videoCard}
                activeOpacity={0.85}
                onPress={() => openVideo(video.youtubeUrl)}
              >
                <Image
                  source={{ uri: video.thumbnail }}
                  style={styles.videoThumbnail}
                  resizeMode="cover"
                />

                <View style={styles.videoOverlay}>
                  <Ionicons
                    name="play-circle"
                    size={64}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={styles.tapToWatch}>Tap to Watch</Text>
                </View>

                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{video.title}</Text>
                  <Text style={styles.videoDesc}>{video.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() =>
                router.push('/(dashboard_advertiser)/create_clipping')
              }
            >
              <Text style={styles.ctaText}>
                Create Clipping Campaign
              </Text>
              <Ionicons
                name="arrow-forward"
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <Text style={styles.ctaSubtext}>
              Upload your video • Set budget • Get viral clips
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

  benefits: {
    marginTop: 16,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  benefitText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
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
