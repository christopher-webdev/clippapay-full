// app/(dashboard_advertiser)/my_clipping_campaigns.tsx
// Advertiser's list of all their clipping campaigns with stats & quick actions
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClippingCampaign {
  _id: string;
  title: string;
  budget: number;
  currency: 'NGN' | 'USDT';
  costPerThousand: number;
  estimatedViews: number;
  totalSpent: number;
  totalViews: number;
  clipsCreated: number;
  platforms: string[];
  categories: string[];
  status: 'waiting_for_approval' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n.toLocaleString()}` : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const STATUS_CFG = {
  waiting_for_approval: { label: 'Pending Approval', color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline' },
  active:               { label: 'Active',           color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle-outline' },
  completed:            { label: 'Completed',         color: '#6B7280', bg: '#F9FAFB', icon: 'flag-outline' },
  cancelled:            { label: 'Cancelled',         color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline' },
} as const;

const FILTER_TABS = [
  { value: '',                    label: 'All'     },
  { value: 'active',              label: 'Active'  },
  { value: 'waiting_for_approval',label: 'Pending' },
  { value: 'completed',           label: 'Done'    },
  { value: 'cancelled',           label: 'Cancelled'},
] as const;

// ─── Component ────────────────────────────────────────────────────────────────
export default function MyClippingCampaignsScreen() {
  const router = useRouter();

  const [campaigns, setCampaigns]   = useState<ClippingCampaign[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [summary, setSummary]       = useState({ total: 0, totalSpent: 0, totalViews: 0, active: 0 });

  const getToken = async () => {
    if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
    return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.push('/login'); return; }

      // Always fetch ALL campaigns so summary is accurate regardless of filter
      const { data } = await axios.get(
        `${API_BASE}/campaigns/clipping?limit=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const all: ClippingCampaign[] = data.campaigns || [];

      // Apply status filter client-side — avoids a second network call
      const list = statusFilter ? all.filter((c) => c.status === statusFilter) : all;
      setCampaigns(list);

      // Summary always computed from the full unfiltered list
      setSummary({
        total:      all.length,
        active:     all.filter((c) => c.status === 'active').length,
        totalSpent: all.reduce((s, c) => s + (c.totalSpent || 0), 0),
        totalViews: all.reduce((s, c) => s + (c.totalViews || 0), 0),
      });
    } catch (err) {
      console.error('load clipping campaigns:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Campaign card ─────────────────────────────────────────────────────────
  const renderCard = ({ item: c }: { item: ClippingCampaign }) => {
    const cfg        = STATUS_CFG[c.status] || STATUS_CFG.active;
    const pct        = c.estimatedViews > 0 ? Math.min(100, Math.round((c.totalViews / c.estimatedViews) * 100)) : 0;
    const remaining  = c.budget - (c.totalSpent || 0);
    const spentPct   = c.budget > 0 ? Math.min(100, Math.round(((c.totalSpent || 0) / c.budget) * 100)) : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPress={() => router.push({ pathname: '/(dashboard_advertiser)/clipping_campaign_detail', params: { id: c._id } })}
      >
        {/* Header row */}
        <View style={styles.cardTop}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle} numberOfLines={2}>{c.title}</Text>
            <Text style={styles.cardDate}>{new Date(c.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
            <Text style={[styles.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Stats 2×2 */}
        <View style={styles.statsGrid}>
          <StatCell label="Budget"        value={fmtMoney(c.budget, c.currency)} />
          <StatCell label="Spent"         value={fmtMoney(c.totalSpent || 0, c.currency)} accent />
          <StatCell label="Total Views"   value={(c.totalViews || 0).toLocaleString()} />
          <StatCell label="Clippers"      value={String(c.clipsCreated || 0)} />
        </View>

        {/* Budget bar */}
        <View style={styles.barSection}>
          <View style={styles.barLabelRow}>
            <Text style={styles.barLabel}>Budget Used</Text>
            <Text style={styles.barPct}>{spentPct}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, styles.fillSpent, { width: `${spentPct}%` as any }]} />
          </View>
        </View>

        {/* Views bar */}
        <View style={styles.barSection}>
          <View style={styles.barLabelRow}>
            <Text style={styles.barLabel}>Views Delivered</Text>
            <Text style={styles.barPct}>{pct}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, styles.fillViews, { width: `${pct}%` as any }]} />
          </View>
        </View>

        {/* Platforms */}
        <View style={styles.platformsRow}>
          {c.platforms.slice(0, 5).map((p) => (
            <View key={p} style={styles.pChip}>
              <Text style={styles.pChipTxt}>{p}</Text>
            </View>
          ))}
          {c.platforms.length > 5 && (
            <View style={styles.pChip}>
              <Text style={styles.pChipTxt}>+{c.platforms.length - 5}</Text>
            </View>
          )}
        </View>

        {/* Footer action */}
        <View style={styles.cardFooter}>
          <Text style={styles.remainingTxt}>
            {fmtMoney(remaining, c.currency)} remaining
          </Text>
          <View style={styles.detailBtn}>
            <Text style={styles.detailBtnTxt}>Manage</Text>
            <Ionicons name="chevron-forward" size={14} color="#FF6B35" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={styles.empty}>
      <MaterialCommunityIcons name="movie-edit-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No clipping campaigns yet</Text>
      <Text style={styles.emptySub}>
        {statusFilter
          ? 'No campaigns match this filter.'
          : 'Create your first clipping campaign and have creators spread your video across social media.'}
      </Text>
      {!statusFilter && (
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/(dashboard_advertiser)/create_clipping')}
        >
          <Ionicons name="add-circle-outline" size={18} color="#FFF" />
          <Text style={styles.createBtnTxt}>Create Campaign</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Gradient header */}
      <LinearGradient colors={['#FF6B35', '#FF6B35', '#FF6B35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradHdr}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>My Clipping Campaigns</Text>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: 'rgba(255,255,255,0.3)' }]}
            onPress={() => router.push('/(dashboard_advertiser)/create_clipping')}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Summary chips */}
        <View style={styles.summaryRow}>
          {[
            { label: 'Total',        val: String(summary.total) },
            { label: 'Active',       val: String(summary.active) },
            { label: 'Total Spent',  val: `₦${(summary.totalSpent / 1000).toFixed(0)}K` },
            { label: 'Total Views',  val: `${(summary.totalViews / 1000).toFixed(0)}K` },
          ].map(({ label, val }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <View style={styles.sumDivider} />}
              <View style={styles.sumCell}>
                <Text style={styles.sumVal}>{val}</Text>
                <Text style={styles.sumLbl}>{label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {/* Filter tabs */}
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {FILTER_TABS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.tab, statusFilter === t.value && styles.tabActive]}
              onPress={() => setStatusFilter(t.value)}
            >
              <Text style={[styles.tabTxt, statusFilter === t.value && styles.tabTxtActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={campaigns}
          renderItem={renderCard}
          keyExtractor={(c) => c._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#FF6B35" />
          }
          ListEmptyComponent={<EmptyState />}
        />
      )}
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLbl}>{label}</Text>
      <Text style={[styles.statVal, accent && { color: '#EF4444' }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F5F5F7' },
  gradHdr:      { paddingTop: 56, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginTop: -50,},
  navRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 16 },
  navBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  navTitle:     { fontSize: 18, fontWeight: '700', color: '#FFF' },
  summaryRow:   { flexDirection: 'row', marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 12 },
  sumCell:      { flex: 1, alignItems: 'center' },
  sumVal:       { fontSize: 16, fontWeight: '800', color: '#FFF' },
  sumLbl:       { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  sumDivider:   { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },

  tabsWrap:     { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tabs:         { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab:          { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6' },
  tabActive:    { backgroundColor: '#FF6B35' },
  tabTxt:       { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTxtActive: { color: '#FFF', fontWeight: '700' },

  list:         { padding: 16, paddingBottom: 40 },
  loader:       { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card:         { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardTitleWrap:{ flex: 1, marginRight: 10 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 20 },
  cardDate:     { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 },
  statusTxt:    { fontSize: 11, fontWeight: '600' },

  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 4, marginBottom: 12 },
  statCell:     { width: '50%', padding: 10 },
  statLbl:      { fontSize: 11, color: '#9CA3AF' },
  statVal:      { fontSize: 14, fontWeight: '700', color: '#1F2937', marginTop: 2 },

  barSection:   { marginBottom: 10 },
  barLabelRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barLabel:     { fontSize: 11, color: '#6B7280' },
  barPct:       { fontSize: 11, fontWeight: '600', color: '#374151' },
  track:        { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  fill:         { height: '100%', borderRadius: 3 },
  fillSpent:    { backgroundColor: '#EF4444' },
  fillViews:    { backgroundColor: '#10B981' },

  platformsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  pChip:        { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pChipTxt:     { fontSize: 11, color: '#6B7280', textTransform: 'capitalize' },

  cardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  remainingTxt: { fontSize: 13, color: '#6B7280' },
  detailBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailBtnTxt: { fontSize: 13, fontWeight: '600', color: '#FF6B35' },

  empty:        { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: '#374151' },
  emptySub:     { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  createBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6B35', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8, marginTop: 8 },
  createBtnTxt: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});