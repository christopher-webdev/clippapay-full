// app/(dashboard_clipper)/my_clipping.tsx
// Clipper's personal clipping hub — with search + filter

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, Platform, Alert, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

interface Proof {
  _id: string;
  platform: string;
  status: 'pending' | 'approved' | 'rejected';
  views: number;
  verifiedViews: number;
  rewardAmount: number;
}
interface Submission {
  _id: string;
  campaign: {
    _id: string;
    title: string;
    status: string;
    currency: 'NGN' | 'USDT';
    costPerThousand: number;
    clipperCpm: number;
    platforms: string[];
  };
  proofs: Proof[];
  totalVerifiedViews: number;
  totalEarned: number;
  pendingProofs: number;
  createdAt: string;
}

type CampaignStatusFilter = 'all' | 'active' | 'completed' | 'cancelled';
type ProofStatusFilter    = 'all' | 'pending' | 'approved' | 'rejected';

const fmtMoney = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n.toLocaleString()}` : `$${n.toFixed(4)}`;

const STATUS_CONFIG = {
  pending:  { color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline'             },
  approved: { color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle-outline' },
  rejected: { color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline'     },
};

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: 'logo-tiktok', instagram: 'logo-instagram', youtube: 'logo-youtube',
  facebook: 'logo-facebook', snapchat: 'logo-snapchat', twitter: 'logo-twitter',
  whatsapp: 'logo-whatsapp',
};

const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
  return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
};

export default function MyClippingScreen() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search,            setSearch]            = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<CampaignStatusFilter>('all');
  const [proofStatusFilter, setProofStatusFilter] = useState<ProofStatusFilter>('all');
  const [showFilters,       setShowFilters]       = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.push('/login'); return; }
      const { data } = await axios.get<Submission[]>(`${API_BASE}/clipping/my/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissions(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not load your clipping submissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((sub) => {
      // Search: title or platform name
      if (q) {
        const inTitle    = sub.campaign.title.toLowerCase().includes(q);
        const inPlatform = sub.proofs.some(p => p.platform?.toLowerCase().includes(q));
        if (!inTitle && !inPlatform) return false;
      }
      // Campaign status filter
      if (campaignStatusFilter !== 'all' && sub.campaign.status !== campaignStatusFilter) return false;
      // Proof status filter — show sub if ANY proof matches
      if (proofStatusFilter !== 'all') {
        const hasMatch = sub.proofs.some(p => p.status === proofStatusFilter);
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [submissions, search, campaignStatusFilter, proofStatusFilter]);

  const hasActiveFilters = search || campaignStatusFilter !== 'all' || proofStatusFilter !== 'all';

  // Totals (off full list, not filtered)
  const totalEarned        = submissions.reduce((s, sub) => s + sub.totalEarned, 0);
  const totalVerifiedViews = submissions.reduce((s, sub) => s + sub.totalVerifiedViews, 0);
  const totalPending       = submissions.reduce((s, sub) => s + sub.pendingProofs, 0);

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7' }}>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  );

  const CAMPAIGN_STATUS_OPTS: { label: string; val: CampaignStatusFilter }[] = [
    { label: 'All', val: 'all' }, { label: 'Active', val: 'active' },
    { label: 'Completed', val: 'completed' }, { label: 'Cancelled', val: 'cancelled' },
  ];
  const PROOF_STATUS_OPTS: { label: string; val: ProofStatusFilter }[] = [
    { label: 'All', val: 'all' }, { label: 'Pending', val: 'pending' },
    { label: 'Approved', val: 'approved' }, { label: 'Rejected', val: 'rejected' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      {/* Header */}
      <LinearGradient colors={['#FF6B35', '#FF6B35']} style={S.gradHdr}>
        <View style={S.navRow}>
          <TouchableOpacity style={S.navBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={S.navTitle}>My Clipping Campaigns</Text>
          <TouchableOpacity style={S.navBtn}
            onPress={() => router.push('/(dashboard_clipper)/join_clipping')}>
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Summary row */}
        <View style={S.summaryRow}>
          <View style={S.summaryCell}>
            <Text style={S.summaryVal}>{fmtMoney(totalEarned, 'NGN')}</Text>
            <Text style={S.summaryLbl}>Total Earned</Text>
          </View>
          <View style={S.summaryDiv} />
          <View style={S.summaryCell}>
            <Text style={S.summaryVal}>{totalVerifiedViews.toLocaleString()}</Text>
            <Text style={S.summaryLbl}>Verified Views</Text>
          </View>
          <View style={S.summaryDiv} />
          <View style={S.summaryCell}>
            <Text style={S.summaryVal}>{totalPending}</Text>
            <Text style={S.summaryLbl}>Pending Reviews</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Search + Filter bar ── */}
      <View style={S.searchBar}>
        <View style={S.searchInput}>
          <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={S.searchText}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by title or platform…"
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[S.filterToggleBtn, hasActiveFilters && S.filterToggleBtnActive]}
          onPress={() => setShowFilters(v => !v)}
        >
          <Ionicons name="options-outline" size={20} color={hasActiveFilters ? '#FF6B35' : '#6B7280'} />
          {hasActiveFilters && <View style={S.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* ── Filter panel (collapsible) ── */}
      {showFilters && (
        <View style={S.filterPanel}>
          <Text style={S.filterGroupLabel}>Campaign Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 4 }}>
              {CAMPAIGN_STATUS_OPTS.map(({ label, val }) => (
                <TouchableOpacity
                  key={val}
                  style={[S.filterChip, campaignStatusFilter === val && S.filterChipActive]}
                  onPress={() => setCampaignStatusFilter(val)}
                >
                  <Text style={[S.filterChipTxt, campaignStatusFilter === val && S.filterChipTxtActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={S.filterGroupLabel}>Proof Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 4 }}>
              {PROOF_STATUS_OPTS.map(({ label, val }) => (
                <TouchableOpacity
                  key={val}
                  style={[S.filterChip, proofStatusFilter === val && S.filterChipActive]}
                  onPress={() => setProofStatusFilter(val)}
                >
                  <Text style={[S.filterChipTxt, proofStatusFilter === val && S.filterChipTxtActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {hasActiveFilters && (
            <TouchableOpacity
              style={S.clearFiltersBtn}
              onPress={() => { setSearch(''); setCampaignStatusFilter('all'); setProofStatusFilter('all'); }}
            >
              <Text style={S.clearFiltersTxt}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Results count */}
      {hasActiveFilters && (
        <Text style={S.resultsCount}>
          {filtered.length} of {submissions.length} campaigns
        </Text>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#FF6B35" />}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          submissions.length === 0 ? (
            // Truly empty
            <View style={S.empty}>
              <MaterialCommunityIcons name="film-off" size={64} color="#D1D5DB" />
              <Text style={S.emptyTitle}>No Clipping Campaigns Yet</Text>
              <Text style={S.emptySub}>Join a clipping campaign to start earning from your content.</Text>
              <TouchableOpacity style={S.joinCta} onPress={() => router.push('/(dashboard_clipper)/join_clipping')}>
                <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                <Text style={S.joinCtaTxt}>Browse Campaigns</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // No filter match
            <View style={S.empty}>
              <Ionicons name="search-outline" size={48} color="#D1D5DB" />
              <Text style={S.emptyTitle}>No results found</Text>
              <Text style={S.emptySub}>Try adjusting your search or filters.</Text>
              <TouchableOpacity style={[S.joinCta, { backgroundColor: '#6B7280' }]}
                onPress={() => { setSearch(''); setCampaignStatusFilter('all'); setProofStatusFilter('all'); }}>
                <Text style={S.joinCtaTxt}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          filtered.map((sub) => (
            <View key={sub._id} style={S.card}>
              {/* Campaign title row */}
              <View style={S.cardTop}>
                <View style={S.filmIcon}>
                  <MaterialCommunityIcons name="film" size={20} color="#FF6B35" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.campTitle} numberOfLines={2}>{sub.campaign.title}</Text>
                  <Text style={S.campRate}>
                    {fmtMoney(sub.campaign.clipperCpm ?? sub.campaign.costPerThousand * 0.4, sub.campaign.currency)} per 1K views
                  </Text>
                </View>
                <View style={[S.campStatus, sub.campaign.status === 'active' ? S.statusActive : S.statusOther]}>
                  <Text style={[S.campStatusTxt, sub.campaign.status !== 'active' && { color: '#6B7280' }]}>
                    {sub.campaign.status === 'active' ? 'Active' : sub.campaign.status}
                  </Text>
                </View>
              </View>

              {/* Earnings strip */}
              <View style={S.earningsRow}>
                <View style={S.earnCell}>
                  <Text style={S.earnVal}>{fmtMoney(sub.totalEarned, sub.campaign.currency)}</Text>
                  <Text style={S.earnLbl}>Earned</Text>
                </View>
                <View style={S.earnDiv} />
                <View style={S.earnCell}>
                  <Text style={S.earnVal}>{sub.totalVerifiedViews.toLocaleString()}</Text>
                  <Text style={S.earnLbl}>Verified Views</Text>
                </View>
                <View style={S.earnDiv} />
                <View style={S.earnCell}>
                  <Text style={[S.earnVal, { color: sub.pendingProofs > 0 ? '#F59E0B' : '#9CA3AF' }]}>
                    {sub.pendingProofs}
                  </Text>
                  <Text style={S.earnLbl}>Pending</Text>
                </View>
              </View>

              {/* Proof chips */}
              {sub.proofs.length > 0 && (
                <View style={S.proofsRow}>
                  {sub.proofs.map((proof) => {
                    const cfg = STATUS_CONFIG[proof.status] || STATUS_CONFIG.pending;
                    return (
                      <View key={proof._id} style={[S.proofChip, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={(PLATFORM_ICONS[proof.platform?.toLowerCase()] || 'globe-outline') as any} size={13} color={cfg.color} />
                        <Text style={[S.proofChipTxt, { color: cfg.color }]}>{proof.platform}</Text>
                        <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Actions */}
              <View style={S.actionsRow}>
                <TouchableOpacity
                  style={S.actionBtnPrimary}
                  onPress={() => router.push({
                    pathname: '/(dashboard_clipper)/submit_clipping',
                    params: { campaignId: sub.campaign._id, campaignTitle: sub.campaign.title },
                  })}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color="#FFF" />
                  <Text style={S.actionBtnPrimaryTxt}>
                    {sub.proofs.length > 0 ? 'Manage Proofs' : 'Submit Proof'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  gradHdr:      { paddingTop: 56, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  navRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 16 },
  navBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  navTitle:     { fontSize: 17, fontWeight: '700', color: '#FFF' },
  summaryRow:   { flexDirection: 'row', marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 14 },
  summaryCell:  { flex: 1, alignItems: 'center' },
  summaryVal:   { fontSize: 16, fontWeight: '800', color: '#FFF' },
  summaryLbl:   { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  summaryDiv:   { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },

  // Search + filter bar
  searchBar:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInput:        { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: '#E5E7EB' },
  searchText:         { flex: 1, fontSize: 14, color: '#111827' },
  filterToggleBtn:    { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  filterToggleBtnActive: { borderColor: '#FF6B35', backgroundColor: '#FFF5F0' },
  filterDot:          { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6B35' },

  // Filter panel
  filterPanel:        { backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterGroupLabel:   { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  filterChip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB' },
  filterChipActive:   { backgroundColor: '#FFF5F0', borderColor: '#FF6B35' },
  filterChipTxt:      { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterChipTxtActive:{ color: '#FF6B35' },
  clearFiltersBtn:    { marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#FEF2F2', borderRadius: 10 },
  clearFiltersTxt:    { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  resultsCount: { fontSize: 12, color: '#9CA3AF', paddingHorizontal: 20, paddingTop: 8, fontWeight: '500' },

  empty:         { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle:    { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptySub:      { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
  joinCta:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6B35', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  joinCtaTxt:    { fontSize: 15, fontWeight: '700', color: '#FFF' },

  card:          { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTop:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  filmIcon:      { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FEF2E9', justifyContent: 'center', alignItems: 'center' },
  campTitle:     { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 20 },
  campRate:      { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 3 },
  campStatus:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusActive:  { backgroundColor: '#DCFCE7' },
  statusOther:   { backgroundColor: '#F3F4F6' },
  campStatusTxt: { fontSize: 11, fontWeight: '600', color: '#15803D' },

  earningsRow:  { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 12 },
  earnCell:     { flex: 1, alignItems: 'center' },
  earnVal:      { fontSize: 15, fontWeight: '800', color: '#111827' },
  earnLbl:      { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  earnDiv:      { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8 },

  proofsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  proofChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  proofChipTxt: { fontSize: 12, fontWeight: '600' },

  actionsRow:           { flexDirection: 'row', gap: 10 },
  actionBtnPrimary:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 12, gap: 8 },
  actionBtnPrimaryTxt:  { fontSize: 14, fontWeight: '700', color: '#FFF' },
});