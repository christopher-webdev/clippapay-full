// app/(dashboard_clipper)/my-applications.tsx
// Rebuilt with:
//  - Clean purple/indigo design matching rest of clipper dashboard
//  - Status-grouped tabs (All / Active / Completed / Rejected)
//  - "Pending" status correctly shows "Waiting for selection" — no confusing offer UI
//  - Clear CTAs per status
//  - Earnings summary strip at top
//  - NO SafeAreaView — _layout.tsx owns safe area + header height padding
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator,
  RefreshControl, StyleSheet, Dimensions, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL      = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_URL  = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL || '';
const { width }    = Dimensions.get('window');

const toUrl = (p?: string | null) =>
  !p ? null : p.startsWith('http') ? p : `${UPLOADS_URL}${p.startsWith('/') ? p : '/' + p}`;

type Application = {
  _id: string;
  status: string;
  proposedRateNGN?: number;
  proposedRateUSDT?: number;
  paymentAmount?: number;
  paymentCurrency?: 'NGN' | 'USDT';
  offerExpiresAt?: string;
  submissionDeadline?: string;
  createdAt: string;
  completedAt?: string;
  revisionCount?: number;
  lastFeedback?: string;
  currentVideoUrl?: string;
  escrowReleased?: boolean;
  campaign?: {
    _id: string;
    title: string;
    thumbnailUrl?: string | null;
    category: string;
    preferredLength: string;
    applicationDeadline: string;
    advertiser: { firstName?: string; lastName?: string; company?: string };
  };
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; icon: string; cta: string }> = {
  pending:           { label: 'Applied',          color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline',               cta: 'Waiting for advertiser selection' },
  selected:          { label: 'Selected! 🎉',     color: '#3B82F6', bg: '#EFF6FF', icon: 'star-outline',              cta: 'Review & accept your offer'       },
  accepted:          { label: 'Accepted',          color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle-outline',  cta: 'Submit your video'                },
  submitted:         { label: 'Under Review',      color: '#8B5CF6', bg: '#F5F3FF', icon: 'eye-outline',              cta: 'Waiting for advertiser review'    },
  revision_requested:{ label: 'Revision Needed',   color: '#F97316', bg: '#FFF7ED', icon: 'refresh-outline',          cta: 'View feedback & resubmit'         },
  approved:          { label: 'Completed ✓',       color: '#059669', bg: '#ECFDF5', icon: 'trophy-outline',           cta: 'View completed job'               },
  rejected:          { label: 'Not Selected',      color: '#6B7280', bg: '#F9FAFB', icon: 'close-circle-outline',     cta: 'View details'                     },
  expired:           { label: 'Offer Expired',     color: '#9CA3AF', bg: '#F3F4F6', icon: 'time-outline',             cta: 'View details'                     },
  declined:          { label: 'You Declined',      color: '#9CA3AF', bg: '#F3F4F6', icon: 'close-circle-outline',     cta: 'View details'                     },
  withdrawn:         { label: 'Withdrawn',         color: '#6B7280', bg: '#F9FAFB', icon: 'arrow-undo-outline',       cta: 'View details'                     },
  disputed:          { label: 'Disputed',          color: '#DC2626', bg: '#FEF2F2', icon: 'warning-outline',          cta: 'View dispute'                     },
  disputed_resolved: { label: 'Dispute Resolved', color: '#059669', bg: '#ECFDF5', icon: 'shield-checkmark-outline',  cta: 'View details'                    },
};

const TABS = [
  { key: 'all',       label: 'All'    },
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Done'   },
  { key: 'other',     label: 'Closed' },
];

const ACTIVE_STATUSES    = ['selected', 'accepted', 'submitted', 'revision_requested'];
const COMPLETED_STATUSES = ['approved'];
const OTHER_STATUSES     = ['rejected', 'expired', 'declined', 'withdrawn', 'disputed', 'disputed_resolved'];

const getToken = async () => {
  try {
    if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
    return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
  } catch { return null; }
};

const fmtDate = (d?: string) =>
  !d ? '—' : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const advName = (a?: Application['campaign']) =>
  !a ? '' : a.advertiser?.company || `${a.advertiser?.firstName || ''} ${a.advertiser?.lastName || ''}`.trim();

export default function MyApplicationsScreen() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [tab, setTab]                   = useState('all');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.replace('/(auth)/login'); return; }
      const res = await fetch(`${API_URL}/applications/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setApplications(data.applications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const navigate = (item: Application) => {
    const p = (pathname: string, params = {}) =>
      router.push({ pathname, params: { applicationId: item._id, ...params } } as any);
    switch (item.status) {
      case 'selected':           return p('/(dashboard_clipper)/accept-offer/[applicationId]');
      case 'accepted':           return p('/(dashboard_clipper)/submit-video/[applicationId]');
      case 'revision_requested': return p('/(dashboard_clipper)/review-revisions/[applicationId]');
      case 'submitted':          return  p('/(dashboard_clipper)/submission-pending/[applicationId]');
      case 'approved':           return p('/(dashboard_clipper)/completed/[applicationId]');
      // declined/expired — open accept-offer which shows the correct ended state
      case 'declined':           return p('/(dashboard_clipper)/accept-offer/[applicationId]');
      case 'expired':            return p('/(dashboard_clipper)/accept-offer/[applicationId]');
      case 'disputed_resolved':    return p('/(dashboard_clipper)/completed/[applicationId]');
      case 'rejected':             return p('/(dashboard_clipper)/rejected/[applicationId]');
      default:                   return p('/(dashboard_clipper)/accept-offer/[applicationId]');

    }
  };

  const filtered = applications.filter((a) => {
    if (tab === 'all')       return true;
    if (tab === 'active')    return ACTIVE_STATUSES.includes(a.status) || a.status === 'pending';
    if (tab === 'completed') return COMPLETED_STATUSES.includes(a.status);
    return OTHER_STATUSES.includes(a.status);
  });

  // Derived stats
  const totalEarned  = applications.filter(a => a.status === 'approved').reduce((s, a) => s + (a.paymentAmount || 0), 0);
  const activeCount  = applications.filter(a => [...ACTIVE_STATUSES, 'pending'].includes(a.status)).length;
  const actionNeeded = applications.filter(a => ['selected', 'revision_requested'].includes(a.status)).length;

  const counts: Record<string, number> = {
    all:       applications.length,
    active:    applications.filter(a => [...ACTIVE_STATUSES, 'pending'].includes(a.status)).length,
    completed: applications.filter(a => COMPLETED_STATUSES.includes(a.status)).length,
    other:     applications.filter(a => OTHER_STATUSES.includes(a.status)).length,
  };

  const renderItem = ({ item }: { item: Application }) => {
    const cfg         = STATUS[item.status] || STATUS.pending;
    const img         = toUrl(item.campaign?.thumbnailUrl);
    const isSelected  = item.status === 'selected';
    const needsAction = ['selected', 'accepted', 'revision_requested'].includes(item.status);
    const offerExpired = isSelected && item.offerExpiresAt && new Date(item.offerExpiresAt) < new Date();

    return (
      <TouchableOpacity
        style={[S.card, needsAction && !offerExpired && S.cardActive]}
        onPress={() => navigate(item)}
        activeOpacity={0.88}
      >
        {needsAction && !offerExpired && <View style={S.urgencyBar} />}

        <View style={S.cardInner}>
          {/* Thumbnail */}
          <View style={S.thumbWrap}>
            {img ? (
              <Image source={{ uri: img }} style={S.thumb} resizeMode="cover" />
            ) : (
              <View style={[S.thumb, S.thumbPlaceholder]}>
                <MaterialCommunityIcons name="briefcase-outline" size={24} color="#C4B5FD" />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={S.cardContent}>
            <View style={S.cardTopRow}>
              <Text style={S.cardTitle} numberOfLines={2}>
                {item.campaign?.title || 'Campaign'}
              </Text>
              <View style={[S.statusBadge, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
                <Text style={[S.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>

            <Text style={S.advName} numberOfLines={1}>by {advName(item.campaign)}</Text>

            {/* Rate / payment */}
            <View style={S.rateRow}>
              {item.paymentAmount ? (
                <Text style={S.rateMain}>
                  {item.paymentCurrency === 'NGN' ? '₦' : '$'}{item.paymentAmount.toLocaleString()} {item.paymentCurrency}
                </Text>
              ) : (
                <>
                  {item.proposedRateNGN  && <Text style={S.rateSub}>₦{item.proposedRateNGN.toLocaleString()}</Text>}
                  {item.proposedRateUSDT && <Text style={S.rateSub}>${item.proposedRateUSDT} USDT</Text>}
                </>
              )}
              <View style={S.catChip}>
                <Text style={S.catTxt}>{item.campaign?.category}</Text>
              </View>
            </View>

            {/* Status-specific info line */}
            {item.status === 'pending' && (
              <Text style={S.infoLine}>
                <Ionicons name="hourglass-outline" size={12} color="#9CA3AF" /> Applied {fmtDate(item.createdAt)} · Waiting for selection
              </Text>
            )}
            {isSelected && !offerExpired && item.offerExpiresAt && (
              <Text style={[S.infoLine, { color: '#3B82F6' }]}>
                ⏰ Offer expires {fmtDate(item.offerExpiresAt)} — accept now!
              </Text>
            )}
            {isSelected && offerExpired && (
              <Text style={[S.infoLine, { color: '#EF4444' }]}>⏰ Offer expired</Text>
            )}
            {item.status === 'accepted' && item.submissionDeadline && (
              <Text style={[S.infoLine, { color: '#F97316' }]}>
                📅 Submit by {fmtDate(item.submissionDeadline)}
              </Text>
            )}
            {item.status === 'revision_requested' && item.lastFeedback && (
              <Text style={[S.infoLine, { color: '#F97316' }]} numberOfLines={2}>
                ✏️ Feedback: "{item.lastFeedback}"
              </Text>
            )}
            {item.status === 'submitted' && (
              <Text style={[S.infoLine, { color: '#8B5CF6' }]}>✓ Submitted — awaiting advertiser review</Text>
            )}
            {item.status === 'approved' && (
              <Text style={[S.infoLine, { color: '#059669' }]}>
                💰 Paid {item.paymentCurrency === 'NGN' ? '₦' : '$'}{item.paymentAmount?.toLocaleString()} {item.paymentCurrency}
              </Text>
            )}

            {/* CTA */}
            {needsAction && !offerExpired && (
              <TouchableOpacity style={S.ctaBtn} onPress={() => navigate(item)}>
                <Text style={S.ctaTxt}>{cfg.cta}</Text>
                <Ionicons name="arrow-forward" size={13} color="#7C3AED" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    // Plain View — _layout.tsx provides safe area + paddingTop for the header
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>

      {/* Header gradient — NO paddingTop, layout already gives us that space */}
      <LinearGradient colors={['#7C3AED', '#6D28D9', '#5B21B6']} style={S.hdr}>
        <Text style={S.hdrTitle}>My Applications</Text>
        <Text style={S.hdrSub}>{applications.length} total</Text>

        {/* Stats */}
        <View style={S.statsRow}>
          {[
            { label: 'Active',      val: activeCount,  color: '#FCD34D' },
            { label: 'Need Action', val: actionNeeded, color: '#F87171' },
            { label: 'Earned',      val: totalEarned > 0 ? `₦${(totalEarned / 1000).toFixed(0)}K` : '—', color: '#6EE7B7' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={S.statsSep} />}
              <View style={S.statCell}>
                <Text style={[S.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={S.statLbl}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={S.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[S.tab, tab === t.key && S.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[S.tabTxt, tab === t.key && S.tabTxtActive]}>{t.label}</Text>
            {counts[t.key] > 0 && (
              <View style={[S.tabCount, tab === t.key && S.tabCountActive]}>
                <Text style={[S.tabCountTxt, tab === t.key && { color: '#7C3AED' }]}>{counts[t.key]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={{ color: '#9CA3AF', marginTop: 10 }}>Loading applications…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(a) => a._id}
          contentContainerStyle={{ padding: 14, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor="#7C3AED"
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <View style={S.empty}>
              <MaterialCommunityIcons name="briefcase-search-outline" size={64} color="#D1D5DB" />
              <Text style={S.emptyTitle}>
                {tab === 'active'    ? 'No active applications' :
                 tab === 'completed' ? 'No completed jobs yet'  :
                 tab === 'other'     ? 'Nothing here'           : 'No applications yet'}
              </Text>
              <Text style={S.emptySub}>
                {tab === 'all' ? 'Browse UGC campaigns and apply to start earning.' : ''}
              </Text>
              {tab === 'all' && (
                <TouchableOpacity
                  style={S.browseBtn}
                  onPress={() => router.push('/(dashboard_clipper)/join_ugc' as any)}
                >
                  <Ionicons name="search-outline" size={16} color="#FFF" />
                  <Text style={S.browseBtnTxt}>Browse Campaigns</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  // paddingTop: 0 — layout's body paddingTop already clears the fixed ProfileHeader
  hdr:       { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 18 },
  hdrTitle:  { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  hdrSub:    { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 14 },
  statsRow:  { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 },
  statCell:  { flex: 1, alignItems: 'center' },
  statVal:   { fontSize: 18, fontWeight: '800' },
  statLbl:   { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  statsSep:  { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },

  tabRow:        { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 5 },
  tabActive:     { borderBottomWidth: 2.5, borderBottomColor: '#7C3AED' },
  tabTxt:        { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  tabTxtActive:  { color: '#7C3AED', fontWeight: '700' },
  tabCount:      { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabCountActive:{ backgroundColor: '#EDE9FE' },
  tabCountTxt:   { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },

  card:        { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardActive:  { borderWidth: 1.5, borderColor: '#DDD6FE' },
  urgencyBar:  { height: 3, backgroundColor: '#7C3AED' },
  cardInner:   { flexDirection: 'row', padding: 14, gap: 12 },

  thumbWrap:        { width: 76, height: 76, borderRadius: 14, overflow: 'hidden' },
  thumb:            { width: 76, height: 76 },
  thumbPlaceholder: { backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },

  cardContent: { flex: 1 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 3 },
  cardTitle:   { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 19 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  statusTxt:   { fontSize: 10, fontWeight: '700' },

  advName:     { fontSize: 12, color: '#9CA3AF', marginBottom: 6 },

  rateRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  rateMain:    { fontSize: 14, fontWeight: '800', color: '#059669' },
  rateSub:     { fontSize: 13, fontWeight: '600', color: '#374151' },
  catChip:     { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  catTxt:      { fontSize: 11, color: '#6B7280' },

  infoLine:    { fontSize: 12, color: '#9CA3AF', marginBottom: 6, lineHeight: 17 },

  ctaBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EDE9FE', borderRadius: 9, paddingVertical: 7, paddingHorizontal: 12, alignSelf: 'flex-start', marginTop: 2 },
  ctaTxt:      { fontSize: 12, fontWeight: '700', color: '#7C3AED' },

  empty:       { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle:  { fontSize: 17, fontWeight: '600', color: '#374151' },
  emptySub:    { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
  browseBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 24, marginTop: 8 },
  browseBtnTxt:{ fontSize: 14, fontWeight: '700', color: '#FFF' },
});


