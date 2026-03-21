// app/(dashboard_clipper)/accept-offer/[applicationId].tsx
//
// FIXES vs old version:
//  - "pending" status correctly shows "waiting to be selected" — no broken offer UI
//  - paymentAmount/paymentCurrency undefined until advertiser selects → handled gracefully
//  - "Calculating..." timer only shown when actually selected with offerExpiresAt
//  - Clean purple design matching dashboard
//
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator,
  Alert, StyleSheet, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL    = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS    = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL || '';
const { width }  = Dimensions.get('window');

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

export default function AcceptOfferScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();

  const [app, setApp]         = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [timeLeft, setTimeLeft]   = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.replace('/(auth)/login'); return; }
      const res = await fetch(`${API_URL}/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setApp(data.application || data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load application');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (applicationId) load(); }, [applicationId]);

  // Countdown — only starts when actually selected AND has expiry time
  useEffect(() => {
    if (!app?.offerExpiresAt || app?.status !== 'selected') return;

    const tick = () => {
      const diff = new Date(app.offerExpiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); clearInterval(timerRef.current!); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current!);
  }, [app?.offerExpiresAt, app?.status]);

  const handleAccept = () => {
    const sym    = app.paymentCurrency === 'NGN' ? '₦' : '$';
    const amount = `${sym}${app.paymentAmount?.toLocaleString()} ${app.paymentCurrency}`;
    Alert.alert(
      'Accept Offer',
      `Accept this job for ${amount}?\n\nYou'll have 48 hours to deliver the video after accepting.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: async () => {
          setAccepting(true);
          try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/applications/${applicationId}/accept`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Accept failed');
            Alert.alert('🎉 Accepted!', 'You have 48 hours to submit your video. Go make something great!', [
              { text: 'Submit Video', onPress: () => router.replace({ pathname: '/(dashboard_clipper)/submit-video/[applicationId]', params: { applicationId } } as any) },
              { text: 'Later', onPress: () => router.replace('/(dashboard_clipper)/my-applications' as any) },
            ]);
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to accept offer');
          } finally { setAccepting(false); }
        }},
      ]
    );
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Offer',
      'Declining will let the advertiser select another creator. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await fetch(`${API_URL}/applications/${applicationId}/reject`, {
              method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            router.replace('/(dashboard_clipper)/my-applications' as any);
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed');
          }
        }},
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  if (!app) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={S.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={S.errTxt}>Application not found</Text>
          <TouchableOpacity style={S.backBtn} onPress={() => router.back()}>
            <Text style={S.backBtnTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status     = app.status;
  const isSelected = status === 'selected';
  const isPending  = status === 'pending';
  const isExpired  = isSelected && app.offerExpiresAt && new Date(app.offerExpiresAt) < new Date();
  const thumb      = toUrl(app.campaign?.thumbnailUrl);

  // ── PENDING state — just waiting, not yet selected ──────────────────────────
  if (isPending) {
    return (
      <SafeAreaView style={S.safe}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={S.header}>
            <TouchableOpacity style={S.hdrBack} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={S.hdrTitle}>Application Status</Text>
            <View style={{ width: 40 }} />
          </View>

          {thumb && <Image source={{ uri: thumb }} style={S.heroImg} resizeMode="cover" />}

          <View style={S.body}>
            <Text style={S.campaignTitle}>{app.campaign?.title}</Text>
            <Text style={S.advBy}>by {app.campaign?.advertiser?.company || `${app.campaign?.advertiser?.firstName || ''} ${app.campaign?.advertiser?.lastName || ''}`}</Text>

            {/* Waiting card */}
            <View style={S.waitingCard}>
              <MaterialCommunityIcons name="clock-sand" size={40} color="#F59E0B" />
              <Text style={S.waitingTitle}>Application Submitted</Text>
              <Text style={S.waitingDesc}>
                Your application is with the advertiser. If they select you, you'll receive an offer notification with the payment amount and a 2-hour window to accept.
              </Text>
              <View style={S.waitingDivider} />
              <View style={S.waitingRow}>
                <Text style={S.waitingLbl}>Applied on</Text>
                <Text style={S.waitingVal}>{fmtDate(app.createdAt)}</Text>
              </View>
              <View style={S.waitingRow}>
                <Text style={S.waitingLbl}>Campaign deadline</Text>
                <Text style={S.waitingVal}>{fmtDate(app.campaign?.applicationDeadline)}</Text>
              </View>
              {app.proposedRateNGN && (
                <View style={S.waitingRow}>
                  <Text style={S.waitingLbl}>Your proposed rate</Text>
                  <Text style={S.waitingVal}>₦{app.proposedRateNGN.toLocaleString()} NGN</Text>
                </View>
              )}
              {app.proposedRateUSDT && (
                <View style={S.waitingRow}>
                  <Text style={S.waitingLbl}>Your proposed rate</Text>
                  <Text style={S.waitingVal}>${app.proposedRateUSDT} USDT</Text>
                </View>
              )}
              {app.note && (
                <View style={[S.waitingRow, { flexDirection: 'column', gap: 4 }]}>
                  <Text style={S.waitingLbl}>Your pitch</Text>
                  <Text style={[S.waitingVal, { textAlign: 'left' }]}>"{app.note}"</Text>
                </View>
              )}
            </View>

            {/* How it works */}
            <View style={S.howBox}>
              <Text style={S.howTitle}>What happens next?</Text>
              {[
                ['The advertiser reviews all applicants and selects one creator'],
                ['If selected, you get 2 hours to accept or decline the offer'],
                ['After accepting, you have 48 hours to upload your video'],
                ['Advertiser reviews and pays you on acceptance'],
              ].map((step, i) => (
                <View key={i} style={S.howRow}>
                  <View style={S.howNum}><Text style={S.howNumTxt}>{i + 1}</Text></View>
                  <Text style={S.howTxt}>{step[0]}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={S.backToListBtn} onPress={() => router.back()}>
              <Text style={S.backToListTxt}>Back to Applications</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── SELECTED state — has a real offer ───────────────────────────────────────
  return (
    <SafeAreaView style={S.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient colors={['#7C3AED','#5B21B6']} style={S.header}>
          <TouchableOpacity style={S.hdrBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={S.hdrTitle}>Job Offer</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {thumb && <Image source={{ uri: thumb }} style={S.heroImg} resizeMode="contain" />}

        <View style={S.body}>
          <Text style={S.campaignTitle}>{app.campaign?.title}</Text>
          <Text style={S.advBy}>by {app.campaign?.advertiser?.company || `${app.campaign?.advertiser?.firstName || ''} ${app.campaign?.advertiser?.lastName || ''}`}</Text>

          {/* Amount card */}
          <View style={S.amountCard}>
            <Text style={S.amountLbl}>You've been offered</Text>
            <Text style={S.amountVal}>
              {app.paymentCurrency === 'NGN' ? '₦' : '$'}{app.paymentAmount?.toLocaleString()}
              <Text style={S.amountCur}> {app.paymentCurrency}</Text>
            </Text>
            <Text style={S.amountNote}>Held in escrow — paid on completion</Text>
          </View>

          {/* Countdown */}
          {!isExpired && timeLeft && (
            <View style={S.timerCard}>
              <Ionicons name="timer-outline" size={20} color="#7C3AED" />
              <View style={{ flex: 1 }}>
                <Text style={S.timerLbl}>Time to accept</Text>
                <Text style={S.timerVal}>{timeLeft}</Text>
              </View>
            </View>
          )}
          {isExpired && (
            <View style={[S.timerCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={{ flex: 1, fontSize: 14, color: '#DC2626', fontWeight: '600' }}>
                This offer has expired
              </Text>
            </View>
          )}

          {/* Campaign details */}
          <View style={S.detailsCard}>
            <Text style={S.detailsTitle}>Campaign Details</Text>
            {[
              ['Category',   app.campaign?.category],
              ['Length',     app.campaign?.preferredLength],
              ['Deadline',   fmtDate(app.campaign?.applicationDeadline)],
            ].map(([l, v]) => (
              <View key={l} style={S.detailRow}>
                <Text style={S.detailLbl}>{l}</Text>
                <Text style={S.detailVal}>{v}</Text>
              </View>
            ))}
          </View>

          {/* What you commit to */}
          <View style={S.commitCard}>
            <Text style={S.commitTitle}>By accepting, you commit to:</Text>
            {[
              '📹  Delivering the video within 48 hours',
              '✅  Following the campaign brief and creative direction',
              '🔄  Accepting up to 3 revision requests if needed',
              '⏰  Responding to feedback within reasonable time',
            ].map((t, i) => (
              <Text key={i} style={S.commitItem}>{t}</Text>
            ))}
          </View>

          {/* Actions */}
          {!isExpired && (
            <View style={S.actions}>
              <TouchableOpacity
                style={[S.acceptBtn, accepting && { opacity: 0.6 }]}
                onPress={handleAccept}
                disabled={accepting}
              >
                <LinearGradient colors={['#059669','#047857']} style={S.btnGrad}>
                  {accepting ? <ActivityIndicator color="#FFF" /> : (
                    <><Ionicons name="checkmark-circle" size={20} color="#FFF" /><Text style={S.btnTxt}>Accept Offer</Text></>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={S.declineBtn} onPress={handleDecline}>
                <Text style={S.declineTxt}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: '#F5F5F7' },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errTxt:   { fontSize: 16, color: '#EF4444', marginTop: 12, marginBottom: 20, textAlign: 'center' },
  backBtn:  { backgroundColor: '#7C3AED', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  backBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#7C3AED' },
  hdrBack:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hdrTitle:    { fontSize: 18, fontWeight: '700', color: '#FFF' },
  heroImg:     { width: '100%', height: 200 },
  body:        { padding: 18 },
  campaignTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  advBy:       { fontSize: 13, color: '#9CA3AF', marginBottom: 18 },

  // Pending state
  waitingCard:  { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 20 },
  waitingTitle: { fontSize: 18, fontWeight: '700', color: '#92400E', marginTop: 10, marginBottom: 8 },
  waitingDesc:  { fontSize: 14, color: '#78350F', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  waitingDivider:{ height: 1, backgroundColor: '#FDE68A', width: '100%', marginBottom: 14 },
  waitingRow:   { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 5 },
  waitingLbl:   { fontSize: 13, color: '#92400E' },
  waitingVal:   { fontSize: 13, fontWeight: '600', color: '#78350F', textAlign: 'right', flex: 1, marginLeft: 10 },
  howBox:       { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  howTitle:     { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  howRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  howNum:       { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' },
  howNumTxt:    { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  howTxt:       { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
  backToListBtn:{ paddingVertical: 14, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 14 },
  backToListTxt:{ fontSize: 15, fontWeight: '600', color: '#6B7280' },

  // Selected state
  amountCard:  { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#6EE7B7', borderRadius: 18, padding: 22, alignItems: 'center', marginBottom: 14 },
  amountLbl:   { fontSize: 14, color: '#065F46', marginBottom: 6 },
  amountVal:   { fontSize: 36, fontWeight: '800', color: '#047857' },
  amountCur:   { fontSize: 18, fontWeight: '600', color: '#059669' },
  amountNote:  { fontSize: 12, color: '#6EE7B7', marginTop: 4 },

  timerCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 14, padding: 14, marginBottom: 14 },
  timerLbl:    { fontSize: 12, color: '#7C3AED', marginBottom: 2 },
  timerVal:    { fontSize: 22, fontWeight: '800', color: '#5B21B6' },

  detailsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14 },
  detailsTitle:{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  detailLbl:   { fontSize: 13, color: '#9CA3AF' },
  detailVal:   { fontSize: 13, fontWeight: '600', color: '#1F2937' },

  commitCard:  { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20 },
  commitTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  commitItem:  { fontSize: 13, color: '#4B5563', marginBottom: 8, lineHeight: 18 },

  actions:     { gap: 10 },
  acceptBtn:   { borderRadius: 16, overflow: 'hidden' },
  btnGrad:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  btnTxt:      { fontSize: 17, fontWeight: '700', color: '#FFF' },
  declineBtn:  { paddingVertical: 14, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  declineTxt:  { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
});
