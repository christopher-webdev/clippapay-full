// app/(dashboard_advertiser)/creator/[id].tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const API_BASE = 'https://clippapay.com/api';
const MEDIA_BASE = 'https://clippapay.com';

export default function CreatorProfileView() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCreatorProfile();
  }, [id]);

  const getToken = async () => {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('userToken');
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

  const getMediaUrl = (path?: string) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}${path}`;
  };

  const loadCreatorProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      // Fetch user data
      const userResponse = await axios.get(`${API_BASE}/user/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch clipper profile
      const profileResponse = await axios.get(`${API_BASE}/user/clipper-profile/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ data: {} }));

      setCreator(userResponse.data);
      setProfile(profileResponse.data);
    } catch (err: any) {
      console.error('Error loading creator profile:', err);
      setError(err.response?.data?.error || 'Failed to load creator profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={16} color="#FFD700" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Ionicons key={i} name="star-half" size={16} color="#FFD700" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={16} color="#FFD700" />);
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <LinearGradient colors={['#F9FAFB', '#F3F4F6']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading creator profile...</Text>
      </View>
    );
  }

  if (error || !creator) {
    return (
      <View style={styles.centerContainer}>
        <LinearGradient colors={['#F9FAFB', '#F3F4F6']} style={StyleSheet.absoluteFill} />
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Failed to Load</Text>
        <Text style={styles.errorText}>{error || 'Creator not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPremium = creator.isPremiumCreator;
  const fullName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F9FAFB', '#F3F4F6', '#E5E7EB']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Creator Profile</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header Card */}
          <View style={styles.profileHeaderCard}>
            {/* Profile Image */}
            <TouchableOpacity
              style={styles.profileImageContainer}
              onPress={() => profile?.profileImage && setShowImagePreview(true)}
              activeOpacity={0.9}
            >
              {profile?.profileImage ? (
                <Image
                  source={{ uri: getMediaUrl(profile.profileImage) }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImagePlaceholderText}>
                    {creator.firstName?.[0]}{creator.lastName?.[0]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Name and Premium Badge */}
            <View style={styles.nameContainer}>
              <Text style={styles.creatorName}>{fullName || 'Creator'}</Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.premiumText}>PREMIUM</Text>
                </View>
              )}
            </View>

            {/* Rating */}
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStars(creator.rating)}
              </View>
              <Text style={styles.ratingText}>
                {creator.rating?.toFixed(1) || '0.0'} / 5.0
              </Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="briefcase-outline" size={20} color="#6B7280" />
                <Text style={styles.statValue}>{profile?.completedProjects || 0}</Text>
                <Text style={styles.statLabel}>Projects</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="cash-outline" size={20} color="#6B7280" />
                <Text style={styles.statValue}>
                  {profile?.ratePerVideo ? `₦${profile.ratePerVideo.toLocaleString()}` : '—'}
                </Text>
                <Text style={styles.statLabel}>Rate/Video</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
                <Text style={styles.statValue}>{profile?.expectedDelivery || '—'}</Text>
                <Text style={styles.statLabel}>Delivery</Text>
              </View>
            </View>
          </View>

          {/* Bio Section */}
          {profile?.bio ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="document-text-outline" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.cardTitle}>About</Text>
              </View>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* Categories */}
          {profile?.categories && profile.categories.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="grid-outline" size={20} color="#DB2777" />
                </View>
                <Text style={styles.cardTitle}>Specializations</Text>
              </View>
              <View style={styles.categoriesContainer}>
                {profile.categories.map((cat: string, index: number) => (
                  <View key={index} style={styles.categoryChip}>
                    <Text style={styles.categoryText}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Sample Video */}
          {profile?.sampleVideo && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="videocam-outline" size={20} color="#0284C7" />
                </View>
                <Text style={styles.cardTitle}>Sample Work</Text>
              </View>

              <TouchableOpacity
                style={styles.videoPreview}
                onPress={() => setShowVideoPreview(true)}
                activeOpacity={0.9}
              >
                <Video
                  ref={videoRef}
                  source={{ uri: getMediaUrl(profile.sampleVideo) }}
                  style={styles.video}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                  useNativeControls={false}
                  isLooping={false}
                />
                <View style={styles.videoOverlay}>
                  <View style={styles.playButton}>
                    <Ionicons name="play" size={32} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>

              <Text style={styles.videoHint}>Tap to preview video</Text>
            </View>
          )}

          {/* Additional Info if needed */}
          {!profile?.bio && !profile?.categories && !profile?.sampleVideo && (
            <View style={styles.emptyContainer}>
              <Ionicons name="information-circle-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Profile Details Yet</Text>
              <Text style={styles.emptyText}>
                This creator hasn't added any profile information yet.
              </Text>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Image Preview Modal */}
        <Modal
          visible={showImagePreview}
          transparent
          onRequestClose={() => setShowImagePreview(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowImagePreview(false)}
          >
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowImagePreview(false)}
              >
                <Ionicons name="close-circle" size={40} color="#FFFFFF" />
              </TouchableOpacity>
              <Image
                source={{ uri: getMediaUrl(profile?.profileImage) }}
                style={styles.fullscreenMedia}
                resizeMode="contain"
              />
            </BlurView>
          </TouchableOpacity>
        </Modal>

        {/* Video Preview Modal */}
        <Modal
          visible={showVideoPreview}
          transparent
          onRequestClose={() => setShowVideoPreview(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowVideoPreview(false)}
              >
                <Ionicons name="close-circle" size={40} color="#FFFFFF" />
              </TouchableOpacity>
              <Video
                source={{ uri: getMediaUrl(profile?.sampleVideo) }}
                style={styles.fullscreenMedia}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                useNativeControls
                isLooping={false}
              />
            </BlurView>
          </View>
        </Modal>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: 'transparent',
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
  backButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#7C3AED',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImagePlaceholderText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  creatorName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '700',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  bioText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
  },
  categoryText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '600',
  },
  videoPreview: {
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124,58,237,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoHint: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
  },
  fullscreenMedia: {
    width: '100%',
    height: '100%',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
});