/// app/(dashboard_advertiser)/completed/[campaignId].tsx
// Light theme — mirrors campaigns_hub.tsx aesthetic
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, Modal, SafeAreaView, Dimensions,
  Linking, StatusBar, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';

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

// ─── Design tokens (light — matches campaigns_hub) ────────────────────────────
const C = {
  bg:         '#F5F5F7',
  surface:    '#FFFFFF',
  surfaceHi:  '#F9FAFB',
  border:     '#E5E7EB',
  borderLight:'#F3F4F6',
  indigo:     '#4F46E5',
  indigoDark: '#4F46E5',
  indigoLight:'#EEF2FF',
  orange:     '#F97316',
  emerald:    '#10B981',
  emeraldLight:'#ECFDF5',
  amber:      '#F59E0B',
  amberLight: '#FFFBEB',
  red:        '#EF4444',
  redLight:   '#FEF2F2',
  textPri:    '#111827',
  textSec:    '#6B7280',
  textMuted:  '#9CA3AF',
};

type CompletedCampaignData = {
  _id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  completedAt?: string;
  finalVideo?: { url: string; thumbnailUrl?: string; approvedAt: string };
  selectedClipper?: { _id: string; firstName: string; lastName: string; profileImage: string | null; rating?: number };
  paymentAmount?: number;
  paymentCurrency?: 'NGN' | 'USDT';
  videoSubmissions?: Array<{ _id: string; videoUrl: string; submissionDate: string; status: string; thumbnailUrl?: string }>;
};

const fmtDate = (d?: string) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtCurrency = (amount?: number, currency?: 'NGN' | 'USDT') => {
  if (amount == null) return 'N/A';
  return currency === 'NGN'
    ? `₦${amount.toLocaleString()}`
    : currency === 'USDT'
    ? `${amount.toLocaleString()} USDT`
    : `${amount}`;
};

