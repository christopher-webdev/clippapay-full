// app/(dashboard_clipper)/my_clipping.tsx
// Clipper's personal clipping hub:
//  - All campaigns they've joined
//  - Proof status per campaign
//  - Quick links to submit/update proof
//  - Earnings summary

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, Platform, Alert,
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

const fmtMoney = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n.toLocaleString()}` : `$${n.toFixed(4)}`;

const STATUS_CONFIG = {
  pending:  { color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline'              },
  approved: { color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle-outline'  },
  rejected: { color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline'      },
};

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: 'logo-tiktok', instagram: 'logo-instagram', youtube: 'logo-youtube',
  facebook: 'logo-facebook', snapchat: 'logo-snapchat', twitter: 'logo-twitter',
  whatsapp: 'logo-whatsapp',
};

export default function MyClippingScreen() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const getToken = async () => {
    if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
    return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
  };

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

  // Totals
  const totalEarned        = submissions.reduce((s, sub) => s + sub.totalEarned, 0);
  const totalVerifiedViews = submissions.reduce((s, sub) => s + sub.totalVerifiedViews, 0);
  const totalPending       = submissions.reduce((s, sub) => s + sub.pendingProofs, 0);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

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

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#FF6B35" />}
        showsVerticalScrollIndicator={false}
      >
        {submissions.length === 0 ? (
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
          submissions.map((sub) => (
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
  gradHdr:        { paddingTop: 56, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  navRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 16 },
  navBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  navTitle:       { fontSize: 17, fontWeight: '700', color: '#FFF' },
  summaryRow:     { flexDirection: 'row', marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 14 },
  summaryCell:    { flex: 1, alignItems: 'center' },
  summaryVal:     { fontSize: 16, fontWeight: '800', color: '#FFF' },
  summaryLbl:     { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  summaryDiv:     { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },

  empty:          { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle:     { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptySub:       { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
  joinCta:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6B35', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  joinCtaTxt:     { fontSize: 15, fontWeight: '700', color: '#FFF' },

  card:           { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTop:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  filmIcon:       { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FEF2E9', justifyContent: 'center', alignItems: 'center' },
  campTitle:      { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 20 },
  campRate:       { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 3 },
  campStatus:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusActive:   { backgroundColor: '#DCFCE7' },
  statusOther:    { backgroundColor: '#F3F4F6' },
  campStatusTxt:  { fontSize: 11, fontWeight: '600', color: '#15803D' },

  earningsRow:    { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 12 },
  earnCell:       { flex: 1, alignItems: 'center' },
  earnVal:        { fontSize: 15, fontWeight: '800', color: '#111827' },
  earnLbl:        { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  earnDiv:        { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8 },

  proofsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  proofChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  proofChipTxt:   { fontSize: 12, fontWeight: '600' },

  actionsRow:     { flexDirection: 'row', gap: 10 },
  actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 12, gap: 8 },
  actionBtnPrimaryTxt: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
