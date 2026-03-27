// app/(dashboard_clipper)/submission-pending/[applicationId].tsx
// Shown after a clipper submits a video — while awaiting advertiser review.
// NO SafeAreaView — _layout.tsx owns safe area + header height padding.
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, StyleSheet, Platform, Modal, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL || '';
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
  !d ? '—' : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const fmtTimeLeft = (d?: string) => {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  if (diff <= 0) return { text: 'Review window closed', expired: true };
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24) return { text: `${hrs}h left for advertiser to review`, expired: false };
  return { text: `${Math.floor(diff / 86_400_000)}d ${hrs % 24}h left for review`, expired: false };
};

const advName = (a?: any) =>
  !a ? 'Advertiser' : a.company || `${a.firstName || ''} ${a.lastName || ''}`.trim();

const STEPS = [
  { key: 'submitted',  label: 'Video Submitted',      icon: 'cloud-upload-outline'     },
  { key: 'reviewing',  label: 'Advertiser Reviewing',  icon: 'eye-outline'              },
  { key: 'decision',   label: 'Decision Made',         icon: 'checkmark-circle-outline' },
  { key: 'paid',       label: 'Payment Released',      icon: 'cash-outline'             },
];

export default function SubmissionPendingScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();

  const [app, setApp]           = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [videoModal, setVideo]  = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) { router.replace('/(auth)/login'); return; }
      try {
        const res  = await fetch(`${API_URL}/applications/${applicationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setApp(data.application || data);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally { setLoading(false); }
    })();
  }, [applicationId]);

  if (loading) return (
    <View style={S.container}>
      <View style={S.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    </View>
  );

  if (!app) return (
    <View style={S.container}>
      <View style={S.center}>
        <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
        <Text style={{ color: '#EF4444', marginTop: 12 }}>Application not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={S.goBackBtn}>
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const videoUrl    = toUrl(app.currentVideoUrl);
  const thumbUrl    = toUrl(app.currentThumbnailUrl);
  const reviewTimer = fmtTimeLeft(app.reviewDeadline);
  const isNGN       = app.paymentCurrency === 'NGN';
  const paySymbol   = isNGN ? '₦' : '$';
  const revCount    = app.revisionCount || 0;
  const revisionsLeft = Math.max(0, 3 - revCount);

  return (
    <View style={S.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <LinearGradient colors={['#4F46E5', '#4338CA', '#312E81']} style={S.header}>
          <TouchableOpacity style={S.hdrBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={S.hdrTitle}>Submission Status</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={{ padding: 16 }}>

          {/* ── Hero status card ── */}
          <View style={S.heroCard}>
            <View style={S.heroIconWrap}>
              <LinearGradient colors={['#EEF2FF', '#C7D2FE']} style={S.heroIconBg}>
                <MaterialCommunityIcons name="clock-check-outline" size={48} color="#4F46E5" />
              </LinearGradient>
            </View>
            <Text style={S.heroTitle}>Awaiting Review</Text>
            <Text style={S.heroSub}>
              Your video has been submitted successfully.{'\n'}
              The advertiser is reviewing your work.
            </Text>
            {reviewTimer && (
              <View style={[S.timerPill, reviewTimer.expired && S.timerPillRed]}>
                <Ionicons name="timer-outline" size={14} color={reviewTimer.expired ? '#EF4444' : '#4F46E5'} />
                <Text style={[S.timerTxt, reviewTimer.expired && { color: '#EF4444' }]}>
                  {reviewTimer.text}
                </Text>
              </View>
            )}
          </View>

          {/* ── Progress steps ── */}
          <View style={S.stepsCard}>
            <Text style={S.stepsTitle}>What happens next</Text>
            {STEPS.map((step, i) => {
              const done    = i === 0; // submitted is always done
              const current = i === 1; // reviewing is current
              return (
                <View key={step.key} style={S.stepRow}>
                  {/* connector line */}
                  <View style={S.stepLeft}>
                    <View style={[S.stepCircle, done && S.stepCircleDone, current && S.stepCircleCurrent]}>
                      <Ionicons
                        name={done ? 'checkmark' : step.icon as any}
                        size={16}
                        color={done || current ? '#FFF' : '#9CA3AF'}
                      />
                    </View>
                    {i < STEPS.length - 1 && (
                      <View style={[S.stepLine, done && S.stepLineDone]} />
                    )}
                  </View>
                  <View style={S.stepContent}>
                    <Text style={[S.stepLabel, done && S.stepLabelDone, current && S.stepLabelCurrent]}>
                      {step.label}
                    </Text>
                    {i === 0 && (
                      <Text style={S.stepSub}>Submitted {fmtDate(app.lastSubmittedAt || app.updatedAt)}</Text>
                    )}
                    {i === 1 && (
                      <Text style={S.stepSub}>The advertiser has up to 120 hours to respond</Text>
                    )}
                    {i === 2 && (
                      <Text style={S.stepSub}>They'll approve, request a revision, or raise a dispute</Text>
                    )}
                    {i === 3 && (
                      <Text style={S.stepSub}>Payment released from escrow to your wallet</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── Campaign + payment summary ── */}
          <View style={S.summaryCard}>
            <Text style={S.summaryTitle}>Your Submission</Text>

            <View style={S.summaryRow}>
              <Text style={S.summaryLbl}>Campaign</Text>
              <Text style={S.summaryVal} numberOfLines={1}>{app.campaign?.title || '—'}</Text>
            </View>
            <View style={S.summaryRow}>
              <Text style={S.summaryLbl}>Advertiser</Text>
              <Text style={S.summaryVal}>{advName(app.campaign?.advertiser)}</Text>
            </View>
            {app.paymentAmount && (
              <View style={S.summaryRow}>
                <Text style={S.summaryLbl}>Agreed Payment</Text>
                <Text style={[S.summaryVal, { color: '#059669', fontWeight: '800' }]}>
                  {paySymbol}{app.paymentAmount.toLocaleString()} {app.paymentCurrency}
                </Text>
              </View>
            )}
            <View style={S.summaryRow}>
              <Text style={S.summaryLbl}>Revisions Used</Text>
              <Text style={[S.summaryVal, revCount > 0 && { color: '#F97316' }]}>
                {revCount}/3 {revisionsLeft > 0 ? `(${revisionsLeft} left)` : '(max reached)'}
              </Text>
            </View>
            <View style={[S.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={S.summaryLbl}>Submitted</Text>
              <Text style={S.summaryVal}>{fmtDate(app.lastSubmittedAt || app.updatedAt)}</Text>
            </View>
          </View>

          {/* ── Escrow notice ── */}
          {app.paymentAmount && (
            <View style={S.escrowBanner}>
              <View style={S.escrowIcon}>
                <Ionicons name="lock-closed" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.escrowTitle}>Payment Secured in Escrow</Text>
                <Text style={S.escrowSub}>
                  {paySymbol}{app.paymentAmount.toLocaleString()} {app.paymentCurrency} is held safely. It will be released to you once the advertiser approves.
                </Text>
              </View>
            </View>
          )}

          {/* ── Submitted video preview ── */}
          {videoUrl && (
            <View style={S.videoSection}>
              <Text style={S.videoSectionTitle}>Your Submitted Video</Text>
              <TouchableOpacity style={S.videoBox} onPress={() => setVideo(true)} activeOpacity={0.85}>
                {thumbUrl ? (
                  <Image source={{ uri: thumbUrl }} style={S.videoThumb} resizeMode="cover" />
                ) : (
                  <View style={S.videoThumbEmpty}>
                    <Ionicons name="videocam" size={32} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={S.videoOverlay}>
                  <View style={S.playBtn}>
                    <Ionicons name="play" size={22} color="#FFF" />
                  </View>
                  <Text style={S.videoTapTxt}>Tap to watch</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ── What to expect info box ── */}
          <View style={S.infoCard}>
            <Text style={S.infoTitle}>What to expect</Text>
            {[
              { icon: 'checkmark-circle-outline', color: '#059669', text: 'If approved — payment is released immediately to your wallet.' },
              { icon: 'refresh-outline',          color: '#F97316', text: `If a revision is requested — you'll get specific feedback and have 48 hours to resubmit. You have ${revisionsLeft} revision${revisionsLeft !== 1 ? 's' : ''} left.` },
              { icon: 'time-outline',             color: '#4F46E5', text: 'If the advertiser doesn\'t respond within 120 hours — payment is automatically released to you.' },
              { icon: 'warning-outline',          color: '#EF4444', text: 'If a dispute is raised — our team reviews and mediates within 24-48 hours.' },
            ].map((item, i) => (
              <View key={i} style={S.infoRow}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
                <Text style={S.infoTxt}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* ── CTA ── */}
          <TouchableOpacity
            style={S.ctaBtn}
            onPress={() => router.replace('/(dashboard_clipper)/my-applications' as any)}
          >
            <Ionicons name="list-outline" size={18} color="#4F46E5" />
            <Text style={S.ctaTxt}>View All My Applications</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* ── Video player modal ── */}
      <Modal visible={videoModal} transparent animationType="fade" onRequestClose={() => setVideo(false)}>
        <View style={S.videoModalBg}>
          <TouchableOpacity style={S.videoModalClose} onPress={() => setVideo(false)}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {videoUrl && (
            <Video
              source={{ uri: videoUrl }}
              style={{ width, height: height * 0.65 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
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
  goBackBtn: { backgroundColor: '#4F46E5', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 16 },

  // paddingTop: 0 — layout body already cleared the ProfileHeader
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 0, paddingBottom: 14 },
  hdrBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  hdrTitle:{ fontSize: 18, fontWeight: '700', color: '#FFF' },

  // ── Hero ──
  heroCard:    { backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  heroIconWrap:{ marginBottom: 16 },
  heroIconBg:  { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  heroTitle:   { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  heroSub:     { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  timerPill:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  timerPillRed:{ backgroundColor: '#FEF2F2' },
  timerTxt:    { fontSize: 13, fontWeight: '600', color: '#4F46E5' },

  // ── Steps ──
  stepsCard:    { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 12 },
  stepsTitle:   { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  stepRow:      { flexDirection: 'row', marginBottom: 0 },
  stepLeft:     { alignItems: 'center', width: 36 },
  stepCircle:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  stepCircleDone:   { backgroundColor: '#059669', borderColor: '#059669' },
  stepCircleCurrent:{ backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  stepLine:     { width: 2, flex: 1, backgroundColor: '#E5E7EB', minHeight: 28, marginVertical: 3 },
  stepLineDone: { backgroundColor: '#059669' },
  stepContent:  { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  stepLabel:    { fontSize: 14, fontWeight: '600', color: '#9CA3AF', marginBottom: 2 },
  stepLabelDone:   { color: '#059669' },
  stepLabelCurrent:{ color: '#4F46E5', fontWeight: '700' },
  stepSub:      { fontSize: 12, color: '#9CA3AF', lineHeight: 17 },

  // ── Summary ──
  summaryCard:  { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  summaryLbl:   { fontSize: 13, color: '#9CA3AF' },
  summaryVal:   { fontSize: 13, fontWeight: '600', color: '#111827', maxWidth: '60%', textAlign: 'right' },

  // ── Escrow ──
  escrowBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#6EE7B7', borderRadius: 16, padding: 14, marginBottom: 12 },
  escrowIcon:   { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  escrowTitle:  { fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 3 },
  escrowSub:    { fontSize: 13, color: '#059669', lineHeight: 18 },

  // ── Video ──
  videoSection:      { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12 },
  videoSectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  videoBox:          { height: 190, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0F172A' },
  videoThumb:        { width: '100%', height: '100%', position: 'absolute' },
  videoThumbEmpty:   { width: '100%', height: '100%', backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  videoOverlay:      { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 18, gap: 6 },
  playBtn:           { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)' },
  videoTapTxt:       { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  // ── Info ──
  infoCard:  { backgroundColor: '#EEF2FF', borderRadius: 16, padding: 16, marginBottom: 14 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#3730A3', marginBottom: 12 },
  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  infoTxt:   { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },

  // ── CTA ──
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#C7D2FE', borderRadius: 14, paddingVertical: 14 },
  ctaTxt: { fontSize: 15, fontWeight: '700', color: '#4F46E5' },

  // ── Modal ──
  videoModalBg:    { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoModalClose: { position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
});