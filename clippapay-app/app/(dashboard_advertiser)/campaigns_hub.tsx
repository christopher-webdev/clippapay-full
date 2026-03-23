// app/(dashboard_advertiser)/campaigns_hub.tsx
// Central hub — lets the advertiser choose between UGC and Clipping campaigns.
// The footer "My Campaigns" tab points here.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────
interface HubStats {
  ugc:      { total: number; active: number };
  clipping: { total: number; active: number; totalViews: number; totalSpent: number; currency: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
  return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CampaignsHubScreen() {
  const router = useRouter();
  const [stats, setStats]       = useState<HubStats>({
    ugc:      { total: 0, active: 0 },
    clipping: { total: 0, active: 0, totalViews: 0, totalSpent: 0, currency: 'NGN' },
  });
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.push('/login'); return; }
      const headers = { Authorization: `Bearer ${token}` };

      const [ugcRes, clipRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/campaigns/my`, { headers }),
        axios.get(`${API_BASE}/campaigns/clipping?limit=200`, { headers }),
      ]);

      // UGC stats
      if (ugcRes.status === 'fulfilled') {
        const list = ugcRes.value.data.campaigns || [];
        setStats((s) => ({
          ...s,
          ugc: {
            total:  list.length,
            active: list.filter((c: any) => c.status === 'active').length,
          },
        }));
      }

      // Clipping stats
      if (clipRes.status === 'fulfilled') {
        const list = clipRes.value.data.campaigns || [];
        const totalSpent = list.reduce((a: number, c: any) => a + (c.totalSpent || 0), 0);
        const totalViews = list.reduce((a: number, c: any) => a + (c.totalViews || 0), 0);
        setStats((s) => ({
          ...s,
          clipping: {
            total:      list.length,
            active:     list.filter((c: any) => c.status === 'active').length,
            totalSpent,
            totalViews,
            currency:   list[0]?.currency || 'NGN',
          },
        }));
      }
    } catch (err) {
      console.error('hub stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <LinearGradient
        colors={['#4F46E5', '#4F46E5', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradHdr}
      >
        <Text style={styles.hdrTitle}>My Campaigns</Text>
        <Text style={styles.hdrSub}>Manage your UGC and Clipping campaigns</Text>

        {/* Total summary pills */}
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Text style={styles.pillVal}>{stats.ugc.total + stats.clipping.total}</Text>
            <Text style={styles.pillLbl}>Total</Text>
          </View>
          <View style={styles.pillDiv} />
          <View style={styles.pill}>
            <Text style={styles.pillVal}>{stats.ugc.active + stats.clipping.active}</Text>
            <Text style={styles.pillLbl}>Active</Text>
          </View>
          <View style={styles.pillDiv} />
          <View style={styles.pill}>
            <Text style={styles.pillVal}>{stats.clipping.totalViews.toLocaleString()}</Text>
            <Text style={styles.pillLbl}>Clip Views</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadStats(true); }}
            tintColor="#6366F1"
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>CHOOSE CAMPAIGN TYPE</Text>

            {/* ── UGC Card ── */}
            <TypeCard
              gradient={['#6366F1', '#4F46E5']}
              icon="people-outline"
              iconBg="rgba(255,255,255,0.2)"
              title="UGC Campaigns"
              subtitle="Commission creators to make original video content for your brand"
              stats={[
                { label: 'Total',  value: String(stats.ugc.total)  },
                { label: 'Active', value: String(stats.ugc.active) },
              ]}
              actions={[
                {
                  label: 'UGC Campaigns',
                  icon: 'grid-outline',
                  onPress: () => router.push('/(dashboard_advertiser)/Campaigns'),
                  primary: true,
                },
                {
                  label: 'Create UGC',
                  icon: 'add-circle-outline',
                  onPress: () => router.push('/(dashboard_advertiser)/onboarding_ugc'),
                  primary: false,
                },
              ]}
            />

            {/* ── Clipping Card ── */}
            <TypeCard
              gradient={['#FF6B35', '#FF8855']}
              icon="movie-edit-outline"
              iconBg="rgba(255,255,255,0.2)"
              title="Clipping Campaigns"
              subtitle="Have clippers share and distribute your existing videos across social platforms"
              stats={[
                { label: 'Total',      value: String(stats.clipping.total)               },
                { label: 'Active',     value: String(stats.clipping.active)              },
                { label: 'Views',      value: stats.clipping.totalViews.toLocaleString() },
                { label: 'Spent',      value: `₦${(stats.clipping.totalSpent / 1000).toFixed(0)}K` },
              ]}
              actions={[
                {
                  label: 'Clipping Campaigns',
                  icon: 'grid-outline',
                  onPress: () => router.push('/(dashboard_advertiser)/my_clipping_campaigns'),
                  primary: true,
                },
                {
                  label: 'Create Clipping',
                  icon: 'add-circle-outline',
                  onPress: () => router.push('/(dashboard_advertiser)/onboarding_clipping'),
                  primary: false,
                },
              ]}
            />

            {/* ── Quick actions ── */}
            {/* <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
            <View style={styles.quickRow}>
              <QuickBtn
                icon="add-circle-outline"
                label="New UGC"
                color="#6366F1"
                onPress={() => router.push('/(dashboard_advertiser)/onboarding_ugc')}
              />
              <QuickBtn
                icon="film-outline"
                label="New Clipping"
                color="#FF6B35"
                onPress={() => router.push('/(dashboard_advertiser)/onboarding_clipping')}
              />
              <QuickBtn
                icon="cash-outline"
                label="Wallet"
                color="#10B981"
                onPress={() => router.push('/(dashboard_advertiser)/WalletScreen')}
              />
            </View> */}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── TypeCard ─────────────────────────────────────────────────────────────────
function TypeCard({
  gradient, icon, iconBg, title, subtitle, stats, actions,
}: {
  gradient: string[];
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  stats: { label: string; value: string }[];
  actions: { label: string; icon: string; onPress: () => void; primary: boolean }[];
}) {
  return (
    <View style={cardStyles.wrapper}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardStyles.hdr}>
        <View style={[cardStyles.iconWrap, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={icon as any} size={28} color="#FFF" />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={cardStyles.title}>{title}</Text>
          <Text style={cardStyles.subtitle} numberOfLines={2}>{subtitle}</Text>
        </View>
      </LinearGradient>

      <View style={cardStyles.body}>
        {/* Stats row */}
        {stats.length > 0 && (
          <View style={cardStyles.statsRow}>
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={cardStyles.statDiv} />}
                <View style={cardStyles.statCell}>
                  <Text style={cardStyles.statVal}>{s.value}</Text>
                  <Text style={cardStyles.statLbl}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View style={cardStyles.actionsRow}>
          {actions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[cardStyles.actionBtn, a.primary && cardStyles.actionBtnPrimary]}
              onPress={a.onPress}
              activeOpacity={0.85}
            >
              <Ionicons
                name={a.icon as any}
                size={15}
                color={a.primary ? '#FFF' : gradient[0]}
              />
              <Text style={[cardStyles.actionTxt, a.primary && cardStyles.actionTxtPrimary]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── QuickBtn ─────────────────────────────────────────────────────────────────
function QuickBtn({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[quickStyles.btn, { borderColor: color + '33' }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[quickStyles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[quickStyles.lbl, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F5F5F7', },
  gradHdr:      { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginTop: -50},
  hdrTitle:     { fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  hdrSub:       { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 18 },
  pillRow:      { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 14 },
  pill:         { flex: 1, alignItems: 'center' },
  pillVal:      { fontSize: 18, fontWeight: '800', color: '#FFF' },
  pillLbl:      { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  pillDiv:      { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },
  body:         { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 12, marginTop: 8 },
  quickRow:     { flexDirection: 'row', gap: 10 },
});

const cardStyles = StyleSheet.create({
  wrapper:        { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 10, elevation: 4 },
  hdr:            { flexDirection: 'row', alignItems: 'center', padding: 18 },
  iconWrap:       { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  title:          { fontSize: 18, fontWeight: '800', color: '#FFF' },
  subtitle:       { fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 4, lineHeight: 17 },
  body:           { padding: 16 },
  statsRow:       { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 14 },
  statCell:       { flex: 1, alignItems: 'center' },
  statVal:        { fontSize: 16, fontWeight: '800', color: '#111827' },
  statLbl:        { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  statDiv:        { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  actionsRow:     { flexDirection: 'row', gap: 10 },
  actionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 6 },
  actionBtnPrimary:{ backgroundColor: '#6366F1', borderColor: '#6366F1' },
  actionTxt:      { fontSize: 13, fontWeight: '600', color: '#374151' },
  actionTxtPrimary:{ color: '#FFF' },
});

const quickStyles = StyleSheet.create({
  btn:      { flex: 1, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  lbl:      { fontSize: 12, fontWeight: '700' },
});