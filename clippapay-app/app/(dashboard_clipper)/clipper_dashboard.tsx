// app/(dashboard_clipper)/clipper_dashboard.tsx
// NOTE: ProfileHeader and SafeAreaView are owned by _layout.tsx.
//       This screen is a plain scrollable page — no header, no safe area wrapper.
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Dimensions, StatusBar, TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import CreateUGCsCard   from './CreateUGCsCard';
import CreateUGCsCard_2 from './CreateUGCsCard_2';
import CreateUGCsCard_3 from './CreateUGCsCard_3';

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = process.env.EXPO_PUBLIC_API_URL;

interface EarningsStats {
  totalEarned: number;
  pendingPayout: number;
  activeJobs: number;
  completedJobs: number;
}

const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
  return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
};

const QUICK_ACTIONS = [
  { label: 'Find Clipping Jobs',  icon: 'film-outline'         as const, color: '#FF6B35', bg: '#FFF5F0', route: '/(dashboard_clipper)/join_clipping'        },
  { label: 'UGC Jobs',    icon: 'camera-outline'        as const, color: '#6366F1', bg: '#EEF2FF', route: '/(dashboard_clipper)/join_ugc'              },
  // { label: 'My Work',     icon: 'briefcase-outline'     as const, color: '#10B981', bg: '#ECFDF5', route: '/(dashboard_clipper)/my_clipping'           },
  { label: 'Wallet',      icon: 'wallet-outline'        as const, color: '#8B5CF6', bg: '#F5F3FF', route: '/(dashboard_clipper)/wallet'                },
] as const;

export default function ClipperDashboard() {
  const [stats, setStats] = useState<EarningsStats>({
    totalEarned: 0, pendingPayout: 0, activeJobs: 0, completedJobs: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [clippingRes, ugcRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/clipping/my/submissions`, { headers }),
        axios.get(`${API_BASE}/applications/my`, { headers }),
      ]);

      let totalEarned = 0, pendingPayout = 0, activeJobs = 0, completedJobs = 0;

      if (clippingRes.status === 'fulfilled') {
        for (const sub of clippingRes.value.data || []) {
          const proofs = sub.proofs || [];
          for (const p of proofs) {
            if (p.status === 'approved') { totalEarned += p.rewardAmount || 0; completedJobs++; }
            if (p.status === 'pending')  { pendingPayout += p.rewardAmount || 0; activeJobs++; }
          }
        }
      }

      if (ugcRes.status === 'fulfilled') {
        const apps = Array.isArray(ugcRes.value.data)
          ? ugcRes.value.data
          : ugcRes.value.data?.applications || [];
        for (const app of apps) {
          if (app.status === 'completed') { totalEarned += app.rewardAmount || 0; completedJobs++; }
          if (['pending', 'accepted', 'active'].includes(app.status)) activeJobs++;
        }
      }

      setStats({ totalEarned, pendingPayout, activeJobs, completedJobs });
    } catch (e) {
      console.error('Clipper stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadStats(); }, []));

  const fmtMoney = (n: number) =>
    n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `₦${(n / 1_000).toFixed(1)}K`
    : `₦${n}`;

  const STAT_ITEMS = [
    { label: 'Earned',    value: statsLoading ? '—' : fmtMoney(stats.totalEarned),      icon: 'cash-outline'      as const, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Pending',   value: statsLoading ? '—' : fmtMoney(stats.pendingPayout),    icon: 'time-outline'      as const, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Active',    value: statsLoading ? '—' : String(stats.activeJobs),         icon: 'pulse-outline'     as const, color: '#FF6B35', bg: '#FFF5F0' },
    { label: 'Completed', value: statsLoading ? '—' : String(stats.completedJobs),      icon: 'checkmark-circle-outline' as const, color: '#6366F1', bg: '#EEF2FF' },
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
          colors={['#FF6B35', '#E8520A', '#C94000']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={S.heroBand}
        >
          <View style={S.heroCircle1} />
          <View style={S.heroCircle2} />
          <View style={S.heroContent}>
            <Text style={S.heroEyebrow}>CREATOR DASHBOARD</Text>
            <Text style={S.heroHeadline}>
              What will you be{'\n'}creating today?
            </Text>
            <Text style={S.heroSub}>
              Clip, create and earn across TikTok, Instagram & more.
            </Text>
            <TouchableOpacity
              style={S.heroCTA}
              onPress={() => router.push('/(dashboard_clipper)/join_clipping')}
              activeOpacity={0.85}
            >
              <Text style={S.heroCTATxt}>Find Jobs Now</Text>
              <Ionicons name="arrow-forward" size={13 * scale} color="#FF6B35" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Stats row ── */}
        {/* <View style={S.statsRow}>
          {STAT_ITEMS.map(({ label, value, icon, color, bg }) => (
            <View key={label} style={S.statCard}>
              <View style={[S.statIcon, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={15 * scale} color={color} />
              </View>
              <Text style={[S.statValue, { color }]}>{value}</Text>
              <Text style={S.statLabel}>{label}</Text>
            </View>
          ))}
        </View> */}

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

        {/* ── Opportunity cards ── */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>Start Earning</Text>
          <TouchableOpacity onPress={() => router.push('/(dashboard_clipper)/join_clipping' as any)}>
            {/* <Text style={S.sectionLink}>See all →</Text> */}
          </TouchableOpacity>
        </View>

        <CreateUGCsCard />
        <CreateUGCsCard_2 />

        {/* ── Active work card ── */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>My Active Work</Text>
          <TouchableOpacity onPress={() => router.push('/(dashboard_clipper)/my_clipping' as any)}>
            {/* <Text style={S.sectionLink}>See all →</Text> */}
          </TouchableOpacity>
        </View>

        <CreateUGCsCard_3 />

        {/* ── Tip banner ── */}
        <View style={S.tipCard}>
          <LinearGradient colors={['#ECFDF5', '#D1FAE5']} style={S.tipGrad}>
            <View style={S.tipIcon}>
              <Ionicons name="flash-outline" size={19 * scale} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.tipTitle}>Earn More Faster</Text>
              <Text style={S.tipBody}>
                Clippers who post on 3+ platforms earn 2× more on average. Expand your reach to boost your payout.
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
  heroCTATxt: { fontSize: 13 * scale, fontWeight: '700', color: '#FF6B35' },

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
  sectionLink:  { fontSize: 13 * scale, fontWeight: '600', color: '#FF6B35' },

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
    marginHorizontal: 16 * scale, marginTop: 4 * scale,
    borderRadius: 16 * scale, overflow: 'hidden',
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  tipGrad: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 * scale, padding: 15 * scale },
  tipIcon:  { width: 34 * scale, height: 34 * scale, borderRadius: 9 * scale, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginTop: 1 * scale },
  tipTitle: { fontSize: 13 * scale, fontWeight: '800', color: '#065F46', marginBottom: 3 * scale },
  tipBody:  { fontSize: 12 * scale, color: '#047857', lineHeight: 17 * scale },
});