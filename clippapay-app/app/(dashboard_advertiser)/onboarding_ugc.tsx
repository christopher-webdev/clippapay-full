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
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const scale = width / 428;

const sampleVideos = [
  {
    title: "Real Customer Unboxing",
    thumbnail: "https://img.youtube.com/vi/6ZfuNTqbHE8/maxresdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=6ZfuNTqbHE8",
    description: "Authentic product reveal with natural reactions and honest opinions",
  },
  {
    title: "Day-in-the-Life with Product",
    thumbnail: "https://img.youtube.com/vi/3qHkcs3kG44/maxresdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=3qHkcs3kG44",
    description: "How real people integrate the product into their everyday routine",
  },
  {
    title: "Quick Testimonial + Demo",
    thumbnail: "https://img.youtube.com/vi/0q5f0jZ6r0Y/maxresdefault.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=0q5f0jZ6r0Y",
    description: "Honest feedback and quick showcase of key features",
  },
];

export default function OnboardingUGC() {
  const router = useRouter();

  const openVideo = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error("Couldn't open YouTube link", err);
    });
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
                colors={['#4F46E5', '#6366F1']}
                style={styles.iconGradient}
              >
                <Ionicons name="videocam" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>UGC Campaigns</Text>
            <Text style={styles.heroSubtitle}>
              Authentic content from real creators that builds trust and drives conversions
            </Text>
          </View>

          {/* What is UGC? */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="information-circle" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.cardTitle}>What is UGC?</Text>
            </View>
            
            <Text style={styles.cardText}>
              <Text style={styles.bold}>User-Generated Content (UGC)</Text> is authentic video content created by real people, not professional studios.
            </Text>
            
            <Text style={[styles.cardText, styles.cardTextSecondary]}>
              These videos feel genuine, build trust faster, and consistently outperform traditional ads on social platforms.
            </Text>

            <View style={styles.benefitsGrid}>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark" size={16} color="#16A34A" />
                </View>
                <Text style={styles.benefitText}>Authentic & relatable</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark" size={16} color="#16A34A" />
                </View>
                <Text style={styles.benefitText}>Higher engagement</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark" size={16} color="#16A34A" />
                </View>
                <Text style={styles.benefitText}>Cost-effective</Text>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark" size={16} color="#16A34A" />
                </View>
                <Text style={styles.benefitText}>Quick turnaround</Text>
              </View>
            </View>
          </View>

          {/* How It Works */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="rocket" size={20} color="#D97706" />
              </View>
              <Text style={styles.cardTitle}>How It Works</Text>
            </View>

            <View style={styles.stepsContainer}>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Create a brief</Text>
                  <Text style={styles.stepDescription}>
                    Set your budget, provide instructions, and upload reference materials
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Creators apply</Text>
                  <Text style={styles.stepDescription}>
                    Real creators submit videos that match your requirements
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Review & approve</Text>
                  <Text style={styles.stepDescription}>
                    Select the best videos, request changes, and approve final content
                  </Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Download & publish</Text>
                  <Text style={styles.stepDescription}>
                    Get high-quality videos ready for your marketing channels
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Sample Videos */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#FCE7F3' }]}>
                <Ionicons name="play-circle" size={20} color="#DB2777" />
              </View>
              <Text style={styles.cardTitle}>Example Videos</Text>
            </View>
            
            <Text style={styles.cardSubtext}>
              Tap any video to see what authentic UGC looks like
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
                  </BlurView>
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{video.title}</Text>
                  <Text style={styles.videoDescription}>{video.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Why Choose UGC */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="stats-chart" size={20} color="#0284C7" />
              </View>
              <Text style={styles.cardTitle}>Why Advertisers Choose UGC</Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>4.5x</Text>
                <Text style={styles.statLabel}>Higher CTR</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>85%</Text>
                <Text style={styles.statLabel}>More trust</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>60%</Text>
                <Text style={styles.statLabel}>Lower cost</Text>
              </View>
            </View>

            <View style={styles.quoteContainer}>
              <Ionicons name="quote" size={24} color="#9CA3AF" />
              <Text style={styles.quoteText}>
                "UGC videos convert 4.5x better than traditional branded content because they feel like recommendations from friends, not advertisements."
              </Text>
            </View>
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.ctaTitle}>Ready to launch your first UGC campaign?</Text>
              <Text style={styles.ctaDescription}>
                Join hundreds of brands already leveraging authentic creator content
              </Text>
              
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/(dashboard_advertiser)/CreatePgc')}
              >
                <Text style={styles.ctaButtonText}>Start Your Campaign</Text>
                <Ionicons name="arrow-forward" size={20} color="#4F46E5" />
              </TouchableOpacity>

              <Text style={styles.ctaFootnote}>
                No commitment • Set your own budget • Pay per approved video
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
    shadowColor: '#4F46E5',
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
    color: '#4F46E5',
  },
  cardSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: 8,
  },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
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
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
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
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4F46E5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  quoteText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  ctaSection: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
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
    color: '#4F46E5',
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