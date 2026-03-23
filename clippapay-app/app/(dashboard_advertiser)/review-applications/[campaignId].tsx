// app/(dashboard_advertiser)/review-applications/[campaignId].tsx
// Updated for new flow:
//  - 'pending' applicants stay selectable even after someone was selected
//  - 'selected' shows countdown timer + "Awaiting response" — no select button
//  - 'declined' / 'expired' shown clearly so advertiser knows to pick again
//  - Select button blocked if another offer is still active (server also blocks it)
//  - Confirm modal shows remaining applicant count for context
//  - No SafeAreaView — _layout.tsx owns it
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  ActivityIndicator, Alert, StyleSheet, ScrollView,
  Modal, Dimensions, StatusBar, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const API_URL           = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_BASE_URL  = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL || '';

const toFullUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${UPLOADS_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
  return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
};

const C = {
  bg:           '#F5F5F7',
  surface:      '#FFFFFF',
  surfaceHi:    '#F9FAFB',
  border:       '#E5E7EB',
  borderLight:  '#F3F4F6',
  indigo:       '#4F46E5',
  indigoDark:   '#4F46E5',
  indigoLight:  '#ffffff',
  orange:       '#6366F1',
  orangeDark:   '#6366F1',
  orangeLight:  '#FFF7ED',
  purple:       '#8B5CF6',
  purpleLight:  '#F5F3FF',
  emerald:      '#10B981',
  emeraldLight: '#ECFDF5',
  amber:        '#F59E0B',
  amberLight:   '#FFFBEB',
  red:          '#da4f0e',
  redLight:     '#FEF2F2',
  textPri:      '#111827',
  textSec:      '#6B7280',
  textMuted:    '#9CA3AF',
};

// Status config — updated for new statuses
const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:  { bg: '#F9FAFB',      text: C.textMuted, dot: C.textMuted, label: 'PENDING'   },
  selected: { bg: C.amberLight,   text: C.amber,     dot: C.amber,     label: 'OFFER SENT'},
  accepted: { bg: C.emeraldLight, text: C.emerald,   dot: C.emerald,   label: 'ACCEPTED'  },
  declined: { bg: C.redLight,     text: C.red,       dot: C.red,       label: 'DECLINED'  },
  expired:  { bg: '#F3F4F6',      text: C.textSec,   dot: C.textMuted, label: 'EXPIRED'   },
  rejected: { bg: '#F3F4F6',      text: C.textMuted, dot: C.textMuted, label: 'CLOSED'    },
};

type Application = {
  _id: string;
  status: string;
  offerExpiresAt?: string;
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
  createdAt: string;
};

// Countdown hook for a single selected application
function useCountdown(expiresAt?: string, status?: string) {
  const [timeLeft, setTimeLeft] = useState('');
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status !== 'selected' || !expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); clearInterval(ref.current!); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    ref.current = setInterval(tick, 1000);
    return () => clearInterval(ref.current!);
  }, [expiresAt, status]);

  return timeLeft;
}

