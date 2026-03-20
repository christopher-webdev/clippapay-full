// app/(dashboard_advertiser)/Campaigns.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, StyleSheet,
  Dimensions, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width: SW } = Dimensions.get('window');

const API_URL          = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_BASE_URL = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL;

const toFullUrl = (p: string | null) => {
  if (!p) return null;
  if (p.startsWith('http')) return p;
  return `${UPLOADS_BASE_URL}${p.startsWith('/') ? p : '/' + p}`;
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Status =
  | 'draft' | 'active' | 'closed' | 'completed'
  | 'cancelled' | 'video_submitted' | 'revision_submitted';

type Campaign = {
  _id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  category: string;
  status: Status;
  applicationDeadline: string;
  createdAt: string;
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<Status, {
  label: string; color: string; bg: string;
  icon: string; gradient: [string, string];
}> = {
  active:             { label: 'Active',            color: '#059669', bg: '#ECFDF5', icon: 'radio-button-on',   gradient: ['#059669', '#10B981'] },
  draft:              { label: 'Draft',              color: '#B45309', bg: '#FFFBEB', icon: 'create-outline',    gradient: ['#D97706', '#F59E0B'] },
  video_submitted:    { label: 'Video to Review',    color: '#5B21B6', bg: '#F5F3FF', icon: 'videocam',          gradient: ['#5B21B6', '#7C3AED'] },
  revision_submitted: { label: 'Revision to Review', color: '#C2410C', bg: '#FFF7ED', icon: 'refresh-circle',   gradient: ['#C2410C', '#EA580C'] },
  completed:          { label: 'Completed',           color: '#1D4ED8', bg: '#EFF6FF', icon: 'checkmark-circle', gradient: ['#1D4ED8', '#3B82F6'] },
  closed:             { label: 'Closed',              color: '#374151', bg: '#F9FAFB', icon: 'lock-closed',      gradient: ['#374151', '#6B7280'] },
  cancelled:          { label: 'Cancelled',           color: '#991B1B', bg: '#FEF2F2', icon: 'close-circle',     gradient: ['#991B1B', '#EF4444'] },
};

const FILTERS = [
  { value: 'all',             label: 'All'     },
  { value: 'active',          label: 'Active'  },
  { value: 'draft',           label: 'Draft'   },
  { value: 'video_submitted', label: 'Review'  },
  { value: 'completed',       label: 'Done'    },
];

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const getNav = (c: Campaign) => {
  const base = '/(dashboard_advertiser)/';
  switch (c.status) {
    case 'video_submitted':
    case 'revision_submitted':
      return { pathname: `${base}review-submission/[campaignId]`, params: { campaignId: c._id } };
    case 'completed':
      return { pathname: `${base}completed/[campaignId]`, params: { campaignId: c._id } };
    default:
      return { pathname: `${base}campaign-details/[id]`, params: { id: c._id } };
  }
};

const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
  return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function MyCampaignsScreen() {
  const router = useRouter();
  const [all, setAll]               = useState<Campaign[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('all');

  const filtered = filter === 'all' ? all : all.filter((c) => c.status === filter);

  const counts = FILTERS.reduce((acc, f) => {
    acc[f.value] = f.value === 'all'
      ? all.length
      : all.filter((c) => c.status === f.value).length;
    return acc;
  }, {} as Record<string, number>);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.replace('/(auth)/login'); return; }
      const res = await fetch(`${API_URL}/campaigns/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setAll(data.campaigns || []);
    } catch (e: any) {
      console.error('fetch campaigns:', e);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Card ──────────────────────────────────────────────────────────────────
  const renderCard = ({ item: c, index }: { item: Campaign; index: number }) => {
    const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.draft;
    const needsAction = c.status === 'video_submitted' || c.status === 'revision_submitted';

    return (
      <Animated.View entering={FadeInDown.delay(index * 55).springify()}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.card}
          onPress={() => router.push(getNav(c))}
        >
          {/* Thumbnail */}
          <View style={styles.thumbWrap}>
            {c.thumbnailUrl ? (
              <Image
                source={{ uri: toFullUrl(c.thumbnailUrl) ?? undefined }}
                style={styles.thumb}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={['#1E1B4B', '#312E81', '#4338CA']}
                style={[styles.thumb, styles.thumbGrad]}
              >
                <MaterialCommunityIcons
                  name="image-filter-frames"
                  size={40}
                  color="rgba(255,255,255,0.15)"
                />
                <Text style={styles.thumbNoImgText} numberOfLines={3}>{c.title}</Text>
              </LinearGradient>
            )}

            {/* Bottom fade */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.65)']}
              style={styles.thumbFade}
            />

            {/* Status pill */}
            <View style={[styles.statusPill, { backgroundColor: cfg.color }]}>
              <Ionicons name={cfg.icon as any} size={11} color="#FFF" />
              <Text style={styles.statusPillTxt}>{cfg.label}</Text>
            </View>

            {/* Needs-attention pulse badge */}
            {needsAction && (
              <View style={styles.urgentBadge}>
                <Ionicons name="alert-circle" size={11} color="#FFF" />
                <Text style={styles.urgentBadgeTxt}>Needs attention</Text>
              </View>
            )}

            {/* Category chip bottom left */}
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipTxt}>{c.category}</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>{c.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color="#A5B4FC" />
                <Text style={styles.metaTxt}>Due {fmtDate(c.applicationDeadline)}</Text>
              </View>
              <View style={styles.metaDot} />
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color="#A5B4FC" />
                <Text style={styles.metaTxt}>{fmtDate(c.createdAt)}</Text>
              </View>
            </View>

            {/* CTA */}
            {needsAction ? (
              <LinearGradient
                colors={cfg.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradBtn}
              >
                <Ionicons name={cfg.icon as any} size={15} color="#FFF" />
                <Text style={styles.ctaBtnTxt}>
                  {c.status === 'video_submitted' ? 'Review Video' : 'Review Revision'}
                </Text>
                <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            ) : (
              <View style={styles.openBtn}>
                <Text style={styles.openBtnTxt}>
                  {c.status === 'active'    ? 'View Applications' :
                   c.status === 'draft'     ? 'Edit Draft'        :
                   c.status === 'completed' ? 'View Results'      : 'Open'}
                </Text>
                <Ionicons name="chevron-forward" size={15} color="#6366F1" />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingTxt}>Loading campaigns…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEye}>UGC CAMPAIGNS</Text>
          <Text style={styles.headerTitle}>{all.length} Campaign{all.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(dashboard_advertiser)/CreateUgc')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.newBtnTxt}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={styles.strip}>
        {[
          { label: 'Active',  val: all.filter(c => c.status === 'active').length,         col: '#10B981' },
          { label: 'Review',  val: all.filter(c => ['video_submitted','revision_submitted'].includes(c.status)).length, col: '#7C3AED' },
          { label: 'Done',    val: all.filter(c => c.status === 'completed').length,       col: '#3B82F6' },
          { label: 'Draft',   val: all.filter(c => c.status === 'draft').length,           col: '#F59E0B' },
        ].map((s, i) => (
          <View key={s.label} style={[styles.stripCell, i < 3 && { borderRightWidth: 1, borderRightColor: '#F0F0F8' }]}>
            <Text style={[styles.stripVal, { color: s.col }]}>{s.val}</Text>
            <Text style={styles.stripLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsWrap}
        contentContainerStyle={styles.tabs}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.tab, filter === f.value && styles.tabOn]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.tabTxt, filter === f.value && styles.tabTxtOn]}>{f.label}</Text>
            {counts[f.value] > 0 && (
              <View style={[styles.tabBubble, filter === f.value && styles.tabBubbleOn]}>
                <Text style={[styles.tabBubbleTxt, filter === f.value && { color: '#FFF' }]}>
                  {counts[f.value]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Campaign list */}
      <FlatList
        data={filtered}
        renderItem={renderCard}
        keyExtractor={(c) => c._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient
              colors={['#EEF2FF', '#E0E7FF']}
              style={styles.emptyIconWrap}
            >
              <Ionicons name="megaphone-outline" size={44} color="#6366F1" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>
              {filter === 'all' ? 'No campaigns yet' : `No ${filter.replace(/_/g, ' ')} campaigns`}
            </Text>
            <Text style={styles.emptySub}>
              {filter === 'all'
                ? 'Launch your first UGC campaign and start receiving creator applications.'
                : 'Try a different filter to see your campaigns.'}
            </Text>
            {filter === 'all' && (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(dashboard_advertiser)/CreateUgc')}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                <Text style={styles.emptyBtnTxt}>Create Campaign</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F8F8FC' },

  // Header
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, backgroundColor: '#FFF' },
  headerEye:      { fontSize: 10, fontWeight: '700', letterSpacing: 2.5, color: '#A5B4FC', marginBottom: 2 },
  headerTitle:    { fontSize: 24, fontWeight: '800', color: '#0F0F1A', letterSpacing: -0.5 },
  newBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.38, shadowRadius: 8, elevation: 6 },
  newBtnTxt:      { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // Stats strip
  strip:          { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F8', borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  stripCell:      { flex: 1, alignItems: 'center', paddingVertical: 11 },
  stripVal:       { fontSize: 19, fontWeight: '800' },
  stripLbl:       { fontSize: 10, color: '#9CA3AF', fontWeight: '500', marginTop: 1, letterSpacing: 0.3 },

  // Filter tabs
  tabsWrap:       { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F8', flexGrow: 0, flexShrink: 0 },
  tabs:           { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  tab:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 22, backgroundColor: '#F3F4F6', gap: 5 },
  tabOn:          { backgroundColor: '#6366F1' },
  tabTxt:         { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  tabTxtOn:       { color: '#FFF' },
  tabBubble:      { backgroundColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 6, minWidth: 20, alignItems: 'center' },
  tabBubbleOn:    { backgroundColor: 'rgba(255,255,255,0.28)' },
  tabBubbleTxt:   { fontSize: 11, fontWeight: '700', color: '#6B7280' },

  // List
  list:           { padding: 16, paddingBottom: 32 },

  // Card
  card:           { backgroundColor: '#FFF', borderRadius: 22, marginBottom: 16, overflow: 'hidden', shadowColor: '#4338CA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 18, elevation: 5 },

  // Thumbnail
  thumbWrap:      { width: '100%', height: 175, position: 'relative' },
  thumb:          { width: '100%', height: '100%' },
  thumbGrad:      { justifyContent: 'center', alignItems: 'center', gap: 10 },
  thumbNoImgText: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.55)', paddingHorizontal: 20, textAlign: 'center' },
  thumbFade:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: 75 },

  statusPill:     { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 22, gap: 5 },
  statusPillTxt:  { fontSize: 11, fontWeight: '700', color: '#FFF', letterSpacing: 0.2 },

  urgentBadge:    { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  urgentBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  categoryChip:   { position: 'absolute', bottom: 10, left: 12, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryChipTxt:{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },

  // Content
  content:        { padding: 16 },
  title:          { fontSize: 17, fontWeight: '800', color: '#0F0F1A', lineHeight: 23, marginBottom: 9, letterSpacing: -0.2 },

  metaRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8, flexWrap: 'wrap' },
  metaItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt:        { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  metaDot:        { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D1D5DB' },

  ctaGradBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 13, gap: 7 },
  ctaBtnTxt:      { fontSize: 14, fontWeight: '700', color: '#FFF' },
  openBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 13, borderWidth: 1.5, borderColor: '#E0E7FF', gap: 4 },
  openBtnTxt:     { fontSize: 14, fontWeight: '700', color: '#6366F1' },

  // Loading
  loadingWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F8FC', gap: 12 },
  loadingTxt:     { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },

  // Empty
  empty:          { alignItems: 'center', paddingTop: 52, paddingHorizontal: 32 },
  emptyIconWrap:  { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle:     { fontSize: 20, fontWeight: '800', color: '#0F0F1A', marginBottom: 8, textAlign: 'center' },
  emptySub:       { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  emptyBtn:       { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 8, elevation: 5 },
  emptyBtnTxt:    { fontSize: 15, fontWeight: '700', color: '#FFF' },
});