// app/(dashboard_clipper)/CreateUGCsCard_3.tsx
//
// "My Active Work" home card — replaces the old static "View all your submitted videos" card.
//
// Fetches the clipper's active campaigns (both UGC applications AND clipping submissions)
// and shows a compact live list so they can jump straight into managing any of them.
// If nothing is active yet, shows an encouraging empty state.
//
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActiveItem {
  id: string;
  type: 'clipping' | 'ugc';
  title: string;
  status: string;            // proof/application status
  earned: number;
  currency: 'NGN' | 'USDT';
  pendingCount: number;
  campaignId: string;
  campaignTitle: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN'
    ? `₦${n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString()}`
    : `$${n.toFixed(2)}`;

const STATUS_DOT: Record<string, string> = {
  pending:  '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  active:   '#10B981',
  completed:'#6B7280',
};

const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
  return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CreateUGCsCard_3() {
  const [items, setItems]     = useState<ActiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch clipping submissions + UGC applications in parallel
      const [clippingRes, ugcRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/clipping/my/submissions`, { headers }),
        axios.get(`${API_BASE}/applications/my`, { headers }),
      ]);

      const result: ActiveItem[] = [];
      let earned = 0;

      // ── Clipping submissions ───────────────────────────────────────────────
      if (clippingRes.status === 'fulfilled') {
        for (const sub of clippingRes.value.data || []) {
          const camp = sub.campaign;
          if (!camp) continue;

          // Skip campaigns the clipper hasn't actually submitted any proof for yet
          const proofs = sub.proofs || [];
          if (proofs.length === 0) continue;

          const totalSubEarned = proofs.reduce((s: number, p: any) => s + (p.rewardAmount || 0), 0);
          const pending        = proofs.filter((p: any) => p.status === 'pending').length;
          const rejected       = proofs.filter((p: any) => p.status === 'rejected').length;
          const approved       = proofs.filter((p: any) => p.status === 'approved').length;

          const overallStatus = rejected > 0 && approved === 0 ? 'rejected'
            : pending > 0 ? 'pending'
            : approved > 0 ? 'approved'
            : 'active';

          earned += totalSubEarned;
          result.push({
            id:            sub._id,
            type:          'clipping',
            title:         camp.title || 'Clipping Campaign',
            status:        overallStatus,
            earned:        totalSubEarned,
            currency:      camp.currency || 'NGN',
            pendingCount:  pending,
            campaignId:    typeof camp === 'object' ? camp._id : camp,
            campaignTitle: camp.title || 'Campaign',
          });
        }
      }

      // ── UGC applications ───────────────────────────────────────────────────
      if (ugcRes.status === 'fulfilled') {
        const apps = Array.isArray(ugcRes.value.data)
          ? ugcRes.value.data
          : ugcRes.value.data?.applications || [];

        for (const app of apps) {
          // Only show active/in-progress ones
          if (['completed', 'cancelled', 'rejected'].includes(app.status)) continue;

          const appEarned = app.rewardAmount || 0;
          earned += appEarned;
          result.push({
            id:            app._id,
            type:          'ugc',
            title:         app.campaign?.title || 'UGC Campaign',
            status:        app.status,
            earned:        appEarned,
            currency:      app.campaign?.currency || 'NGN',
            pendingCount:  app.status === 'pending' ? 1 : 0,
            campaignId:    app.campaign?._id || app.campaign,
            campaignTitle: app.campaign?.title || 'Campaign',
          });
        }
      }

      // Sort: pending first, then by earned desc
      result.sort((a, b) => {
        if (a.pendingCount > 0 && b.pendingCount === 0) return -1;
        if (b.pendingCount > 0 && a.pendingCount === 0) return 1;
        return b.earned - a.earned;
      });

      setItems(result.slice(0, 4)); // Show max 4 in the card
      setTotalEarned(earned);
    } catch (err) {
      console.error('CreateUGCsCard_3 load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleItemPress = (item: ActiveItem) => {
    if (item.type === 'clipping') {
      router.push({
        pathname: '/(dashboard_clipper)/submit_clipping',
        params: { campaignId: item.campaignId, campaignTitle: item.campaignTitle },
      } as any);
    } else {
      router.push({
        pathname: '/(dashboard_clipper)/my-applications',
      } as any);
    }
  };

  const handleSeeAll = () => {
    router.push('/(dashboard_clipper)/my_clipping' as any);
  };

  return (
    <View style={styles.cardOuter}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <MaterialCommunityIcons name="briefcase-check-outline" size={18 * scale} color="#FF6B35" />
            </View>
            <View>
              <Text style={styles.headerTitle}>My Active Work</Text>
              <Text style={styles.headerSub}>
                {loading ? 'Loading…' : items.length === 0 ? 'Nothing active yet' : `${items.length} campaign${items.length > 1 ? 's' : ''} in progress`}
              </Text>
            </View>
          </View>

          {/* Total earned badge */}
          {totalEarned > 0 && (
            <View style={styles.earnedBadge}>
              <Text style={styles.earnedVal}>₦{totalEarned >= 1000 ? `${(totalEarned / 1000).toFixed(1)}K` : totalEarned.toFixed(0)}</Text>
              <Text style={styles.earnedLbl}>earned</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Content */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.loadingTxt}>Fetching your campaigns…</Text>
          </View>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.list}>
            {items.map((item, idx) => (
              <React.Fragment key={item.id}>
                <ActiveRow item={item} onPress={() => handleItemPress(item)} />
                {idx < items.length - 1 && <View style={styles.rowDivider} />}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn} onPress={handleSeeAll}>
            <MaterialCommunityIcons name="film-outline" size={13 * scale} color="#FF6B35" />
            <Text style={styles.footerBtnTxt}>All Clipping Work</Text>
          </TouchableOpacity>
          <View style={styles.footerSep} />
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={() => router.push('/(dashboard_clipper)/my-applications' as any)}
          >
            <Ionicons name="document-text-outline" size={13 * scale} color="rgba(255,255,255,0.6)" />
            <Text style={[styles.footerBtnTxt, { color: 'rgba(255,255,255,0.6)' }]}>All UGC Work</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Active row item ──────────────────────────────────────────────────────────
function ActiveRow({ item, onPress }: { item: ActiveItem; onPress: () => void }) {
  const dotColor = STATUS_DOT[item.status] || '#9CA3AF';
  const isClipping = item.type === 'clipping';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      {/* Type icon */}
      <View style={[styles.rowIcon, { backgroundColor: isClipping ? 'rgba(255,107,53,0.15)' : 'rgba(99,102,241,0.15)' }]}>
        {isClipping
          ? <MaterialCommunityIcons name="film" size={15 * scale} color="#FF6B35" />
          : <Ionicons name="camera-outline" size={15 * scale} color="#6366F1" />
        }
      </View>

      {/* Title + status */}
      <View style={{ flex: 1, marginLeft: 10 * scale }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 * scale, gap: 5 * scale }}>
          <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
          <Text style={styles.rowStatus}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            {item.pendingCount > 0 ? ` · ${item.pendingCount} pending` : ''}
          </Text>
          <View style={[styles.typePill, { backgroundColor: isClipping ? 'rgba(255,107,53,0.15)' : 'rgba(99,102,241,0.15)' }]}>
            <Text style={[styles.typePillTxt, { color: isClipping ? '#FF6B35' : '#818CF8' }]}>
              {isClipping ? 'Clip' : 'UGC'}
            </Text>
          </View>
        </View>
      </View>

      {/* Earned + arrow */}
      <View style={{ alignItems: 'flex-end', gap: 2 * scale }}>
        {item.earned > 0 && (
          <Text style={styles.rowEarned}>{fmtMoney(item.earned, item.currency)}</Text>
        )}
        <Ionicons name="chevron-forward" size={14 * scale} color="rgba(255,255,255,0.4)" />
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyBox}>
      <MaterialCommunityIcons name="briefcase-plus-outline" size={36 * scale} color="rgba(255,255,255,0.2)" />
      <Text style={styles.emptyTitle}>No active work yet</Text>
      <Text style={styles.emptySub}>
        Join a clipping campaign or apply for a UGC job to start earning.
      </Text>
      <View style={styles.emptyActions}>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => router.push('/(dashboard_clipper)/join_clipping' as any)}
        >
          <MaterialCommunityIcons name="film-plus" size={14 * scale} color="#FF6B35" />
          <Text style={styles.emptyBtnTxt}>Find Clipping Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.emptyBtn, { borderColor: 'rgba(99,102,241,0.5)' }]}
          onPress={() => router.push('/(dashboard_clipper)/join_ugc' as any)}
        >
          <Ionicons name="camera-outline" size={14 * scale} color="#818CF8" />
          <Text style={[styles.emptyBtnTxt, { color: '#818CF8' }]}>Browse UGC</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  cardOuter: {
    width: 390 * scale,
    alignSelf: 'center',
    marginTop: 5 * scale,
    marginBottom: 24 * scale,
    borderRadius: 16 * scale,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    borderRadius: 16 * scale,
    paddingTop: 16 * scale,
    paddingBottom: 0,
  },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 * scale, marginBottom: 12 * scale },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 * scale },
  headerIconWrap:{ width: 36 * scale, height: 36 * scale, borderRadius: 10 * scale, backgroundColor: 'rgba(255,107,53,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { fontSize: 15 * scale, fontWeight: '700', color: '#FFF' },
  headerSub:    { fontSize: 11 * scale, color: 'rgba(255,255,255,0.5)', marginTop: 1 * scale },
  earnedBadge:  { alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 10 * scale, paddingHorizontal: 10 * scale, paddingVertical: 5 * scale },
  earnedVal:    { fontSize: 14 * scale, fontWeight: '800', color: '#34D399' },
  earnedLbl:    { fontSize: 9 * scale, color: 'rgba(52,211,153,0.7)', marginTop: 1 * scale },

  divider:      { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 16 * scale, marginBottom: 4 * scale },

  // Loading
  loadingBox:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 * scale, paddingVertical: 28 * scale },
  loadingTxt:   { fontSize: 13 * scale, color: 'rgba(255,255,255,0.4)' },

  // List
  list:         { paddingHorizontal: 8 * scale },

  // Row
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 * scale, paddingHorizontal: 8 * scale },
  rowIcon:      { width: 32 * scale, height: 32 * scale, borderRadius: 8 * scale, justifyContent: 'center', alignItems: 'center' },
  rowTitle:     { fontSize: 13 * scale, fontWeight: '600', color: '#FFF' },
  rowStatus:    { fontSize: 11 * scale, color: 'rgba(255,255,255,0.5)' },
  statusDot:    { width: 5 * scale, height: 5 * scale, borderRadius: 3 * scale },
  typePill:     { paddingHorizontal: 6 * scale, paddingVertical: 1 * scale, borderRadius: 6 * scale },
  typePillTxt:  { fontSize: 9 * scale, fontWeight: '700' },
  rowEarned:    { fontSize: 12 * scale, fontWeight: '700', color: '#34D399' },
  rowDivider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 8 * scale },

  // Empty
  emptyBox:     { alignItems: 'center', paddingVertical: 24 * scale, paddingHorizontal: 20 * scale, gap: 6 * scale },
  emptyTitle:   { fontSize: 14 * scale, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginTop: 4 * scale },
  emptySub:     { fontSize: 12 * scale, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 17 * scale },
  emptyActions: { flexDirection: 'row', gap: 10 * scale, marginTop: 10 * scale },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6 * scale, borderWidth: 1, borderColor: 'rgba(255,107,53,0.4)', borderRadius: 10 * scale, paddingHorizontal: 12 * scale, paddingVertical: 7 * scale },
  emptyBtnTxt:  { fontSize: 12 * scale, fontWeight: '600', color: '#FF6B35' },

  // Footer
  footer:       { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', marginTop: 4 * scale },
  footerBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 * scale, paddingVertical: 12 * scale },
  footerBtnTxt: { fontSize: 12 * scale, fontWeight: '600', color: '#FF6B35' },
  footerSep:    { width: 1, height: 16 * scale, backgroundColor: 'rgba(255,255,255,0.1)' },
});