export default function CompletedCampaignScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router = useRouter();

  const [campaign, setCampaign]     = useState<CompletedCampaignData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [deleting, setDeleting]     = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [videoModalVisible, setVideoModalVisible]           = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl]               = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible]         = useState(false);
  const [downloadSuccessVisible, setDownloadSuccessVisible] = useState(false);
  const videoRef = useRef<Video>(null);
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const fetchCampaignData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { Alert.alert('Session expired', 'Please log in again.'); router.replace('/(auth)/login'); return; }
      const response = await fetch(`${API_URL}/campaigns/${campaignId}/with-submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load');
      const cd = data.campaign;
      if (!cd.finalVideo && cd.videoSubmissions?.length > 0) {
        const approved = cd.videoSubmissions.find((s: any) => s.status === 'approved');
        if (approved) cd.finalVideo = { url: approved.videoUrl, thumbnailUrl: approved.thumbnailUrl, approvedAt: approved.approvedAt || cd.completedAt || new Date().toISOString() };
      }
      setCampaign(cd);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load campaign data');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (campaignId) fetchCampaignData(); }, [campaignId]);

  const openVideo = (url: string) => {
    const full = toFullUrl(url);
    if (full) { setCurrentVideoUrl(full); setVideoModalVisible(true); }
  };

  const closeVideoModal = async () => {
    if (videoRef.current) { await videoRef.current.pauseAsync(); await videoRef.current.unloadAsync(); }
    setVideoModalVisible(false); setCurrentVideoUrl(null);
  };

  const handleDownload = async () => {
    let videoUrl = campaign?.finalVideo?.url;
    if (!videoUrl && campaign?.videoSubmissions?.length) {
      videoUrl = [...campaign.videoSubmissions].sort((a, b) =>
        new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
      )[0].videoUrl;
    }
    if (!videoUrl) { Alert.alert('Error', 'No video available to download'); return; }
    if (!mediaPermission?.granted) {
      const { status } = await requestMediaPermission();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need media library access to save videos.',
          [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]);
        return;
      }
    }
    setDownloading(true);
    try {
      const fullUrl = toFullUrl(videoUrl);
      if (!fullUrl) throw new Error('Invalid video URL');
      const filename = `clippa_${campaign?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'video'}_${Date.now()}.mp4`;
      const fileUri = FileSystem.documentDirectory + filename;
      const result  = await FileSystem.downloadAsync(fullUrl, fileUri);
      if (result.status !== 200) throw new Error(`Download failed (status ${result.status})`);
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync('Clippa Videos', asset, false);
      setDownloadSuccessVisible(true);
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Could not download video. Please try again.');
    } finally { setDownloading(false); }
  };

  const handleDeleteCampaign = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/campaigns/${campaignId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete campaign');
      Alert.alert('Deleted', 'Campaign permanently deleted.',
        [{ text: 'OK', onPress: () => router.replace('/(dashboard_advertiser)/Campaigns') }]);
    } catch (err: any) {
      Alert.alert('Delete Failed', err.message || 'Could not delete campaign.');
      setDeleteModalVisible(false);
    } finally { setDeleting(false); }
  };

  // ── Loading ──
  if (loading) return (
    <View style={[S.safe, S.center, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="dark-content" />
      <ActivityIndicator size="large" color={C.indigo} />
      <Text style={S.loadingTxt}>Loading campaign…</Text>
    </View>
  );

  // ── Not found ──
  if (!campaign) return (
    <View style={[S.safe, S.center, { backgroundColor: C.bg }]}>
      <View style={[S.sheetIconWrap, { backgroundColor: C.redLight }]}>
        <Ionicons name="alert-circle-outline" size={32} color={C.red} />
      </View>
      <Text style={S.errorTxt}>Campaign not found</Text>
      <TouchableOpacity style={S.backBtn} onPress={() => router.back()}>
        <Text style={S.backBtnTxt}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const videoUrl     = campaign.finalVideo?.url
    || (campaign.videoSubmissions?.length
        ? [...campaign.videoSubmissions].sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime())[0].videoUrl
        : null);
  const thumbnailUrl = campaign.finalVideo?.thumbnailUrl;
  const nonApproved  = campaign.videoSubmissions?.filter(s => s.status !== 'approved') || [];

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.indigo} />

      {/* ── Gradient Header ── */}
      <Animated.View entering={FadeInUp.duration(350)}>
        <LinearGradient colors={[C.indigo, C.indigoDark]} style={S.header}>
          <TouchableOpacity style={S.navBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={S.headerTitle} numberOfLines={1}>Campaign Completed</Text>
          <TouchableOpacity style={S.deleteNavBtn} onPress={() => setDeleteModalVisible(true)}>
            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Success banner inside header */}
        <LinearGradient colors={[C.indigo, C.indigoDark]} style={S.successBanner}>
          <View style={S.bannerInner}>
            <View style={S.successIcon}>
              <Ionicons name="checkmark-circle" size={28} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.bannerTitle}>Campaign Complete</Text>
              <Text style={S.bannerSub}>Payment released · {fmtDate(campaign.completedAt || campaign.createdAt)}</Text>
            </View>
            {campaign.paymentAmount != null && (
              <View style={S.paymentBadge}>
                <Text style={S.paymentAmt}>{fmtCurrency(campaign.paymentAmount, campaign.paymentCurrency)}</Text>
                <Text style={S.paymentLbl}>paid</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false} style={{ backgroundColor: C.bg }}>

        {/* ── Final video card ── */}
        <Animated.View entering={FadeInDown.delay(80)} style={S.card}>
          <View style={S.cardHeader}>
            <Ionicons name="film-outline" size={15} color={C.indigo} />
            <Text style={S.cardTitle}>Final Approved Video</Text>
          </View>

          {videoUrl ? (
            <TouchableOpacity style={S.videoPoster} onPress={() => openVideo(videoUrl)}>
              {thumbnailUrl ? (
                <Image source={{ uri: toFullUrl(thumbnailUrl) || '' }} style={S.posterImg} resizeMode="cover" />
              ) : (
                <LinearGradient colors={[C.indigoLight, '#DDE1FF']} style={S.posterPlaceholder}>
                  <Ionicons name="videocam" size={40} color={C.indigo} />
                </LinearGradient>
              )}
              <View style={S.posterOverlay} />
              <View style={S.playCircle}>
                <Ionicons name="play" size={26} color="#FFF" style={{ marginLeft: 3 }} />
              </View>
              <View style={S.posterLabel}>
                <Text style={S.posterLabelTxt}>Tap to watch</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={S.noVideo}>
              <Ionicons name="videocam-off" size={36} color={C.textMuted} />
              <Text style={S.noVideoTxt}>No video available</Text>
            </View>
          )}

          <TouchableOpacity
            style={[S.downloadBtn, (!videoUrl || downloading) && S.btnDisabled]}
            onPress={handleDownload}
            disabled={!videoUrl || downloading}
          >
            {downloading
              ? <ActivityIndicator color="#FFF" size="small" />
              : <>
                  <Ionicons name="cloud-download-outline" size={18} color="#FFF" />
                  <Text style={S.downloadTxt}>Download to Device</Text>
                </>
            }
          </TouchableOpacity>
        </Animated.View>

        {/* ── Campaign details ── */}
        <Animated.View entering={FadeInDown.delay(140)} style={S.card}>
          <View style={S.cardHeader}>
            <Ionicons name="document-text-outline" size={15} color={C.indigo} />
            <Text style={S.cardTitle}>Campaign Details</Text>
          </View>
          <Text style={S.campTitle}>{campaign.title}</Text>
          <View style={S.categoryPill}>
            <Text style={S.categoryPillTxt}>{campaign.category}</Text>
          </View>
          <View style={S.divider} />
          {[
            { label: 'Created',   value: fmtDate(campaign.createdAt)   },
            { label: 'Completed', value: fmtDate(campaign.completedAt) },
          ].map(({ label, value }) => (
            <View key={label} style={S.infoRow}>
              <Text style={S.infoLbl}>{label}</Text>
              <Text style={S.infoVal}>{value}</Text>
            </View>
          ))}
          <View style={S.infoRow}>
            <Text style={S.infoLbl}>Payment</Text>
            <Text style={[S.infoVal, { color: C.emerald, fontWeight: '800', fontSize: 16 }]}>
              {fmtCurrency(campaign.paymentAmount, campaign.paymentCurrency)}
            </Text>
          </View>
        </Animated.View>

        {/* ── Creator ── */}
        {campaign.selectedClipper && (
          <Animated.View entering={FadeInDown.delay(200)} style={S.card}>
            <View style={S.cardHeader}>
              <Ionicons name="person-outline" size={15} color={C.indigo} />
              <Text style={S.cardTitle}>Creator</Text>
            </View>
            <View style={S.creatorRow}>
              <Image
                source={{ uri: toFullUrl(campaign.selectedClipper.profileImage) || `https://i.pravatar.cc/80?u=${campaign.selectedClipper._id}` }}
                style={S.creatorAvatar}
              />
              <View>
                <Text style={S.creatorName}>
                  {campaign.selectedClipper.firstName} {campaign.selectedClipper.lastName}
                </Text>
                <View style={S.ratingRow}>
                  <Ionicons name="star" size={13} color={C.amber} />
                  <Text style={S.ratingTxt}>{campaign.selectedClipper.rating?.toFixed(1) || '0.0'}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Brief ── */}
        <Animated.View entering={FadeInDown.delay(260)} style={S.card}>
          <View style={S.cardHeader}>
            <Ionicons name="bulb-outline" size={15} color={C.indigo} />
            <Text style={S.cardTitle}>Campaign Brief</Text>
          </View>
          <Text style={S.description}>{campaign.description || 'No description provided'}</Text>
        </Animated.View>

        {/* ── Previous submissions ── */}
        {nonApproved.length > 0 && (
          <Animated.View entering={FadeInDown.delay(320)} style={S.card}>
            <View style={S.cardHeader}>
              <Ionicons name="layers-outline" size={15} color={C.indigo} />
              <Text style={S.cardTitle}>Previous Submissions</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {nonApproved.map((s) => (
                <TouchableOpacity key={s._id} style={S.subThumb} onPress={() => openVideo(s.videoUrl)}>
                  <LinearGradient colors={[C.indigoLight, '#DDE1FF']} style={S.subThumbInner}>
                    <Ionicons name="play-circle-outline" size={28} color={C.indigo} />
                  </LinearGradient>
                  <Text style={S.subDate}>{new Date(s.submissionDate).toLocaleDateString()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* ── Video modal ── */}
      <Modal animationType="fade" transparent visible={videoModalVisible} onRequestClose={closeVideoModal}>
        <View style={S.videoModal}>
          <TouchableOpacity style={S.videoClose} onPress={closeVideoModal}>
            <View style={S.videoCloseBtn}>
              <Ionicons name="close" size={22} color="#FFF" />
            </View>
          </TouchableOpacity>
          {currentVideoUrl && (
            <Video ref={videoRef} source={{ uri: currentVideoUrl }} style={S.videoPlayer}
              useNativeControls resizeMode={ResizeMode.CONTAIN} isLooping={false} shouldPlay
              onError={() => { Alert.alert('Error', 'Failed to load video'); closeVideoModal(); }}
            />
          )}
        </View>
      </Modal>

      {/* ── Delete modal ── */}
      <Modal animationType="slide" transparent visible={deleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={S.overlay}>
          <Animated.View entering={ZoomIn.duration(250)} style={S.bottomSheet}>
            <View style={S.sheetHandle} />
            <View style={[S.sheetIconWrap, { backgroundColor: C.redLight }]}>
              <Ionicons name="warning-outline" size={30} color={C.red} />
            </View>
            <Text style={S.sheetTitle}>Delete Campaign?</Text>
            <Text style={S.sheetBody}>
              This campaign and its data will be permanently removed. Your downloaded videos remain on your device.
            </Text>
            <View style={S.sheetBtns}>
              <TouchableOpacity style={S.sheetBtnGhost} onPress={() => setDeleteModalVisible(false)}>
                <Text style={S.sheetBtnGhostTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.sheetBtnSolid, { backgroundColor: C.red }, deleting && S.btnDisabled]}
                onPress={handleDeleteCampaign} disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={S.sheetBtnSolidTxt}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Download success modal ── */}
      <Modal animationType="slide" transparent visible={downloadSuccessVisible} onRequestClose={() => setDownloadSuccessVisible(false)}>
        <View style={S.overlay}>
          <Animated.View entering={ZoomIn.duration(250)} style={S.bottomSheet}>
            <View style={S.sheetHandle} />
            <View style={[S.sheetIconWrap, { backgroundColor: C.emeraldLight }]}>
              <Ionicons name="checkmark-circle" size={36} color={C.emerald} />
            </View>
            <Text style={S.sheetTitle}>Downloaded!</Text>
            <Text style={S.sheetBody}>Video saved to your device's gallery in the Clippa Videos album.</Text>
            <TouchableOpacity
              style={[S.sheetBtnSolid, { backgroundColor: C.emerald, width: '100%' }]}
              onPress={() => setDownloadSuccessVisible(false)}
            >
              <Text style={S.sheetBtnSolidTxt}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F5F5F7' },
  center: { justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 0 : 12, paddingBottom: 12,
  },
  navBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  deleteNavBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#FFF' },

  // Success banner
  successBanner: { paddingHorizontal: 16, paddingBottom: 20 },
  bannerInner:   { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  successIcon:   { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle:   { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  bannerSub:     { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  paymentBadge:  { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  paymentAmt:    { fontSize: 14, fontWeight: '800', color: '#FFF' },
  paymentLbl:    { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  scroll: { padding: 16, paddingBottom: 40 },

  // Cards
  card:       { backgroundColor: '#FFF', borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  cardTitle:  { fontSize: 13, fontWeight: '700', color: '#374151' },

  // Video poster
  videoPoster:      { height: 200, borderRadius: 14, overflow: 'hidden', marginBottom: 14, position: 'relative' },
  posterImg:        { width: '100%', height: '100%' },
  posterPlaceholder:{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  posterOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)' },
  playCircle:       { position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(99,102,241,0.85)', justifyContent: 'center', alignItems: 'center', top: '50%', left: '50%', transform: [{ translateX: -29 }, { translateY: -29 }] },
  posterLabel:      { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.35)' },
  posterLabelTxt:   { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  noVideo:          { height: 160, borderRadius: 14, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginBottom: 14, gap: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  noVideoTxt:       { color: '#9CA3AF', fontSize: 14 },

  downloadBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: 12 },
  downloadTxt:  { color: '#FFF', fontSize: 14, fontWeight: '700' },
  btnDisabled:  { opacity: 0.4 },

  // Details
  campTitle:       { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  categoryPill:    { alignSelf: 'flex-start', backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14 },
  categoryPillTxt: { fontSize: 12, fontWeight: '600', color: '#6366F1' },
  divider:         { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
  infoRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLbl:         { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  infoVal:         { fontSize: 13, color: '#111827', fontWeight: '600' },

  // Creator
  creatorRow:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  creatorAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#E5E7EB' },
  creatorName:   { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  ratingRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingTxt:     { fontSize: 13, color: '#F59E0B', fontWeight: '700' },

  description: { fontSize: 14, color: '#6B7280', lineHeight: 22 },

  // Submissions
  subThumb:      { width: 110, height: 76, marginRight: 10, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  subThumbInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  subDate:       { position: 'absolute', bottom: 4, left: 5, fontSize: 9, color: '#6B7280', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },

  // Video modal
  videoModal:   { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoPlayer:  { width, height: height * 0.72 },
  videoClose:   { position: 'absolute', top: 54, right: 18, zIndex: 10 },
  videoCloseBtn:{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // Bottom sheets
  overlay:          { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet:      { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, alignItems: 'center', borderTopWidth: 1, borderColor: '#F3F4F6' },
  sheetHandle:      { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 20 },
  sheetIconWrap:    { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  sheetTitle:       { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  sheetBody:        { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  sheetBtns:        { flexDirection: 'row', gap: 12, width: '100%' },
  sheetBtnGhost:    { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  sheetBtnGhostTxt: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
  sheetBtnSolid:    { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetBtnSolidTxt: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  loadingTxt: { color: '#6B7280', marginTop: 12, fontSize: 14 },
  errorTxt:   { fontSize: 16, color: '#EF4444', marginTop: 12, marginBottom: 20 },
  backBtn:    { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#EEF2FF', borderRadius: 12 },
  backBtnTxt: { color: '#6366F1', fontWeight: '600' },
});