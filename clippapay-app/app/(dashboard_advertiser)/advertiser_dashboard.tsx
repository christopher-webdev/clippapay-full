// app/(dashboard_advertiser)/advertiser_dashboard.tsx
// NOTE: ProfileHeader and SafeAreaView are provided by _layout.tsx.
//       This screen is just a plain scrollable page — no header, no safe area wrapper.
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Dimensions, StatusBar, TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import GetUGCsCard from './GetUGCsCard';
import GetUGCsCard_2 from './GetUGCsCard_2';

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = process.env.EXPO_PUBLIC_API_URL;

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalViews: number;
  totalSpent: number;
}

const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
  return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
};

const QUICK_ACTIONS = [
  { label: 'New UGC',      icon: 'videocam-outline' as const, color: '#6366F1', bg: '#EEF2FF', route: '/(dashboard_advertiser)/onboarding_ugc'     },
  { label: 'New Clipping', icon: 'film-outline'     as const, color: '#F97316', bg: '#FFF7ED', route: '/(dashboard_advertiser)/onboarding_clipping' },
  { label: 'Campaigns',    icon: 'megaphone-outline'as const, color: '#10B981', bg: '#ECFDF5', route: '/(dashboard_advertiser)/campaigns_hub'       },
  { label: 'Wallet',       icon: 'wallet-outline'   as const, color: '#8B5CF6', bg: '#F5F3FF', route: '/(dashboard_advertiser)/WalletScreen'        },
] as const;

