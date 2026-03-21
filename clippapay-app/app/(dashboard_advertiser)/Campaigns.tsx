// app/(dashboard_advertiser)/Campaigns.tsx
// Redesigned advertiser UGC campaign hub:
//  - Shows pending_approval status with clear adworker note
//  - "Mark Complete" button triggers payment to creator from escrow
//  - Status badges match the full lifecycle
//  - Proper empty states per status bucket

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, Platform, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get('window');
const scale = width / 428;

interface Campaign {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  applicationDeadline: string;
  createdAt: string;
  adworkerNote?: string;
  paymentReleased?: boolean;
  thumbnailUrl?: string;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending_approval:  { label: 'Pending Review',    color: '#D97706', bg: '#FFFBEB', icon: 'time-outline'             },
  draft:             { label: 'Draft',             color: '#6B7280', bg: '#F3F4F6', icon: 'document-outline'         },
  active:            { label: 'Live — Accepting',  color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle-outline' },
  closed:            { label: 'Closed',            color: '#6B7280', bg: '#F3F4F6', icon: 'lock-closed-outline'      },
  video_submitted:   { label: 'Video Submitted',   color: '#7C3AED', bg: '#F5F3FF', icon: 'videocam-outline'         },
  revision_requested:{ label: 'Revision Requested',color: '#F59E0B', bg: '#FFFBEB', icon: 'refresh-outline'          },
  revision_submitted:{ label: 'Revised — Review',  color: '#8B5CF6', bg: '#F5F3FF', icon: 'cloud-upload-outline'     },
  completed:         { label: 'Completed ✓',       color: '#10B981', bg: '#ECFDF5', icon: 'trophy-outline'           },
  cancelled:         { label: 'Cancelled',         color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline'     },
};

const TABS: { key: string; label: string }[] = [
  { key: 'all',           label: 'All'         },
  { key: 'pending_approval', label: 'Pending'  },
  { key: 'active',        label: 'Live'        },
  { key: 'video_submitted',  label: 'Review'   },
  { key: 'completed',     label: 'Done'        },
];

const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
  return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function CampaignsScreen() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]             = useState('all');
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.push('/login'); return; }
      const { data } = await axios.get(`${API_BASE}/campaigns/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCampaigns(data.campaigns || []);
    } catch (err) {
      Alert.alert('Error', 'Could not load your campaigns');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleComplete = async (c: Campaign) => {
    Alert.alert(
      '✅ Accept & Pay Creator',
      `This will release payment to the creator from escrow and mark "${c.title}" as completed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept & Pay',
          onPress: async () => {
            setCompleting(c._id);
            try {
              const token = await getToken();
              await axios.post(`${API_BASE}/campaigns/${c._id}/complete`, {}, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('🎉 Completed!', 'Payment released to the creator. Campaign marked complete.');
              load(true);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Could not complete campaign');
            } finally {
              setCompleting(null);
            }
          },
        },
      ]
    );
  };

  const filtered = tab === 'all' ? campaigns
    : campaigns.filter((c) => {
        if (tab === 'video_submitted') return ['video_submitted','revision_submitted','revision_requested'].includes(c.status);
        return c.status === tab;
      });

  // Counts for tab badges
  const counts: Record<string, number> = {};
  TABS.forEach((t) => {
    if (t.key === 'all') counts.all = campaigns.length;
    else if (t.key === 'video_submitted') counts.video_submitted = campaigns.filter((c) => ['video_submitted','revision_submitted','revision_requested'].includes(c.status)).length;
    else counts[t.key] = campaigns.filter((c) => c.status === t.key).length;
  });

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ color: '#9CA3AF', marginTop: 10 }}>Loading campaigns…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      {/* Header */}
      <LinearGradient colors={['#312E81','#4338CA','#4F46E5']} style={S.hdr}>
        <View style={S.navRow}>
          <View style={{ flex: 1 }}>
            <Text style={S.navTitle}>My UGC Campaigns</Text>
            <Text style={S.navSub}>{campaigns.length} total campaigns</Text>
          </View>
          <TouchableOpacity
            style={S.createBtn}
            onPress={() => router.push('/(dashboard_advertiser)/CreateUgc' as any)}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={S.createBtnTxt}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Quick stats */}
        <View style={S.statsRow}>
          {[
            { label: 'Pending', val: counts.pending_approval || 0, color: '#FCD34D' },
            { label: 'Live',    val: counts.active || 0,           color: '#6EE7B7' },
            { label: 'Review',  val: counts.video_submitted || 0,  color: '#C4B5FD' },
            { label: 'Done',    val: counts.completed || 0,        color: '#A7F3D0' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 10 }} />}
              <View style={{ alignItems: 'center' }}>
                <Text style={[S.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={S.statLbl}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabBar} contentContainerStyle={{ paddingHorizontal: 14, gap: 8, flexDirection: 'row', alignItems: 'center' }}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[S.tabBtn, tab === t.key && S.tabBtnActive]} onPress={() => setTab(t.key)}>
            <Text style={[S.tabTxt, tab === t.key && S.tabTxtActive]}>{t.label}</Text>
            {counts[t.key] > 0 && (
              <View style={[S.tabBadge, tab === t.key && { backgroundColor: '#4F46E5' }]}>
                <Text style={[S.tabBadgeTxt, tab === t.key && { color: '#FFF' }]}>{counts[t.key]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#4F46E5" />}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={S.empty}>
            <MaterialCommunityIcons name="briefcase-outline" size={56} color="#D1D5DB" />
            <Text style={S.emptyTitle}>No campaigns here</Text>
            <Text style={S.emptySub}>
              {tab === 'pending_approval' ? 'No campaigns waiting for review.' :
               tab === 'active' ? 'None of your campaigns are live yet.' :
               tab === 'video_submitted' ? 'No videos submitted yet.' :
               tab === 'completed' ? 'No completed campaigns yet.' :
               "You haven't created any campaigns yet."}
            </Text>
            {tab === 'all' && (
              <TouchableOpacity style={S.emptyBtn} onPress={() => router.push('/(dashboard_advertiser)/CreateUgc' as any)}>
                <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                <Text style={S.emptyBtnTxt}>Create Campaign</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((c) => {
            const cfg = STATUS_CFG[c.status] || STATUS_CFG.draft;
            const needsReview = ['video_submitted','revision_submitted'].includes(c.status);
            return (
              <View key={c._id} style={S.card}>
                {/* Status bar */}
                <View style={[S.statusBar, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                  <Text style={[S.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={S.statusDate}>{fmtDate(c.createdAt)}</Text>
                </View>

                <View style={S.cardBody}>
                  <Text style={S.cardTitle} numberOfLines={2}>{c.title}</Text>
                  <Text style={S.cardDesc} numberOfLines={2}>{c.description}</Text>

                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <View style={S.tag}><Text style={S.tagTxt}>{c.category}</Text></View>
                    <View style={S.tag}><Text style={S.tagTxt}>Deadline: {fmtDate(c.applicationDeadline)}</Text></View>
                  </View>

                  {/* Adworker note (pending / rejection) */}
                  {c.adworkerNote && c.status === 'draft' && (
                    <View style={S.adworkerNote}>
                      <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
                      <View style={{ flex: 1 }}>
                        <Text style={S.adworkerNoteTitle}>Changes Requested by Review Team</Text>
                        <Text style={S.adworkerNoteTxt}>{c.adworkerNote}</Text>
                      </View>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={S.actions}>
                    {/* View details / review submission */}
                    <TouchableOpacity
                      style={S.actionSecondary}
                      onPress={() => {
                        if (needsReview) {
                          router.push({ pathname: '/(dashboard_advertiser)/review-submission/[campaignId]', params: { campaignId: c._id } } as any);
                        } else if (c.status === 'active') {
                          router.push({ pathname: '/(dashboard_advertiser)/review-applications/[campaignId]', params: { campaignId: c._id } } as any);
                        } else {
                          router.push({ pathname: '/(dashboard_advertiser)/campaign-details/[id]', params: { id: c._id } } as any);
                        }
                      }}
                    >
                      <Ionicons name={needsReview ? 'eye-outline' : c.status === 'active' ? 'people-outline' : 'document-text-outline'} size={16} color="#4F46E5" />
                      <Text style={S.actionSecondaryTxt}>
                        {needsReview ? 'Review Video' : c.status === 'active' ? 'View Applicants' : 'Details'}
                      </Text>
                    </TouchableOpacity>

                    {/* Mark Complete (advertiser accepts work) */}
                    {needsReview && !c.paymentReleased && (
                      <TouchableOpacity
                        style={[S.actionPrimary, completing === c._id && { opacity: 0.6 }]}
                        onPress={() => handleComplete(c)}
                        disabled={completing === c._id}
                      >
                        {completing === c._id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                            <Text style={S.actionPrimaryTxt}>Accept & Pay</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Resubmit for review after rejection */}
                    {c.status === 'draft' && c.adworkerNote && (
                      <TouchableOpacity
                        style={[S.actionPrimary, { backgroundColor: '#D97706' }]}
                        onPress={async () => {
                          try {
                            const token = await getToken();
                            await axios.post(`${API_BASE}/campaigns/${c._id}/submit-for-review`, {}, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            Alert.alert('✅ Resubmitted!', 'Your campaign has been sent back for review.');
                            load(true);
                          } catch (err: any) {
                            Alert.alert('Error', err.response?.data?.error || 'Could not resubmit');
                          }
                        }}
                      >
                        <Ionicons name="send-outline" size={16} color="#FFF" />
                        <Text style={S.actionPrimaryTxt}>Resubmit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  hdr:       { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, marginTop: -50,},
  navRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  navTitle:  { fontSize: 22, fontWeight: '800', color: '#FFF' },
  navSub:    { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginLeft: 12 },
  createBtnTxt: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  statsRow:  { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14, alignItems: 'center' },
  statVal:   { fontSize: 20, fontWeight: '800' },
  statLbl:   { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

  tabBar:    { maxHeight: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tabBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, marginVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  tabBtnActive: { backgroundColor: '#EEF2FF' },
  tabTxt:    { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabTxtActive: { color: '#4F46E5', fontWeight: '700' },
  tabBadge:  { backgroundColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#6B7280' },

  card:      { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  statusBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  statusTxt: { fontSize: 12, fontWeight: '700', flex: 1 },
  statusDate:{ fontSize: 11, color: '#9CA3AF' },
  cardBody:  { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  cardDesc:  { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 10 },
  tag:       { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  tagTxt:    { fontSize: 12, color: '#6B7280' },

  adworkerNote:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 12, gap: 8, marginBottom: 12 },
  adworkerNoteTitle: { fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 3 },
  adworkerNoteTxt:   { fontSize: 12, color: '#92400E', lineHeight: 17 },

  actions:   { flexDirection: 'row', gap: 10 },
  actionSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EEF2FF', borderRadius: 11, paddingVertical: 11 },
  actionSecondaryTxt: { fontSize: 13, fontWeight: '600', color: '#4F46E5' },
  actionPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#4F46E5', borderRadius: 11, paddingVertical: 11 },
  actionPrimaryTxt: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle:{ fontSize: 17, fontWeight: '600', color: '#374151' },
  emptySub:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#4F46E5', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 24, marginTop: 8 },
  emptyBtnTxt: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
