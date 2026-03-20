// app/(dashboard_advertiser)/clipping_campaign_detail.tsx
// Full management page for a single clipping campaign:
//   - Live stats (budget, spent, views, clippers)
//   - All clipper submissions with proof status
//   - Cancel campaign (refunds remaining budget)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Linking, Platform, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_BASE  = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Proof {
  _id: string;
  platform: string;
  submissionUrl: string | null;
  views: number;
  verifiedViews?: number;
  rewardAmount?: number;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
}
interface Submission {
  _id: string;
  clipper: { _id: string; firstName?: string; lastName?: string; email: string };
  proofs: Proof[];
  rewardAmount: number;
  createdAt: string;
}
interface Campaign {
  _id: string;
  title: string;
  videoUrl: string;
  budget: number;
  currency: 'NGN' | 'USDT';
  costPerThousand: number;
  estimatedViews: number;
  totalSpent: number;
  totalViews: number;
  clipsCreated: number;
  platforms: string[];
  categories: string[];
  hashtags: string[];
  directions: string[];
  ctaUrl?: string;
  status: 'waiting_for_approval' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney  = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${(n || 0).toLocaleString()}` : `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const clipperName = (c: Submission['clipper']) =>
  c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : c.email;

const PROOF_STATUS = {
  pending:  { label: 'Pending',  color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline'            },
  approved: { label: 'Approved', color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline'    },
};

const CAMPAIGN_STATUS = {
  waiting_for_approval: { label: 'Pending Approval', color: '#F59E0B', bg: '#FFFBEB' },
  active:               { label: 'Active',           color: '#10B981', bg: '#ECFDF5' },
  completed:            { label: 'Completed',         color: '#6B7280', bg: '#F9FAFB' },
  cancelled:            { label: 'Cancelled',         color: '#EF4444', bg: '#FEF2F2' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClippingCampaignDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [campaign, setCampaign]       = useState<Campaign | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [cancelling, setCancelling]   = useState(false);
  const [activeTab, setActiveTab]     = useState<'overview' | 'clippers'>('overview');

  const getToken = async () => {
    if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
    return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.push('/login'); return; }
      const headers = { Authorization: `Bearer ${token}` };

      const [campRes, subRes] = await Promise.all([
        axios.get<Campaign>(`${API_BASE}/campaigns/clipping/${id}`, { headers }),
        // Fetch all submissions for this campaign via admin/clipping route
        axios.get<Submission[]>(`${API_BASE}/campaigns/clipping/${id}/submissions`, { headers })
          .catch(() => ({ data: [] as Submission[] })), // graceful if route not yet wired
      ]);

      setCampaign(campRes.data);
      setSubmissions(subRes.data || []);
    } catch (err) {
      console.error('load detail:', err);
      Alert.alert('Error', 'Could not load campaign details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Cancel campaign ───────────────────────────────────────────────────────
  const handleCancel = () => {
    if (!campaign) return;
    const remaining = campaign.budget - (campaign.totalSpent || 0);
    Alert.alert(
      'Cancel Campaign?',
      `This will cancel the campaign and refund ${fmtMoney(remaining, campaign.currency)} to your wallet.\n\nThis action cannot be undone.`,
      [
        { text: 'Keep Campaign', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const token = await getToken();
              await axios.post(
                `${API_BASE}/campaigns/clipping/${id}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              Alert.alert('Cancelled', `Campaign cancelled. ${fmtMoney(remaining, campaign.currency)} has been refunded to your wallet.`);
              await load(true);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Could not cancel campaign.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7' }}>
        <Text style={{ color: '#6B7280' }}>Campaign not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#FF6B35', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pct       = campaign.estimatedViews > 0
    ? Math.min(100, Math.round(((campaign.totalViews || 0) / campaign.estimatedViews) * 100))
    : 0;
  const spentPct  = campaign.budget > 0
    ? Math.min(100, Math.round(((campaign.totalSpent || 0) / campaign.budget) * 100))
    : 0;
  const remaining = campaign.budget - (campaign.totalSpent || 0);
  const campCfg   = CAMPAIGN_STATUS[campaign.status] || CAMPAIGN_STATUS.active;

  // Aggregate proof stats
  const allProofs       = submissions.flatMap((s) => s.proofs);
  const approvedProofs  = allProofs.filter((p) => p.status === 'approved');
  const pendingProofs   = allProofs.filter((p) => p.status === 'pending');

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <LinearGradient colors={['#FF6B35', '#FF6B35', '#FF6B35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradHdr}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.navTitle} numberOfLines={1}>{campaign.title}</Text>
            <View style={[styles.statusPill, { backgroundColor: campCfg.bg }]}>
              <Text style={[styles.statusPillTxt, { color: campCfg.color }]}>{campCfg.label}</Text>
            </View>
          </View>
          {(campaign.status === 'active' || campaign.status === 'waiting_for_approval') && (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: 'rgba(239,68,68,0.25)' }]}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="close-circle-outline" size={22} color="#FFF" />}
            </TouchableOpacity>
          )}
        </View>

        {/* KPI row */}
        <View style={styles.kpiRow}>
          {[
            { label: 'Budget',    val: fmtMoney(campaign.budget, campaign.currency) },
            { label: 'Spent',     val: fmtMoney(campaign.totalSpent || 0, campaign.currency) },
            { label: 'Views',     val: (campaign.totalViews || 0).toLocaleString() },
            { label: 'Clippers',  val: String(campaign.clipsCreated || 0) },
          ].map(({ label, val }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <View style={styles.kpiDiv} />}
              <View style={styles.kpiCell}>
                <Text style={styles.kpiVal}>{val}</Text>
                <Text style={styles.kpiLbl}>{label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {/* ── Tabs ── */}
      <View style={styles.tabBar}>
        {([['overview', 'Overview'], ['clippers', `Clippers (${submissions.length})`]] as const).map(([val, lbl]) => (
          <TouchableOpacity
            key={val}
            style={[styles.tab, activeTab === val && styles.tabActive]}
            onPress={() => setActiveTab(val)}
          >
            <Text style={[styles.tabTxt, activeTab === val && styles.tabTxtActive]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#FF6B35" />}
      >
        {activeTab === 'overview' ? (
          <OverviewTab
            campaign={campaign}
            pct={pct}
            spentPct={spentPct}
            remaining={remaining}
            approvedProofsCount={approvedProofs.length}
            pendingProofsCount={pendingProofs.length}
          />
        ) : (
          <ClippersTab submissions={submissions} currency={campaign.currency} />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({
  campaign, pct, spentPct, remaining, approvedProofsCount, pendingProofsCount,
}: {
  campaign: Campaign; pct: number; spentPct: number; remaining: number;
  approvedProofsCount: number; pendingProofsCount: number;
}) {
  return (
    <>
      {/* Progress cards */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>CAMPAIGN PROGRESS</Text>
        <ProgressBar label="Budget Used" pct={spentPct} color="#EF4444"
          sub={`${fmtMoney(campaign.totalSpent || 0, campaign.currency)} of ${fmtMoney(campaign.budget, campaign.currency)}`} />
        <ProgressBar label="Views Delivered" pct={pct} color="#10B981"
          sub={`${(campaign.totalViews || 0).toLocaleString()} of ${campaign.estimatedViews.toLocaleString()} target`} />
      </View>

      {/* Proof summary */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>PROOF SUMMARY</Text>
        <View style={styles.proofSummaryRow}>
          <ProofSumCell label="Approved Proofs" val={String(approvedProofsCount)} color="#10B981" />
          <ProofSumCell label="Pending Review"  val={String(pendingProofsCount)}  color="#F59E0B" />
          <ProofSumCell label="Remaining Budget" val={fmtMoney(remaining, campaign.currency)} color="#6B7280" />
        </View>
      </View>

      {/* Campaign info */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>CAMPAIGN INFO</Text>

        <TouchableOpacity style={styles.videoRow}
          onPress={() => Linking.openURL(campaign.videoUrl).catch(() => Alert.alert('Error', 'Could not open link.'))}>
          <View style={styles.videoIcon}>
            <MaterialCommunityIcons name="play" size={20} color="#FF6B35" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.videoTitle}>Source Video</Text>
            <Text style={styles.videoUrl} numberOfLines={1}>{campaign.videoUrl}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <InfoRow label="Rate" val={`${fmtMoney(campaign.costPerThousand, campaign.currency)} per 1,000 views`} />
        <InfoRow label="Target Views" val={campaign.estimatedViews.toLocaleString()} />
        <InfoRow label="Created" val={new Date(campaign.createdAt).toLocaleDateString()} />

        {campaign.platforms.length > 0 && (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLbl}>Platforms</Text>
            <View style={styles.chipRow}>
              {campaign.platforms.map((p) => (
                <View key={p} style={styles.chip}><Text style={styles.chipTxt}>{p}</Text></View>
              ))}
            </View>
          </View>
        )}

        {campaign.hashtags.length > 0 && (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLbl}>Hashtags</Text>
            <View style={styles.chipRow}>
              {campaign.hashtags.map((h, i) => (
                <View key={i} style={[styles.chip, styles.chipBlue]}>
                  <Text style={[styles.chipTxt, { color: '#3B82F6' }]}>#{h}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {campaign.directions.length > 0 && (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLbl}>Directions</Text>
            {campaign.directions.map((d, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletTxt}>{d}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </>
  );
}

// ─── Clippers Tab ─────────────────────────────────────────────────────────────
function ClippersTab({ submissions, currency }: { submissions: Submission[]; currency: 'NGN' | 'USDT' }) {
  if (submissions.length === 0) {
    return (
      <View style={styles.emptyClippers}>
        <MaterialCommunityIcons name="account-group-outline" size={56} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No clippers yet</Text>
        <Text style={styles.emptySub}>Clippers will appear here once they join and submit their proofs.</Text>
      </View>
    );
  }

  return (
    <>
      {submissions.map((sub) => {
        const approved = sub.proofs.filter((p) => p.status === 'approved');
        const pending  = sub.proofs.filter((p) => p.status === 'pending');
        const totalVerified = approved.reduce((s, p) => s + (p.verifiedViews || 0), 0);

        return (
          <View key={sub._id} style={styles.clipperCard}>
            {/* Clipper header */}
            <View style={styles.clipperHeader}>
              <View style={styles.clipperAvatar}>
                <Text style={styles.clipperAvatarTxt}>
                  {clipperName(sub.clipper).slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clipperName}>{clipperName(sub.clipper)}</Text>
                <Text style={styles.clipperDate}>Joined {new Date(sub.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.clipperEarned}>
                <Text style={styles.clipperEarnedVal}>{fmtMoney(sub.rewardAmount || 0, currency)}</Text>
                <Text style={styles.clipperEarnedLbl}>earned</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.clipperStats}>
              <View style={styles.clipperStat}>
                <Text style={styles.csVal}>{sub.proofs.length}</Text>
                <Text style={styles.csLbl}>Proofs</Text>
              </View>
              <View style={styles.clipperStat}>
                <Text style={[styles.csVal, { color: '#F59E0B' }]}>{pending.length}</Text>
                <Text style={styles.csLbl}>Pending</Text>
              </View>
              <View style={styles.clipperStat}>
                <Text style={[styles.csVal, { color: '#10B981' }]}>{approved.length}</Text>
                <Text style={styles.csLbl}>Approved</Text>
              </View>
              <View style={styles.clipperStat}>
                <Text style={styles.csVal}>{totalVerified.toLocaleString()}</Text>
                <Text style={styles.csLbl}>Views</Text>
              </View>
            </View>

            {/* Proof list */}
            {sub.proofs.map((proof) => {
              const pCfg = PROOF_STATUS[proof.status] || PROOF_STATUS.pending;
              return (
                <View key={proof._id} style={styles.proofRow}>
                  <View style={styles.proofPlatformBadge}>
                    <Text style={styles.proofPlatform}>{proof.platform}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {proof.submissionUrl ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(proof.submissionUrl!).catch(() => {})}
                      >
                        <Text style={styles.proofLink} numberOfLines={1}>{proof.submissionUrl}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.proofNoUrl}>Screenshot proof</Text>
                    )}
                    <Text style={styles.proofViews}>
                      {(proof.views || 0).toLocaleString()} submitted views
                      {proof.verifiedViews ? ` · ${proof.verifiedViews.toLocaleString()} verified` : ''}
                    </Text>
                  </View>
                  <View style={[styles.proofStatus, { backgroundColor: pCfg.bg }]}>
                    <Text style={[styles.proofStatusTxt, { color: pCfg.color }]}>{pCfg.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function ProgressBar({ label, pct, color, sub }: { label: string; pct: number; color: string; sub: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color }}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { backgroundColor: color, width: `${pct}%` as any }]} />
      </View>
      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{sub}</Text>
    </View>
  );
}
function ProofSumCell({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color }}>{val}</Text>
      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}
function InfoRow({ label, val }: { label: string; val: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLbl}>{label}</Text>
      <Text style={styles.infoVal}>{val}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F5F5F7' },
  gradHdr:      { paddingTop: 56, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginTop: -50 },
  navRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 14 },
  navBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  navTitle:     { fontSize: 16, fontWeight: '700', color: '#FFF' },
  statusPill:   { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  statusPillTxt:{ fontSize: 11, fontWeight: '600' },
  kpiRow:       { flexDirection: 'row', marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 12 },
  kpiCell:      { flex: 1, alignItems: 'center' },
  kpiVal:       { fontSize: 14, fontWeight: '800', color: '#FFF' },
  kpiLbl:       { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  kpiDiv:       { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2 },

  tabBar:       { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab:          { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: '#FF6B35' },
  tabTxt:       { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  tabTxtActive: { color: '#FF6B35', fontWeight: '700' },

  card:         { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardLabel:    { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 14 },
  track:        { height: 7, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  fill:         { height: '100%', borderRadius: 4 },

  proofSummaryRow: { flexDirection: 'row', gap: 4 },

  videoRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2E9', borderRadius: 12, padding: 12, marginBottom: 14 },
  videoIcon:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  videoTitle:   { fontSize: 13, fontWeight: '700', color: '#FF6B35' },
  videoUrl:     { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  infoBlock:    { paddingTop: 12 },
  infoLbl:      { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  infoVal:      { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip:         { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 },
  chipBlue:     { backgroundColor: '#EFF6FF' },
  chipTxt:      { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  bulletRow:    { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  bullet:       { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FF6B35', marginTop: 7, marginRight: 8 },
  bulletTxt:    { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 20 },

  emptyClippers: { alignItems: 'center', paddingTop: 50, gap: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub:      { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },

  clipperCard:   { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  clipperHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  clipperAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  clipperAvatarTxt: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  clipperName:   { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  clipperDate:   { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  clipperEarned: { alignItems: 'flex-end' },
  clipperEarnedVal: { fontSize: 15, fontWeight: '800', color: '#10B981' },
  clipperEarnedLbl: { fontSize: 10, color: '#9CA3AF' },
  clipperStats:  { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, marginBottom: 12 },
  clipperStat:   { flex: 1, alignItems: 'center' },
  csVal:         { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  csLbl:         { fontSize: 10, color: '#9CA3AF', marginTop: 2 },

  proofRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  proofPlatformBadge: { backgroundColor: '#FEF2E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  proofPlatform: { fontSize: 11, fontWeight: '600', color: '#FF6B35', textTransform: 'capitalize' },
  proofLink:     { fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' },
  proofNoUrl:    { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  proofViews:    { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  proofStatus:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  proofStatusTxt:{ fontSize: 10, fontWeight: '600' },
});