export default function AdvertiserDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0, activeCampaigns: 0, totalViews: 0, totalSpent: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const [ugcRes, clipRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/campaigns/my`, { headers }),
        axios.get(`${API_BASE}/campaigns/clipping?limit=200`, { headers }),
      ]);
      let total = 0, active = 0, views = 0, spent = 0;
      if (ugcRes.status === 'fulfilled') {
        const list = ugcRes.value.data.campaigns || [];
        total  += list.length;
        active += list.filter((c: any) => c.status === 'active').length;
      }
      if (clipRes.status === 'fulfilled') {
        const list = clipRes.value.data.campaigns || [];
        total  += list.length;
        active += list.filter((c: any) => c.status === 'active').length;
        views   = list.reduce((a: number, c: any) => a + (c.totalViews || 0), 0);
        spent   = list.reduce((a: number, c: any) => a + (c.totalSpent || 0), 0);
      }
      setStats({ totalCampaigns: total, activeCampaigns: active, totalViews: views, totalSpent: spent });
    } catch (e) {
      console.error('Dashboard stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadStats(); }, []));

  const fmtViews = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
    : String(n);

  const fmtSpent = (n: number) =>
    n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `₦${(n / 1_000).toFixed(0)}K`
    : `₦${n}`;

  const STAT_ITEMS = [
    { label: 'Campaigns', value: statsLoading ? '—' : String(stats.totalCampaigns), icon: 'megaphone-outline' as const, color: '#6366F1', bg: '#EEF2FF' },
    { label: 'Active',    value: statsLoading ? '—' : String(stats.activeCampaigns),icon: 'pulse-outline'     as const, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Views',     value: statsLoading ? '—' : fmtViews(stats.totalViews),   icon: 'eye-outline'       as const, color: '#F97316', bg: '#FFF7ED' },
    { label: 'Spent',     value: statsLoading ? '—' : fmtSpent(stats.totalSpent),   icon: 'cash-outline'      as const, color: '#8B5CF6', bg: '#F5F3FF' },
  ];

  return (
    <View style={S.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F7" />

      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero band ── */}
        <LinearGradient
          colors={['#6366F1', '#4F46E5', '#4338CA']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={S.heroBand}
        >
          <View style={S.heroCircle1} />
          <View style={S.heroCircle2} />
          <View style={S.heroContent}>
            <Text style={S.heroEyebrow}>ADVERTISER DASHBOARD</Text>
            <Text style={S.heroHeadline}>
              Ready to launch your{'\n'}next viral campaign?
            </Text>
            <Text style={S.heroSub}>
              Reach millions across TikTok, Instagram & more.
            </Text>
            <TouchableOpacity
              style={S.heroCTA}
              onPress={() => router.push('/(dashboard_advertiser)/campaigns_hub')}
              activeOpacity={0.85}
            >
              <Text style={S.heroCTATxt}>View My Campaigns</Text>
              <Ionicons name="arrow-forward" size={13 * scale} color="#6366F1" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Stats row ── */}
        <View style={S.statsRow}>
          {STAT_ITEMS.map(({ label, value, icon, color, bg }) => (
            <View key={label} style={S.statCard}>
              <View style={[S.statIcon, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={15 * scale} color={color} />
              </View>
              <Text style={[S.statValue, { color }]}>{value}</Text>
              <Text style={S.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick actions ── */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={S.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[S.quickBtn, { borderColor: a.color + '28' }]}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
            >
              <View style={[S.quickIcon, { backgroundColor: a.bg }]}>
                <Ionicons name={a.icon} size={20 * scale} color={a.color} />
              </View>
              <Text style={[S.quickLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Campaign cards ── */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>Start a Campaign</Text>
          <TouchableOpacity onPress={() => router.push('/(dashboard_advertiser)/campaigns_hub' as any)}>
            <Text style={S.sectionLink}>See all →</Text>
          </TouchableOpacity>
        </View>

        <GetUGCsCard />
        <GetUGCsCard_2 />

        {/* ── Tip banner ── */}
        <View style={S.tipCard}>
          <LinearGradient colors={['#FFF7ED', '#FFEDD5']} style={S.tipGrad}>
            <View style={S.tipIcon}>
              <Ionicons name="bulb-outline" size={19 * scale} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.tipTitle}>Pro Tip</Text>
              <Text style={S.tipBody}>
                Clipping campaigns get 3× more reach than traditional ads.
                Try distributing an existing video today.
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 24 * scale }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  scroll:    { paddingBottom: 16 * scale },

  // Hero
  heroBand: {
    marginHorizontal: 16 * scale, marginTop: 16 * scale,
    borderRadius: 20 * scale, overflow: 'hidden',
    paddingTop: 26 * scale, paddingBottom: 22 * scale, paddingHorizontal: 22 * scale,
  },
  heroCircle1: {
    position: 'absolute', width: 160 * scale, height: 160 * scale,
    borderRadius: 80 * scale, backgroundColor: 'rgba(255,255,255,0.07)',
    top: -40 * scale, right: -30 * scale,
  },
  heroCircle2: {
    position: 'absolute', width: 90 * scale, height: 90 * scale,
    borderRadius: 45 * scale, backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20 * scale, right: 60 * scale,
  },
  heroContent:  { zIndex: 2 },
  heroEyebrow:  { fontSize: 10 * scale, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.4, marginBottom: 7 * scale },
  heroHeadline: { fontSize: 21 * scale, fontWeight: '800', color: '#FFF', lineHeight: 29 * scale, letterSpacing: -0.3, marginBottom: 7 * scale },
  heroSub:      { fontSize: 13 * scale, color: 'rgba(255,255,255,0.72)', lineHeight: 19 * scale, marginBottom: 18 * scale },
  heroCTA: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    gap: 6 * scale, backgroundColor: '#FFF',
    paddingHorizontal: 16 * scale, paddingVertical: 9 * scale, borderRadius: 50,
  },
  heroCTATxt: { fontSize: 13 * scale, fontWeight: '700', color: '#6366F1' },

  // Stats
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16 * scale,
    marginTop: 14 * scale, gap: 9 * scale,
  },
  statCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14 * scale,
    padding: 11 * scale, alignItems: 'center',
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  statIcon:  { width: 32 * scale, height: 32 * scale, borderRadius: 9 * scale, justifyContent: 'center', alignItems: 'center', marginBottom: 6 * scale },
  statValue: { fontSize: 15 * scale, fontWeight: '800', marginBottom: 2 * scale },
  statLabel: { fontSize: 9 * scale, color: '#9CA3AF', fontWeight: '500', textAlign: 'center' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16 * scale, marginTop: 22 * scale, marginBottom: 10 * scale,
  },
  sectionTitle: { fontSize: 15 * scale, fontWeight: '800', color: '#111827' },
  sectionLink:  { fontSize: 13 * scale, fontWeight: '600', color: '#6366F1' },

  // Quick actions
  quickGrid: { flexDirection: 'row', marginHorizontal: 16 * scale, gap: 9 * scale },
  quickBtn: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14 * scale,
    paddingVertical: 13 * scale, alignItems: 'center',
    borderWidth: 1.5, gap: 7 * scale,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  quickIcon:  { width: 42 * scale, height: 42 * scale, borderRadius: 21 * scale, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 11 * scale, fontWeight: '700' },

  // Tip card
  tipCard: {
    marginHorizontal: 16 * scale, marginTop: 18 * scale,
    borderRadius: 16 * scale, overflow: 'hidden',
    borderWidth: 1, borderColor: '#FED7AA',
  },
  tipGrad: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 * scale, padding: 15 * scale },
  tipIcon:  { width: 34 * scale, height: 34 * scale, borderRadius: 9 * scale, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', marginTop: 1 * scale },
  tipTitle: { fontSize: 13 * scale, fontWeight: '800', color: '#C2410C', marginBottom: 3 * scale },
  tipBody:  { fontSize: 12 * scale, color: '#9A3412', lineHeight: 17 * scale },
});