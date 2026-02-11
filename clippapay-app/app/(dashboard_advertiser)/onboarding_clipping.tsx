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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const scale = width / 428;

type SampleVideo = {
  title: string;
  thumbnail: string;
  youtubeUrl: string;
  description: string;
  duration: string;
  platform: string;
};

const sampleVideos: SampleVideo[] = [
  {
    title: 'Viral Product Highlight',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    description: 'Quick, engaging clip from longer product demo - optimized for TikTok',
    duration: '0:15',
    platform: 'TikTok',
  },
  {
    title: 'Funny Meme Edit',
    thumbnail: 'https://img.youtube.com/vi/3JZ_D3ELwOQ/maxresdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/shorts/3JZ_D3ELwOQ',
    description: 'Edited highlight from your ad - perfect for Instagram Reels',
    duration: '0:22',
    platform: 'Instagram',
  },
  {
    title: 'Inspirational Quote Clip',
    thumbnail: 'https://img.youtube.com/vi/L_jWHffIx5E/maxresdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/shorts/L_jWHffIx5E',
    description: 'Short motivational snippet for X/Twitter quick shares',
    duration: '0:18',
    platform: 'X',
  },
];

export default function OnboardingClipping() {
  const router = useRouter();

  const openVideo = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error('Open URL error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F9FAFB', '#F3F4F6', '#E5E7EB']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#FF6B35', '#FF8C5A']}
                style={styles.iconGradient}
              >
                <Ionicons name="cut" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>Clipping Campaigns</Text>
            <Text style={styles.heroSubtitle}>
              Transform your long-form videos into viral short-form content across social platforms
            </Text>
          </View>

          {/* What is Clipping? */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#FFF1EE' }]}>
                <Ionicons name="information-circle" size={20} color="#FF6B35" />
              </View>
              <Text style={styles.cardTitle}>What is Clipping?</Text>
            </View>
            
            <Text style={styles.cardText}>
              <Text style={styles.bold}>Clipping campaigns</Text> connect your brand with skilled editors who transform your original videos into multiple short, engaging clips.
            </Text>
            
            <Text style={[styles.cardText, styles.cardTextSecondary]}>
              Creators post these clips across TikTok, Instagram Reels, YouTube Shorts, and X - you pay only for the views they generate.
            </Text>

            <View style={styles.statsPreview}>
              <View style={styles.statPreviewItem}>
                <Text style={styles.statPreviewValue}>3-5x</Text>
                <Text style={styles.statPreviewLabel}>More Reach</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPreviewItem}>
                <Text style={styles.statPreviewValue}>60%</Text>
                <Text style={styles.statPreviewLabel}>Lower CPM</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPreviewItem}>
                <Text style={styles.statPreviewValue}>24h</Text>
                <Text style={styles.statPreviewLabel}>Avg. Turnaround</Text>
              </View>
            </View>
          </View>

          {/* How It Works */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#FFF1EE' }]}>
                <Ionicons name="rocket" size={20} color="#FF6B35" />
              </View>
              <Text style={styles.cardTitle}>How It Works</Text>
            </View>

            <View style={styles.stepsContainer}>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Upload your video</Text>
                  <Text style={styles.stepDescription}>
                    Provide your raw footage, product demo, or any video content you want clipped
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Set your budget</Text>
                  <Text style={styles.stepDescription}>
                    Define your cost-per-view and total campaign budget
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Creators clip & post</Text>
                  <Text style={styles.stepDescription}>
                    Editors create multiple short versions and share them across platforms
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Pay for real views</Text>
                  <Text style={styles.stepDescription}>
                    You're charged only when authentic users watch your clips
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Key Benefits */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#FFF1EE' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#FF6B35" />
              </View>
              <Text style={styles.cardTitle}>Why Brands Choose Clipping</Text>
            </View>

            <View style={styles.benefitsGrid}>
              <View style={styles.benefitCard}>
                <View style={[styles.benefitIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="flash" size={20} color="#16A34A" />
                </View>
                <Text style={styles.benefitTitle}>Viral Potential</Text>
                <Text style={styles.benefitDescription}>
                  One video becomes hundreds of shareable moments
                </Text>
              </View>

              <View style={styles.benefitCard}>
                <View style={[styles.benefitIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="trending-up" size={20} color="#2563EB" />
                </View>
                <Text style={styles.benefitTitle}>Pay Per View</Text>
                <Text style={styles.benefitDescription}>
                  Zero waste - you only pay for actual views
                </Text>
              </View>

              <View style={styles.benefitCard}>
                <View style={[styles.benefitIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="globe" size={20} color="#D97706" />
                </View>
                <Text style={styles.benefitTitle}>Multi-Platform</Text>
                <Text style={styles.benefitDescription}>
                  Reach audiences on TikTok, Reels, Shorts & X
                </Text>
              </View>

              <View style={styles.benefitCard}>
                <View style={[styles.benefitIcon, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="speedometer" size={20} color="#DB2777" />
                </View>
                <Text style={styles.benefitTitle}>Fast Turnaround</Text>
                <Text style={styles.benefitDescription}>
                  Clips start going live within 24 hours
                </Text>
              </View>
            </View>
          </View>

          {/* Sample Clips */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#FFF1EE' }]}>
                <Ionicons name="play-circle" size={20} color="#FF6B35" />
              </View>
              <Text style={styles.cardTitle}>Example Clips</Text>
            </View>
            
            <Text style={styles.cardSubtext}>
              Tap any clip to see how creators transform content for different platforms
            </Text>

            {sampleVideos.map((video, index) => (
              <TouchableOpacity
                key={index}
                style={styles.videoCard}
                activeOpacity={0.9}
                onPress={() => openVideo(video.youtubeUrl)}
              >
                <View style={styles.thumbnailContainer}>
                  <Image
                    source={{ uri: video.thumbnail }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  <BlurView intensity={40} tint="dark" style={styles.playOverlay}>
                    <View style={styles.playButton}>
                      <Ionicons name="play" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.videoDuration}>
                      <Text style={styles.durationText}>{video.duration}</Text>
                    </View>
                    <View style={styles.platformBadge}>
                      <Text style={styles.platformText}>{video.platform}</Text>
                    </View>
                  </BlurView>
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{video.title}</Text>
                  <Text style={styles.videoDescription}>{video.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Perfect For */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#FFF1EE' }]}>
                <Ionicons name="briefcase" size={20} color="#FF6B35" />
              </View>
              <Text style={styles.cardTitle}>Perfect For</Text>
            </View>

            <View style={styles.useCasesGrid}>
              {[
                'Product Launches',
                'Event Highlights',
                'Tutorial Snippets',
                'Customer Testimonials',
                'Brand Stories',
                'Behind the Scenes',
              ].map((useCase, index) => (
                <View key={index} style={styles.useCaseItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#FF6B35" />
                  <Text style={styles.useCaseText}>{useCase}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <LinearGradient
              colors={['#FF6B35', '#FF8C5A']}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.ctaTitle}>Ready to go viral?</Text>
              <Text style={styles.ctaDescription}>
                Join hundreds of brands scaling their reach with clipping campaigns
              </Text>
              
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/(dashboard_advertiser)/create_clipping')}
              >
                <Text style={styles.ctaButtonText}>Start Your Campaign</Text>
                <Ionicons name="arrow-forward" size={20} color="#FF6B35" />
              </TouchableOpacity>

              <Text style={styles.ctaFootnote}>
                Set your budget • Upload your video • Start getting clips in 24h
              </Text>
            </LinearGradient>
          </View>

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 120,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  cardText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  cardTextSecondary: {
    color: '#6B7280',
  },
  bold: {
    fontWeight: '700',
    color: '#FF6B35',
  },
  cardSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  statsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFF1EE',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  statPreviewItem: {
    alignItems: 'center',
  },
  statPreviewValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 4,
  },
  statPreviewLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#FFD7CC',
  },
  stepsContainer: {
    gap: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFF1EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  videoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  thumbnailContainer: {
    position: 'relative',
    height: 180,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  platformBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,107,53,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  platformText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  useCasesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  useCaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: 8,
  },
  useCaseText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  ctaSection: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  ctaDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 8,
    marginBottom: 16,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  ctaFootnote: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});