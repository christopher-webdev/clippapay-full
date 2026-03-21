// app/(dashboard)/advertiser/review-applications/[campaignId].tsx (updated)

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Video, ResizeMode } from 'expo-av';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_BASE_URL = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL;

const toFullUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${UPLOADS_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

type Application = {
  _id: string;
  clipper: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
    rating: number;
    sampleVideos: string[];
    bio: string;
    categories: string[];
  };
  proposedRateNGN?: number;
  proposedRateUSDT?: number;
  note?: string;
  status: string;
  createdAt: string;
};

export default function ReviewApplicationsScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router = useRouter();

  const [applications, setApplications] = useState<Application[]>([]);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignCurrency, setCampaignCurrency] = useState<'NGN' | 'USDT' | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [wallet, setWallet] = useState<{ balance: number; usdtBalance: number } | null>(null);

  // Video player state
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const res = await fetch(`${API_URL}/applications/campaign/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');

      setApplications(data.applications || []);
      setCampaignTitle(data.campaign?.title || 'Review Applications');
      setCampaignCurrency(data.campaign?.currency || 'NGN'); // Assuming campaign has currency preference

      // Fetch wallet for balance check
      const walletRes = await fetch(`${API_URL}/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const walletData = await walletRes.json();
      setWallet(walletData);

    } catch (err: any) {
      console.error('Fetch error:', err);
      Alert.alert('Error', err.message || 'Could not load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) fetchApplications();
  }, [campaignId]);

  const handleFundWallet = (currency: 'NGN' | 'USDT') => {
    router.push({
      pathname: '/(dashboard)/wallet',
      params: { activeTab: 'deposit', currency }
    });
  };

  const handleSelectClipper = async (applicationId: string, currency: 'NGN' | 'USDT') => {
    if (!wallet) {
      Alert.alert('Wallet Error', 'Could not check your balance. Please try again.');
      return;
    }

    const app = applications.find(a => a._id === applicationId);
    if (!app) return;

    const amount = currency === 'NGN' ? app.proposedRateNGN! : app.proposedRateUSDT!;
    const balance = currency === 'NGN' ? wallet.balance : wallet.usdtBalance;
    const shortfall = amount - balance;

    if (balance < amount) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${currency === 'NGN' ? '₦' : ''}${shortfall.toLocaleString()} more in your ${currency} wallet to select this clipper.\n\nYour current ${currency} balance: ${currency === 'NGN' ? '₦' : ''}${balance.toLocaleString()}\nRequired amount: ${currency === 'NGN' ? '₦' : ''}${amount.toLocaleString()}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Fund Wallet', 
            onPress: () => handleFundWallet(currency)
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Confirm Selection',
      `Select this clipper for ${currency === 'NGN' ? '₦' : ''}${amount.toLocaleString()}? Other applicants will be rejected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select',
          onPress: async () => {
            setActionLoading(applicationId);
            try {
              const token = await SecureStore.getItemAsync('userToken');
              const res = await fetch(`${API_URL}/applications/${applicationId}/select`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ currency }),
              });

              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Failed');

              Alert.alert('Success', 'Clipper selected! They have 2 hours to accept.');
              fetchApplications();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Selection failed');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const openVideo = (url: string) => {
    const fullUrl = toFullUrl(url);
    if (fullUrl) {
      setCurrentVideoUrl(fullUrl);
      setVideoModalVisible(true);
    }
  };

  const closeVideoModal = async () => {
    if (videoRef.current) {
      await videoRef.current.pauseAsync();
      await videoRef.current.unloadAsync();
    }
    setVideoModalVisible(false);
    setCurrentVideoUrl(null);
  };

  const renderApplication = ({ item }: { item: Application }) => {
    const clipper = item.clipper;
    const hasNGN = item.proposedRateNGN && item.proposedRateNGN > 0;
    const hasUSDT = item.proposedRateUSDT && item.proposedRateUSDT > 0;

    // Determine which currency to use based on campaign preference or clipper's rates
    const availableCurrencies = [];
    if (hasNGN) availableCurrencies.push('NGN');
    if (hasUSDT) availableCurrencies.push('USDT');

    return (
      <View style={styles.card}>
        {/* Profile */}
        <View style={styles.profileRow}>
          <Image
            source={{ uri: toFullUrl(clipper.profileImage) || 'https://via.placeholder.com/60' }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {clipper.firstName} {clipper.lastName}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text style={styles.rating}>{clipper.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.bio} numberOfLines={2}>
              {clipper.bio || 'No bio provided'}
            </Text>
            {clipper.categories?.length > 0 && (
              <Text style={styles.categories} numberOfLines={1}>
                {clipper.categories.join(' • ')}
              </Text>
            )}
          </View>
        </View>

        {/* Rates */}
        <View style={styles.ratesRow}>
          {hasNGN && (
            <View style={[styles.rateBadge, campaignCurrency === 'NGN' && styles.preferredRateBadge]}>
              <Text style={styles.rateText}>₦{item.proposedRateNGN?.toLocaleString()}</Text>
              {campaignCurrency === 'NGN' && (
                <Text style={styles.preferredTag}>Campaign currency</Text>
              )}
            </View>
          )}
          {hasUSDT && (
            <View style={[styles.rateBadge, campaignCurrency === 'USDT' && styles.preferredRateBadge]}>
              <Text style={styles.rateText}>{item.proposedRateUSDT} USDT</Text>
              {campaignCurrency === 'USDT' && (
                <Text style={styles.preferredTag}>Campaign currency</Text>
              )}
            </View>
          )}
        </View>

        {/* Note */}
        {item.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Clipper's Message:</Text>
            <Text style={styles.note}>{item.note}</Text>
          </View>
        )}

        {/* Sample Videos */}
        <View style={styles.samplesSection}>
          <Text style={styles.samplesTitle}>
            Sample Videos {clipper.sampleVideos?.length ? `(${clipper.sampleVideos.length})` : ''}
          </Text>

          {clipper.sampleVideos?.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.videoScroll}>
              {clipper.sampleVideos.map((url, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.videoThumb}
                  onPress={() => openVideo(url)}
                >
                  <View style={styles.videoThumbPlaceholder}>
                    <Ionicons name="videocam" size={32} color="#6366f1" />
                  </View>
                  <View style={styles.playOverlay}>
                    <Ionicons name="play-circle" size={48} color="#fff" />
                  </View>
                  <Text style={styles.videoLabel}>Video {index + 1}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noSamples}>This clipper has not uploaded any sample videos yet.</Text>
          )}
        </View>

        {/* Action */}
        {item.status === 'pending' && (
          <View style={styles.actionContainer}>
            {availableCurrencies.map(currency => (
              <TouchableOpacity
                key={currency}
                style={[
                  styles.btnSelect,
                  currency === 'NGN' ? styles.btnNGN : styles.btnUSDT
                ]}
                onPress={() => handleSelectClipper(item._id, currency as 'NGN' | 'USDT')}
                disabled={actionLoading === item._id}
              >
                {actionLoading === item._id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>
                    Select with {currency === 'NGN' ? '₦' : ''}{currency === 'NGN' ? item.proposedRateNGN : item.proposedRateUSDT} {currency}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {item.status !== 'pending' && (
          <View style={[styles.statusContainer, 
            item.status === 'selected' ? styles.statusSelected : 
            item.status === 'rejected' ? styles.statusRejected : 
            styles.statusAccepted
          ]}>
            <Text style={styles.statusText}>
              Status: {item.status.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Applications</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.campaignTitle}>{campaignTitle}</Text>

      {/* Wallet Summary */}
      {wallet && (
        <View style={styles.walletSummary}>
          <View style={styles.walletItem}>
            <Ionicons name="wallet-outline" size={16} color="#4F46E5" />
            <Text style={styles.walletText}>
              NGN: ₦{wallet.balance.toLocaleString()}
            </Text>
          </View>
          <View style={styles.walletDivider} />
          <View style={styles.walletItem}>
            <Ionicons name="logo-usd" size={16} color="#10B981" />
            <Text style={styles.walletText}>
              USDT: {wallet.usdtBalance.toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={styles.center} />
      ) : (
        <FlatList
          data={applications}
          renderItem={renderApplication}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>No applications received yet</Text>
              <Text style={styles.emptySub}>Share your campaign link to attract more creators</Text>
            </View>
          }
        />
      )}

      {/* Video Player Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={videoModalVisible}
        onRequestClose={closeVideoModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={closeVideoModal}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          
          {currentVideoUrl && (
            <Video
              ref={videoRef}
              source={{ uri: currentVideoUrl }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
              shouldPlay={true}
              onError={(error) => {
                console.error('Video playback error:', error);
                Alert.alert('Error', 'Failed to load video');
                closeVideoModal();
              }}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',

  },

  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },

  campaignTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },

  walletSummary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  walletDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb',
  },

  list: { padding: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  profileRow: { flexDirection: 'row', marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 12 },
  profileInfo: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rating: { marginLeft: 4, fontSize: 14, color: '#4b5563' },
  bio: { 
    fontSize: 15, 
    color: '#374151', 
    lineHeight: 22, 
    marginBottom: 6 
  },
  categories: { 
    fontSize: 14, 
    color: '#6366f1', 
    marginTop: 4 
  },

  ratesRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  rateBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
  },
  preferredRateBadge: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  rateText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1e293b',
    textAlign: 'center',
  },
  preferredTag: {
    fontSize: 10,
    color: '#0369a1',
    textAlign: 'center',
    marginTop: 2,
  },

  noteContainer: { marginBottom: 16 },
  noteLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  note: { fontSize: 14, color: '#374151', lineHeight: 20 },

  samplesSection: { marginTop: 12 },
  samplesTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  videoScroll: { marginLeft: -4 },
  videoThumb: {
    width: 140,
    height: 100,
    marginHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noSamples: { 
    fontSize: 14, 
    color: '#9ca3af', 
    fontStyle: 'italic',
    marginTop: 8 
  },

  actionContainer: {
    gap: 8,
    marginTop: 16,
  },
  btnSelect: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnNGN: {
    backgroundColor: '#4F46E5',
  },
  btnUSDT: {
    backgroundColor: '#10B981',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  statusContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusSelected: {
    backgroundColor: '#fef3c7',
  },
  statusAccepted: {
    backgroundColor: '#d1fae5',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
  },
  statusText: { 
    fontSize: 14, 
    color: '#374151',
    fontWeight: '500',
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptySub: { fontSize: 15, color: '#9ca3af', marginTop: 8, textAlign: 'center' },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: width,
    height: height * 0.7,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
});