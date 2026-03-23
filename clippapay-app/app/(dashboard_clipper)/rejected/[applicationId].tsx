// app/(dashboard_advertiser)/rejected/[applicationId].tsx
// Shown when a clipper's application was not selected by the advertiser.
// NO SafeAreaView — _layout.tsx owns safe area + header height padding.
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, StyleSheet, Dimensions, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL   = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS   = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL || '';
const { width } = Dimensions.get('window');

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

const TIPS = [
  { icon: 'videocam-outline',     text: 'Upload high-quality sample videos to stand out on your profile' },
  { icon: 'document-text-outline',text: 'Write a compelling pitch note when you apply to campaigns'       },
  { icon: 'star-outline',         text: 'Build your rating by completing smaller jobs first'              },
  { icon: 'time-outline',         text: 'Apply early — advertisers often pick from the first few applicants' },
];

export default function RejectedScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();

  const [app, setApp]         = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  // ── Loading ──
  if (loading) return (
    <View style={S.container}>
      <View style={S.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    </View>
  );

  // ── Not found ──
  if (!app) return (
    <View style={S.container}>
      <View style={S.center}>
        <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
        <Text style={S.errTxt}>Application not found</Text>
        <TouchableOpacity style={S.errBtn} onPress={() => router.back()}>
          <Text style={S.errBtnTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const thumb    = toUrl(app.campaign?.thumbnailUrl);
  const advName  = app.campaign?.advertiser?.company
    || `${app.campaign?.advertiser?.firstName || ''} ${app.campaign?.advertiser?.lastName || ''}`.trim()
    || 'the advertiser';

  return (
    <View style={S.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* ── Header band ── */}
        <LinearGradient colors={['#6366F1', '#4F46E5', '#4338CA']} style={S.headerBand}>
          <TouchableOpacity style={S.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={{ width: 36 }} />
        </LinearGradient>

        {/* ── Status card — overlaps the header band ── */}
        <View style={S.statusCardWrap}>
          <View style={S.statusCard}>
            <View style={S.statusIconWrap}>
              <MaterialCommunityIcons name="account-remove-outline" size={36} color="#6B7280" />
            </View>
            <Text style={S.statusTitle}>Not Selected</Text>
            <Text style={S.statusSub}>
              {advName} has moved forward with another creator for this campaign.
            </Text>

            {/* Divider */}
            <View style={S.divider} />

            {/* Meta rows */}
            <View style={S.metaGrid}>
              {[
                { label: 'Applied',    value: fmtDate(app.createdAt)                   },
                { label: 'Campaign',   value: app.campaign?.title || '—'               },
                { label: 'Category',   value: app.campaign?.category || '—'            },
                { label: 'Advertiser', value: advName                                  },
                app.proposedRateNGN
                  ? { label: 'Your Rate', value: `₦${app.proposedRateNGN.toLocaleString()} NGN` }
                  : app.proposedRateUSDT
                  ? { label: 'Your Rate', value: `$${app.proposedRateUSDT} USDT`       }
                  : null,
              ].filter(Boolean).map(({ label, value }: any) => (
                <View key={label} style={S.metaRow}>
                  <Text style={S.metaLbl}>{label}</Text>
                  <Text style={S.metaVal} numberOfLines={1}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={S.body}>

          {/* ── Campaign thumbnail + title ── */}
          {thumb && (
            <View style={S.campCard}>
              <Image source={{ uri: thumb }} style={S.campThumb} resizeMode="cover" />
              <View style={S.campOverlay} />
              <View style={S.campLabel}>
                <Text style={S.campLabelTxt} numberOfLines={2}>{app.campaign?.title}</Text>
                <Text style={S.campLabelSub}>by {advName}</Text>
              </View>
            </View>
          )}

          {/* ── What this means ── */}
          <View style={S.infoCard}>
            <View style={S.infoCardHeader}>
              <Ionicons name="information-circle-outline" size={18} color="#6366F1" />
              <Text style={S.infoCardTitle}>What this means</Text>
            </View>
            <Text style={S.infoCardBody}>
              Being not selected doesn't mean your application was poor — advertisers choose based on their specific creative vision. Your application has been closed and{' '}
              <Text style={{ fontWeight: '700', color: '#111827' }}>no charge was made</Text> to either party.
            </Text>
          </View>

          {/* ── Your pitch (if any) ── */}
          {app.note && (
            <View style={S.pitchCard}>
              <Text style={S.pitchLabel}>Your Pitch</Text>
              <Text style={S.pitchText}>"{app.note}"</Text>
            </View>
          )}

          {/* ── Tips to improve ── */}
          <View style={S.tipsCard}>
            <View style={S.tipsHeader}>
              <Ionicons name="bulb-outline" size={17} color="#F59E0B" />
              <Text style={S.tipsTitle}>Tips to improve your chances</Text>
            </View>
            {TIPS.map((tip, i) => (
              <View key={i} style={S.tipRow}>
                <View style={S.tipIconWrap}>
                  <Ionicons name={tip.icon as any} size={15} color="#6366F1" />
                </View>
                <Text style={S.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>

          {/* ── Stats strip ── */}
          <View style={S.statsStrip}>
            {[
              { label: 'Total Applied',  value: '—', icon: 'document-text-outline' as const, color: '#6366F1' },
              { label: 'Completed Jobs', value: '—', icon: 'trophy-outline'         as const, color: '#10B981' },
              { label: 'Success Rate',   value: '—', icon: 'trending-up-outline'    as const, color: '#F59E0B' },
            ].map(({ label, value, icon, color }) => (
              <View key={label} style={S.statCell}>
                <Ionicons name={icon} size={18} color={color} />
                <Text style={[S.statVal, { color }]}>{value}</Text>
                <Text style={S.statLbl}>{label}</Text>
              </View>
            ))}
          </View>

          {/* ── CTAs ── */}
          <TouchableOpacity
            style={S.primaryBtn}
            onPress={() => router.push('/(dashboard_clipper)/join_ugc' as any)}
            activeOpacity={0.88}
          >
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={S.primaryBtnGrad}>
              <Ionicons name="search-outline" size={18} color="#FFF" />
              <Text style={S.primaryBtnTxt}>Browse More Campaigns</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={S.secondaryBtn}
            onPress={() => router.replace('/(dashboard_clipper)/my-applications' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="list-outline" size={17} color="#6366F1" />
            <Text style={S.secondaryBtnTxt}>Back to My Applications</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errTxt:    { fontSize: 16, color: '#EF4444', marginTop: 12, marginBottom: 20, textAlign: 'center' },
  errBtn:    { backgroundColor: '#6366F1', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  errBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  // Header band — paddingTop: 16, no extra safe area
  headerBand: {
    paddingTop: 16, paddingBottom: 52,
    paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Status card overlaps the header band bottom
  statusCardWrap: {
    marginHorizontal: 16,
    marginTop: -40,
    marginBottom: 4,
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  statusIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  statusTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  statusSub:   { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 18 },

  divider: { height: 1, backgroundColor: '#F3F4F6', width: '100%', marginBottom: 16 },

  metaGrid: { width: '100%', gap: 2 },
  metaRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  metaLbl:  { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  metaVal:  { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'right', marginLeft: 12 },

  body: { paddingHorizontal: 16, paddingTop: 16 },

  // Campaign thumbnail card
  campCard: {
    height: 160, borderRadius: 16, overflow: 'hidden',
    marginBottom: 14, position: 'relative',
  },
  campThumb:   { width: '100%', height: '100%' },
  campOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  campLabel:   { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  campLabelTxt:{ fontSize: 16, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  campLabelSub:{ fontSize: 12, color: 'rgba(255,255,255,0.75)' },

  // Info card
  infoCard: {
    backgroundColor: '#EEF2FF', borderRadius: 14,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  infoCardTitle:  { fontSize: 14, fontWeight: '700', color: '#3730A3' },
  infoCardBody:   { fontSize: 13, color: '#4338CA', lineHeight: 20 },

  // Pitch card
  pitchCard: {
    backgroundColor: '#FFF', borderRadius: 14,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  pitchLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  pitchText:  { fontSize: 14, color: '#374151', lineHeight: 21, fontStyle: 'italic' },

  // Tips card
  tipsCard: {
    backgroundColor: '#FFF', borderRadius: 14,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  tipsTitle:  { fontSize: 14, fontWeight: '700', color: '#111827' },
  tipRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  tipIconWrap:{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  tipText:    { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },

  // Stats strip
  statsStrip: {
    flexDirection: 'row', backgroundColor: '#FFF',
    borderRadius: 14, padding: 16, marginBottom: 18,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statVal:  { fontSize: 16, fontWeight: '800' },
  statLbl:  { fontSize: 10, color: '#9CA3AF', fontWeight: '500', textAlign: 'center' },

  // CTAs
  primaryBtn: {
    borderRadius: 14, overflow: 'hidden', marginBottom: 10,
  },
  primaryBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 15,
  },
  primaryBtnTxt: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
    backgroundColor: '#EEF2FF', borderRadius: 14,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  secondaryBtnTxt: { fontSize: 15, fontWeight: '600', color: '#6366F1' },
});