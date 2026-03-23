// app/(dashboard_clipper)/completed/[applicationId].tsx
// NO SafeAreaView — _layout.tsx owns safe area + header height padding
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator,
  Alert, StyleSheet, Share, Dimensions, Modal, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL  = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS  = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL || '';
const { width, height } = Dimensions.get('window');

const toUrl = (p?: string | null) =>
  !p ? null : p.startsWith('http') ? p : `${UPLOADS}${p.startsWith('/') ? p : '/' + p}`;

const getToken = async () => {
  try {
    if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
    return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
  } catch { return null; }
};

const fmtDate = (d?: string) =>
  !d ? '—' : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const advName = (a?: any) =>
  !a ? 'Advertiser' : a.company || `${a.firstName || ''} ${a.lastName || ''}`.trim();

export default function CompletedScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();

  const [app, setApp]         = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [videoModal, setVideoModal] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) { router.replace('/(auth)/login'); return; }
      try {
        const res  = await fetch(`${API_URL}/applications/${applicationId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setApp(data.application || data);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally { setLoading(false); }
    })();
  }, [applicationId]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I just completed a UGC campaign for ${advName(app?.campaign?.advertiser)} on ClippaPay! 🎉`,
      });
    } catch (_) {}
  };

  // ── Loading ──
  if (loading) return (
    <View style={S.container}>
      <View style={S.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    </View>
  );

  // ── Not found ──
  if (!app) return (
    <View style={S.container}>
      <View style={S.center}>
        <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
        <Text style={{ color: '#EF4444', marginTop: 12 }}>Application not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16, backgroundColor: '#7C3AED', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}
        >
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const videoUrl  = toUrl(app.currentVideoUrl);
  const thumbUrl  = toUrl(app.currentThumbnailUrl);
  const campThumb = toUrl(app.campaign?.thumbnailUrl);
  const isNGN     = app.paymentCurrency === 'NGN';
  const sym       = isNGN ? '₦' : '$';
  const amount    = app.paymentAmount;

  return (
    <View style={S.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* ── Success header — paddingTop: 16 only, no extra safe area ── */}
        <LinearGradient colors={['#059669', '#047857', '#065F46']} style={S.successHdr}>
          <TouchableOpacity style={S.hdrBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={S.successBadge}>
            <Ionicons name="trophy" size={32} color="#FCD34D" />
          </View>
          <Text style={S.successTitle}>Job Completed!</Text>
          <Text style={S.successSub}>Payment has been released to your wallet</Text>

          {amount && (
            <View style={S.payCard}>
              <Text style={S.payLbl}>You earned</Text>
              <Text style={S.payAmount}>{sym}{amount.toLocaleString()}</Text>
              <Text style={S.payCur}>{app.paymentCurrency}</Text>
            </View>
          )}
        </LinearGradient>

        <View style={{ padding: 16 }}>

          {/* Campaign info */}
          <View style={S.campCard}>
            {campThumb ? (
              <Image source={{ uri: campThumb }} style={S.campThumb} resizeMode="cover" />
            ) : (
              <View style={[S.campThumb, { backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="briefcase-check-outline" size={28} color="#059669" />
              </View>
            )}
            <View style={S.campInfo}>
              <Text style={S.campTitle} numberOfLines={2}>{app.campaign?.title}</Text>
              <Text style={S.campBy}>by {advName(app.campaign?.advertiser)}</Text>
              <View style={S.campMeta}>
                <View style={S.metaChip}>
                  <Text style={S.metaChipTxt}>{app.campaign?.category}</Text>
                </View>
                <View style={[S.metaChip, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={[S.metaChipTxt, { color: '#059669' }]}>✓ Completed</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Payment details */}
          <View style={S.section}>
            <Text style={S.sectionTitle}>Payment Details</Text>
            {[
              ['Amount',    amount ? `${sym}${amount.toLocaleString()} ${app.paymentCurrency}` : '—'],
              ['Status',    app.escrowReleased ? '✅ Paid to wallet' : '⏳ Processing'],
              ['Completed', fmtDate(app.completedAt)],
              ['Revisions', `${app.revisionCount || 0} revision${(app.revisionCount || 0) !== 1 ? 's' : ''}`],
            ].map(([l, v]) => (
              <View key={l} style={S.infoRow}>
                <Text style={S.infoLbl}>{l}</Text>
                <Text style={S.infoVal}>{v}</Text>
              </View>
            ))}
          </View>

          {/* Submitted video */}
          {videoUrl && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>Your Submitted Video</Text>
              <TouchableOpacity style={S.videoBox} onPress={() => setVideoModal(true)} activeOpacity={0.85}>
                {thumbUrl ? (
                  <Image source={{ uri: thumbUrl }} style={S.videoThumb} resizeMode="cover" />
                ) : (
                  <View style={S.videoThumbEmpty}>
                    <Ionicons name="videocam" size={36} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
                <View style={S.playOverlay}>
                  <View style={S.playCircle}>
                    <Ionicons name="play" size={22} color="#FFF" />
                  </View>
                  <Text style={S.playTxt}>Tap to watch</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={S.shareBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={18} color="#7C3AED" />
                <Text style={S.shareTxt}>Share this achievement</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Campaign brief */}
          {app.campaign?.description && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>Campaign Brief</Text>
              <Text style={S.descTxt}>{app.campaign.description}</Text>
            </View>
          )}

          {/* Key phrases */}
          {(app.campaign?.keyPhrases || []).length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>Key Phrases Used</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {app.campaign.keyPhrases.map((p: string, i: number) => (
                  <View key={i} style={S.phraseChip}>
                    <Text style={S.phraseTxt}>"{p}"</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* CTA buttons */}
          <View style={S.ctaRow}>
            <TouchableOpacity style={S.ctaWallet} onPress={() => router.push('/(dashboard_clipper)/wallet' as any)}>
              <Ionicons name="wallet-outline" size={18} color="#FFF" />
              <Text style={S.ctaTxt}>View Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.ctaBrowse} onPress={() => router.push('/(dashboard_clipper)/join_ugc' as any)}>
              <Ionicons name="search-outline" size={18} color="#7C3AED" />
              <Text style={[S.ctaTxt, { color: '#7C3AED' }]}>Find More Jobs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Video modal */}
      <Modal visible={videoModal} transparent animationType="fade" onRequestClose={() => setVideoModal(false)}>
        <View style={S.modalBg}>
          <TouchableOpacity style={S.modalClose} onPress={() => setVideoModal(false)}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {videoUrl && (
            <Video
              source={{ uri: videoUrl }}
              style={{ width, height: height * 0.65 }}
              useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  // paddingTop: 16 only — layout body already cleared the ProfileHeader
  successHdr:   { paddingTop: 16, paddingBottom: 28, paddingHorizontal: 20, alignItems: 'center' },
  hdrBack:      { position: 'absolute', left: 16, top: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  successBadge: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  successSub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 20 },

  payCard:   { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 28, alignItems: 'center' },
  payLbl:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  payAmount: { fontSize: 36, fontWeight: '800', color: '#FFF' },
  payCur:    { fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  campCard:    { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  campThumb:   { width: 90, height: 90 },
  campInfo:    { flex: 1, padding: 12, gap: 3 },
  campTitle:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  campBy:      { fontSize: 12, color: '#9CA3AF' },
  campMeta:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  metaChip:    { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  metaChipTxt: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  section:      { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  infoLbl:      { fontSize: 13, color: '#9CA3AF' },
  infoVal:      { fontSize: 13, fontWeight: '600', color: '#1F2937', textAlign: 'right', flex: 1, marginLeft: 12 },

  videoBox:       { height: 200, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  videoThumb:     { width: '100%', height: '100%', position: 'absolute' },
  videoThumbEmpty:{ width: '100%', height: '100%', backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  playOverlay:    { alignItems: 'center', gap: 8 },
  playCircle:     { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  playTxt:        { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F5F3FF', borderRadius: 12, paddingVertical: 12 },
  shareTxt: { fontSize: 14, fontWeight: '600', color: '#7C3AED' },

  descTxt:    { fontSize: 14, color: '#374151', lineHeight: 21 },
  phraseChip: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  phraseTxt:  { fontSize: 12, color: '#4F46E5', fontStyle: 'italic' },

  ctaRow:    { flexDirection: 'row', gap: 12, marginTop: 4 },
  ctaWallet: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 14 },
  ctaBrowse: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EDE9FE', borderRadius: 14, paddingVertical: 14 },
  ctaTxt:    { fontSize: 14, fontWeight: '700', color: '#FFF' },

  modalBg:    { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
});