export default function ReviewApplicationsScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router = useRouter();

  const [applications, setApplications]       = useState<Application[]>([]);
  const [campaignTitle, setCampaignTitle]     = useState('');
  const [campaignCurrency, setCampaignCurrency] = useState<'NGN' | 'USDT' | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [actionLoading, setActionLoading]     = useState<string | null>(null);
  const [wallet, setWallet]                   = useState<{ balance: number; usdtBalance: number } | null>(null);
  const [videoModal, setVideoModal]           = useState<string | null>(null);
  const [confirmModal, setConfirmModal]       = useState<{ applicationId: string; currency: 'NGN' | 'USDT'; amount: number } | null>(null);
  const videoRef = useRef<Video>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.replace('/(auth)/login'); return; }
      const [res, walletRes] = await Promise.all([
        fetch(`${API_URL}/applications/campaign/${campaignId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/wallet`,                              { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const data       = await res.json();
      const walletData = await walletRes.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setApplications(data.applications || []);
      setCampaignTitle(data.campaign?.title || 'Review Applications');
      setCampaignCurrency(data.campaign?.currency || 'NGN');
      setWallet(walletData);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load applications');
    } finally { setLoading(false); }
  }, [campaignId]);

  // Refresh on focus so after a decline/expiry the list updates
  useFocusEffect(useCallback(() => { fetchApplications(); }, [fetchApplications]));

  const handleFundWallet = (currency: 'NGN' | 'USDT') =>
    router.push({ pathname: '/(dashboard_advertiser)/WalletScreen', params: { activeTab: 'deposit', currency } });

  // Is there currently an active (non-expired) selected offer?
  const activeOffer = applications.find(
    a => a.status === 'selected' && a.offerExpiresAt && new Date(a.offerExpiresAt) > new Date()
  );

  const initiateSelect = (applicationId: string, currency: 'NGN' | 'USDT') => {
    if (!wallet) { Alert.alert('Wallet Error', 'Could not check your balance. Please try again.'); return; }

    // Block if another offer is still pending
    if (activeOffer && activeOffer._id !== applicationId) {
      Alert.alert(
        'Offer Already Sent',
        `Another creator is reviewing your offer. Wait for them to respond or for the 2-hour window to expire before selecting someone else.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const app = applications.find(a => a._id === applicationId);
    if (!app) return;
    const amount  = currency === 'NGN' ? app.proposedRateNGN! : app.proposedRateUSDT!;
    const balance = currency === 'NGN' ? wallet.balance : wallet.usdtBalance;

    if (balance < amount) {
      const shortfall = amount - balance;
      const sym = currency === 'NGN' ? '₦' : '$';
      Alert.alert(
        'Insufficient Balance',
        `You need ${sym}${shortfall.toLocaleString()} more ${currency}.\n\nAvailable: ${sym}${balance.toLocaleString()}\nRequired: ${sym}${amount.toLocaleString()}`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Fund Wallet', onPress: () => handleFundWallet(currency) }]
      );
      return;
    }
    setConfirmModal({ applicationId, currency, amount });
  };

  const confirmSelect = async () => {
    if (!confirmModal) return;
    setActionLoading(confirmModal.applicationId);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/applications/${confirmModal.applicationId}/select`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currency: confirmModal.currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setConfirmModal(null);
      Alert.alert('✅ Offer Sent!', 'The creator has 2 hours to accept. You\'ll be notified the moment they respond. Other applicants remain available if they decline or don\'t respond.');
      fetchApplications();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Selection failed');
    } finally { setActionLoading(null); }
  };

  const openVideo = (url: string) => {
    const full = toFullUrl(url);
    if (full) setVideoModal(full);
  };
  const closeVideoModal = async () => {
    if (videoRef.current) { await videoRef.current.pauseAsync(); await videoRef.current.unloadAsync(); }
    setVideoModal(null);
  };

  const pendingCount   = applications.filter(a => a.status === 'pending').length;
  const acceptedCount  = applications.filter(a => a.status === 'accepted').length;

  // ── Application card ──────────────────────────────────────────────────────
  const renderApplication = ({ item, index }: { item: Application; index: number }) => {
    const cl         = item.clipper;
    const hasNGN     = (item.proposedRateNGN  || 0) > 0;
    const hasUSDT    = (item.proposedRateUSDT || 0) > 0;
    const isPending  = item.status === 'pending';
    const isSelected = item.status === 'selected';
    const isAccepted = item.status === 'accepted';
    const statusCfg  = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

    // Countdown only for the selected card
    const countdown = isSelected
      ? (item.offerExpiresAt && new Date(item.offerExpiresAt) > new Date()
          ? (() => {
              const diff = new Date(item.offerExpiresAt!).getTime() - Date.now();
              if (diff <= 0) return 'Expired';
              const h = Math.floor(diff / 3_600_000);
              const m = Math.floor((diff % 3_600_000) / 60_000);
              const s = Math.floor((diff % 60_000) / 1_000);
              return `${h}h ${m}m ${s}s`;
            })()
          : 'Expired')
      : null;

    // Is this card's select blocked because another active offer exists?
    const blocked = isPending && !!activeOffer;

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <View style={[
          S.card,
          isSelected && { borderColor: C.amber,   borderWidth: 2 },
          isAccepted && { borderColor: C.emerald,  borderWidth: 2 },
        ]}>

          {/* Header row */}
          <View style={S.cardHeader}>
            <View style={S.avatarWrap}>
              <Image
                source={{ uri: toFullUrl(cl.profileImage) || `https://i.pravatar.cc/80?u=${cl._id}` }}
                style={S.avatar}
              />
              <View style={S.onlineDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.creatorName}>{cl.firstName} {cl.lastName}</Text>
              <View style={S.metaRow}>
                <Ionicons name="star" size={12} color={C.amber} />
                <Text style={S.ratingTxt}>{cl.rating?.toFixed(1) || '0.0'}</Text>
                {cl.categories?.[0] && (
                  <View style={S.categoryChip}><Text style={S.categoryChipTxt}>{cl.categories[0]}</Text></View>
                )}
              </View>
              {cl.bio ? <Text style={S.bio} numberOfLines={2}>{cl.bio}</Text> : null}
            </View>
          </View>

          {/* Rate badges */}
          <View style={S.ratesRow}>
            {hasNGN && (
              <View style={[S.rateBadge, { backgroundColor: C.purpleLight, borderColor: '#DDD6FE' }]}>
                <Text style={[S.rateAmount, { color: C.purple }]}>₦{item.proposedRateNGN?.toLocaleString()}</Text>
                <Text style={S.rateCur}>NGN</Text>
                {campaignCurrency === 'NGN' && <Text style={[S.rateTag, { color: C.purple }]}>Campaign rate</Text>}
              </View>
            )}
            {hasUSDT && (
              <View style={[S.rateBadge, { backgroundColor: C.emeraldLight, borderColor: '#A7F3D0' }]}>
                <Text style={[S.rateAmount, { color: C.emerald }]}>{item.proposedRateUSDT}</Text>
                <Text style={S.rateCur}>USDT</Text>
                {campaignCurrency === 'USDT' && <Text style={[S.rateTag, { color: C.emerald }]}>Campaign rate</Text>}
              </View>
            )}
          </View>

          {/* Note */}
          {item.note && (
            <View style={S.noteBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={C.indigo} style={{ marginRight: 7 }} />
              <Text style={S.noteTxt} numberOfLines={3}>{item.note}</Text>
            </View>
          )}

          {/* Sample videos */}
          <View style={S.samplesSection}>
            <Text style={S.sectionLabel}>SAMPLE WORK {cl.sampleVideos?.length ? `· ${cl.sampleVideos.length}` : ''}</Text>
            {cl.sampleVideos?.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {cl.sampleVideos.map((url, i) => (
                  <TouchableOpacity key={i} style={S.videoThumb} onPress={() => openVideo(url)}>
                    <LinearGradient colors={[C.indigoLight, '#DDE1FF']} style={S.videoThumbInner}>
                      <Ionicons name="play-circle" size={32} color={C.indigo} />
                    </LinearGradient>
                    <Text style={S.videoIdx}>#{i + 1}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={S.noSamples}>No samples uploaded yet</Text>
            )}
          </View>

          {/* Action / Status footer */}
          <View style={{ paddingTop: 4 }}>
            {/* PENDING — show select buttons, or blocked message */}
            {isPending && !blocked && (
              <View style={S.actionRow}>
                {hasNGN && (
                  <TouchableOpacity
                    style={[S.btnSelect, { backgroundColor: C.purple }]}
                    onPress={() => initiateSelect(item._id, 'NGN')}
                    disabled={actionLoading === item._id}
                  >
                    {actionLoading === item._id
                      ? <ActivityIndicator color="#FFF" size="small" />
                      : <Text style={S.btnTxt}>Select · ₦{item.proposedRateNGN?.toLocaleString()}</Text>
                    }
                  </TouchableOpacity>
                )}
                {hasUSDT && (
                  <TouchableOpacity
                    style={[S.btnSelect, { backgroundColor: C.emerald }]}
                    onPress={() => initiateSelect(item._id, 'USDT')}
                    disabled={actionLoading === item._id}
                  >
                    {actionLoading === item._id
                      ? <ActivityIndicator color="#FFF" size="small" />
                      : <Text style={S.btnTxt}>Select · {item.proposedRateUSDT} USDT</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* PENDING but another offer is active — show waiting note */}
            {isPending && blocked && (
              <View style={S.blockedNote}>
                <Ionicons name="time-outline" size={14} color={C.textMuted} />
                <Text style={S.blockedTxt}>Available once current offer resolves</Text>
              </View>
            )}

            {/* SELECTED — show countdown */}
            {isSelected && (
              <View style={S.selectedBanner}>
                <View>
                  <Text style={S.selectedBannerTitle}>⏳ Offer Sent — Awaiting Response</Text>
                  {countdown && countdown !== 'Expired' && (
                    <Text style={S.selectedBannerTimer}>Time remaining: {countdown}</Text>
                  )}
                  {countdown === 'Expired' && (
                    <Text style={[S.selectedBannerTimer, { color: C.red }]}>Offer expired — refreshing…</Text>
                  )}
                </View>
              </View>
            )}

            {/* ACCEPTED / DECLINED / EXPIRED / REJECTED */}
            {!isPending && !isSelected && (
              <View style={[S.statusPill, { backgroundColor: statusCfg.bg }]}>
                <View style={[S.statusDot, { backgroundColor: statusCfg.dot }]} />
                <Text style={[S.statusTxt, { color: statusCfg.text }]}>{statusCfg.label}</Text>
                {(item.status === 'declined' || item.status === 'expired') && (
                  <Text style={[S.statusSubTxt, { color: statusCfg.text }]}>· Funds returned to wallet</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={S.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.orange} />

      {/* Header */}
      <Animated.View entering={FadeInUp.duration(350)}>
        <LinearGradient colors={[C.orange, C.orangeDark]} style={S.headerGrad}>
          <View style={S.headerRow}>
            <TouchableOpacity style={S.navBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={S.headerTitle}>Applications</Text>
              {campaignTitle ? <Text style={S.headerSub} numberOfLines={1}>{campaignTitle}</Text> : null}
            </View>
            <View style={S.countBadge}>
              <Text style={S.countTxt}>{applications.length}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={S.statsBanner}>
            {[
              { label: 'Total',    value: applications.length },
              { label: 'Pending',  value: pendingCount        },
              { label: 'Accepted', value: acceptedCount       },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={S.statDiv} />}
                <View style={S.statCell}>
                  <Text style={S.statVal}>{s.value}</Text>
                  <Text style={S.statLbl}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Active offer banner */}
      {activeOffer && (
        <View style={S.activeOfferBanner}>
          <Ionicons name="timer-outline" size={16} color={C.amber} />
          <Text style={S.activeOfferTxt}>
            An offer is pending — waiting for creator's response. Other applicants are on hold.
          </Text>
        </View>
      )}

      {/* Wallet strip */}
      {wallet && (
        <Animated.View entering={FadeInDown.delay(80)} style={S.walletStrip}>
          <View style={S.walletCell}>
            <Text style={S.walletLabel}>NGN Balance</Text>
            <Text style={[S.walletAmt, { color: C.purple }]}>₦{wallet.balance.toLocaleString()}</Text>
          </View>
          <View style={S.walletDiv} />
          <View style={S.walletCell}>
            <Text style={S.walletLabel}>USDT Balance</Text>
            <Text style={[S.walletAmt, { color: C.emerald }]}>${wallet.usdtBalance.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={S.fundBtn} onPress={() => handleFundWallet('NGN')}>
            <Ionicons name="add" size={15} color={C.indigo} />
            <Text style={S.fundTxt}>Fund</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={C.orange} />
          <Text style={S.loadingTxt}>Loading applications…</Text>
        </View>
      ) : (
        <FlatList
          data={applications}
          renderItem={renderApplication}
          keyExtractor={(item) => item._id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchApplications}
          refreshing={loading}
          ListEmptyComponent={
            <View style={S.empty}>
              <View style={[S.emptyIcon, { backgroundColor: C.orangeLight }]}>
                <Ionicons name="people-outline" size={38} color={C.orange} />
              </View>
              <Text style={S.emptyTitle}>No applications yet</Text>
              <Text style={S.emptySub}>Share your campaign to attract creators</Text>
            </View>
          }
        />
      )}

      {/* Video modal */}
      <Modal animationType="fade" transparent visible={!!videoModal} onRequestClose={closeVideoModal}>
        <View style={S.videoModal}>
          <TouchableOpacity style={S.videoClose} onPress={closeVideoModal}>
            <View style={S.videoCloseBtn}>
              <Ionicons name="close" size={22} color="#FFF" />
            </View>
          </TouchableOpacity>
          {videoModal && (
            <Video ref={videoRef} source={{ uri: videoModal }} style={S.videoPlayer}
              useNativeControls resizeMode={ResizeMode.CONTAIN} isLooping={false} shouldPlay
              onError={() => { Alert.alert('Error', 'Failed to load video'); closeVideoModal(); }}
            />
          )}
        </View>
      </Modal>

      {/* Confirm modal */}
      <Modal animationType="slide" transparent visible={!!confirmModal} onRequestClose={() => setConfirmModal(null)}>
        <View style={S.overlay}>
          <View style={S.bottomSheet}>
            <View style={S.sheetHandle} />
            <View style={[S.sheetIconWrap, { backgroundColor: C.indigoLight }]}>
              <Ionicons name="person-circle-outline" size={32} color={C.indigo} />
            </View>
            <Text style={S.sheetTitle}>Send Offer</Text>
            {confirmModal && (
              <>
                <Text style={S.sheetAmountLabel}>You'll lock into escrow</Text>
                <Text style={S.sheetAmount}>
                  {confirmModal.currency === 'NGN'
                    ? `₦${confirmModal.amount.toLocaleString()}`
                    : `${confirmModal.amount} USDT`}
                </Text>
              </>
            )}
            <Text style={S.sheetBody}>
              The creator gets 2 hours to accept or decline.{'\n'}
              Other applicants remain available — if this creator declines or doesn't respond, you can pick someone else and your funds are returned.
            </Text>
            <View style={S.sheetBtns}>
              <TouchableOpacity style={S.sheetBtnGhost} onPress={() => setConfirmModal(null)}>
                <Text style={S.sheetBtnGhostTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.sheetBtnSolid, { backgroundColor: C.indigo }, actionLoading && { opacity: 0.6 }]}
                onPress={confirmSelect}
                disabled={!!actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={S.sheetBtnSolidTxt}>Send Offer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerGrad: { paddingTop: 16, paddingBottom: 0, paddingHorizontal: 18 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 },
  navBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:{ fontSize: 17, fontWeight: '800', color: '#FFF' },
  headerSub:  { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  countTxt:   { fontSize: 13, fontWeight: '800', color: '#FFF' },

  statsBanner:{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 14, marginBottom: 16, flexDirection: 'row' },
  statCell:   { flex: 1, alignItems: 'center' },
  statVal:    { fontSize: 18, fontWeight: '800', color: '#FFF' },
  statLbl:    { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  statDiv:    { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },

  activeOfferBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.amberLight, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  activeOfferTxt: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '500' },

  walletStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: C.borderLight, paddingHorizontal: 18, paddingVertical: 12 },
  walletCell:  { flex: 1 },
  walletLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  walletAmt:   { fontSize: 15, fontWeight: '800' },
  walletDiv:   { width: 1, height: 28, backgroundColor: C.border, marginHorizontal: 14 },
  fundBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.indigoLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#C7D2FE' },
  fundTxt:     { fontSize: 12, fontWeight: '700', color: C.indigo },

  list: { padding: 16, paddingBottom: 60 },

  card: { backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: C.borderLight, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },

  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  avatarWrap: { position: 'relative' },
  avatar:     { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: C.border },
  onlineDot:  { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: C.emerald, borderWidth: 2, borderColor: '#FFF' },
  creatorName:{ fontSize: 15, fontWeight: '800', color: C.textPri, marginBottom: 4 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingTxt:  { fontSize: 12, color: C.amber, fontWeight: '700' },
  categoryChip:   { backgroundColor: C.indigoLight, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  categoryChipTxt:{ fontSize: 10, color: C.indigo, fontWeight: '600' },
  bio:        { fontSize: 13, color: C.textSec, lineHeight: 18, marginTop: 5 },

  ratesRow:   { flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  rateBadge:  { flex: 1, minWidth: 110, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  rateAmount: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  rateCur:    { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5, marginTop: 1 },
  rateTag:    { fontSize: 9, marginTop: 3, fontStyle: 'italic' },

  noteBox:  { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: C.borderLight },
  noteTxt:  { flex: 1, fontSize: 13, color: C.textSec, lineHeight: 19 },

  samplesSection: { marginBottom: 14 },
  sectionLabel:   { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8 },
  videoThumb:     { width: 96, height: 68, marginRight: 10, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  videoThumbInner:{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  videoIdx:       { position: 'absolute', bottom: 4, right: 6, fontSize: 10, color: C.indigo, fontWeight: '800' },
  noSamples:      { fontSize: 13, color: C.textMuted, fontStyle: 'italic', marginTop: 8 },

  actionRow: { gap: 8 },
  btnSelect: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  btnTxt:    { color: '#FFF', fontWeight: '700', fontSize: 14 },

  blockedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  blockedTxt:  { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },

  selectedBanner:      { backgroundColor: C.amberLight, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  selectedBannerTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  selectedBannerTimer: { fontSize: 12, color: '#B45309', marginTop: 3 },

  statusPill:   { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  statusDot:    { width: 7, height: 7, borderRadius: 4 },
  statusTxt:    { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  statusSubTxt: { fontSize: 11, fontWeight: '500' },

  loadingTxt: { color: C.textSec, marginTop: 12, fontSize: 14 },
  empty:      { alignItems: 'center', paddingVertical: 80 },
  emptyIcon:  { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.textPri, marginBottom: 6 },
  emptySub:   { fontSize: 13, color: C.textSec, textAlign: 'center' },

  videoModal:   { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoPlayer:  { width, height: height * 0.72 },
  videoClose:   { position: 'absolute', top: 54, right: 18, zIndex: 10 },
  videoCloseBtn:{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  overlay:          { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  bottomSheet:      { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, alignItems: 'center', borderTopWidth: 1, borderColor: C.borderLight },
  sheetHandle:      { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, marginBottom: 20 },
  sheetIconWrap:    { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  sheetTitle:       { fontSize: 20, fontWeight: '800', color: C.textPri, marginBottom: 6 },
  sheetAmountLabel: { fontSize: 13, color: C.textSec, marginBottom: 4 },
  sheetAmount:      { fontSize: 28, fontWeight: '800', color: C.indigo, marginBottom: 8 },
  sheetBody:        { fontSize: 13, color: C.textSec, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  sheetBtns:        { flexDirection: 'row', gap: 12, width: '100%' },
  sheetBtnGhost:    { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.borderLight, alignItems: 'center' },
  sheetBtnGhostTxt: { color: C.textSec, fontSize: 15, fontWeight: '600' },
  sheetBtnSolid:    { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetBtnSolidTxt: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
