// app/(dashboard_clipper)/join_ugc.tsx
// Clipper browses ACTIVE UGC campaigns and applies.
// Only campaigns with status='active' (adworker-approved) are shown.
// Cleaner design matching the clipping screen style.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, Modal, Platform, Dimensions, Image, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_BASE    = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_URL = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL || '';

interface Campaign {
  _id: string;
  title: string;
  description: string;
  category: string;
  preferredLength: string;
  applicationDeadline: string;
  thumbnailUrl: string | null;
  status: string;
  createdAt: string;
  advertiser: { firstName?: string; lastName?: string; company?: string; profileImage?: string };
  keyPhrases?: string[];
  script?: string;
  creativeDirection?: { aspectRatio?: string; preferredLocation?: string; moodTone?: string };
}

const CATEGORIES = ['All','Beauty','Tech','Food','Fashion','Lifestyle','Fitness','Travel','Gaming','Finance','Education'];

const toUrl = (p?: string | null) => (!p ? null : p.startsWith('http') ? p : `${UPLOADS_URL}${p}`);
const advLabel = (a?: Campaign['advertiser']) =>
  !a ? 'Advertiser' : a.company || `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Advertiser';
const advInitials = (a?: Campaign['advertiser']) => advLabel(a).slice(0, 2).toUpperCase();
const daysLeft = (deadline: string) => {
  const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  return d > 0 ? `${d}d left` : 'Expired';
};

const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
  return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
};

export default function JoinUGCScreen() {
  const router = useRouter();
  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All');
  const searchTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail + apply
  const [selected, setSelected]     = useState<Campaign | null>(null);
  const [detailModal, setDetail]    = useState(false);
  const [applying, setApplying]     = useState(false);
  const [rateNGN, setRateNGN]       = useState('');
  const [rateUSDT, setRateUSDT]     = useState('');
  const [note, setNote]             = useState('');
  const [applyModal, setApplyModal] = useState(false);

  const fetch = useCallback(async (opts: { refresh?: boolean; pg?: number; cat?: string; q?: string } = {}) => {
    const { refresh = false, pg = page, cat = category, q = search } = opts;
    if (refresh) setRefreshing(true);
    else if (pg === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const token = await getToken();
      if (!token) { router.push('/login'); return; }

      const params = new URLSearchParams({ page: String(refresh ? 1 : pg), limit: '12' });
      if (q) params.append('search', q);
      if (cat && cat !== 'All') params.append('category', cat);

      const { data } = await axios.get(`${API_BASE}/d/active?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list: Campaign[] = data.campaigns || [];
      if (refresh || pg === 1) { setCampaigns(list); setPage(1); }
      else setCampaigns((prev) => [...prev, ...list]);

      setTotal(data.pagination?.total || 0);
      setHasMore(pg < (data.pagination?.pages || 1));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
  }, [page, category, search]);

  useEffect(() => { fetch({ refresh: true }); }, []);

  const onSearch = (t: string) => {
    setSearch(t);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetch({ refresh: true, q: t }), 500);
  };

  const onCategory = (c: string) => {
    setCategory(c);
    fetch({ refresh: true, cat: c });
  };

  const onLoadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      const n = page + 1; setPage(n); fetch({ pg: n });
    }
  };

  const handleApply = async () => {
    if (!selected) return;
    if (!rateNGN && !rateUSDT) return Alert.alert('Set your rate', 'Enter your NGN or USDT rate to apply.');

    setApplying(true);
    try {
      const token = await getToken();
      await axios.post(`${API_BASE}/applications/${selected._id}/apply`, {
        proposedRateNGN:  rateNGN  ? Number(rateNGN)  : undefined,
        proposedRateUSDT: rateUSDT ? Number(rateUSDT) : undefined,
        note: note.trim() || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('🎉 Applied!', `Your application for "${selected.title}" has been submitted. The advertiser will review and may select you.`);
      setApplyModal(false); setDetail(false); setRateNGN(''); setRateUSDT(''); setNote('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not submit application.');
    } finally {
      setApplying(false);
    }
  };

  const renderCard = ({ item: c }: { item: Campaign }) => {
    const img = toUrl(c.thumbnailUrl);
    const days = daysLeft(c.applicationDeadline);
    const expired = days === 'Expired';
    return (
      <TouchableOpacity
        style={S.card}
        activeOpacity={0.92}
        onPress={() => { setSelected(c); setDetail(true); }}
      >
        {/* Thumbnail */}
        {img ? (
          <Image
            source={{ uri: img }}
            style={S.thumb}
            resizeMode="contain"
          />
        ) : (
          <View style={S.thumbPlaceholder}>
            <MaterialCommunityIcons name="image-outline" size={32} color="#C4B5FD" />
          </View>
        )}

        <View style={S.cardBody}>
          {/* Advertiser row */}
          <View style={S.advRow}>
            <View style={S.advAvatar}><Text style={S.advAvatarTxt}>{advInitials(c.advertiser)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={S.advName} numberOfLines={1}>{advLabel(c.advertiser)}</Text>
              <Text style={S.cardDate}>{new Date(c.createdAt).toLocaleDateString()}</Text>
            </View>
            <View style={[S.deadlineBadge, expired && S.deadlineBadgeExpired]}>
              <Ionicons name="time-outline" size={10} color={expired ? '#EF4444' : '#7C3AED'} />
              <Text style={[S.deadlineTxt, expired && { color: '#EF4444' }]}>{days}</Text>
            </View>
          </View>

          <Text style={S.cardTitle} numberOfLines={2}>{c.title}</Text>
          <Text style={S.cardDesc} numberOfLines={2}>{c.description}</Text>

          {/* Tags */}
          <View style={S.tagsRow}>
            <View style={S.tag}><Text style={S.tagTxt}>{c.category}</Text></View>
            <View style={[S.tag, { backgroundColor: '#F5F3FF' }]}>
              <Text style={[S.tagTxt, { color: '#7C3AED' }]}>{c.preferredLength}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[S.applyBtn, expired && { opacity: 0.4 }]}
            disabled={expired}
            onPress={() => { setSelected(c); setApplyModal(true); setDetail(false); }}
          >
            <Text style={S.applyBtnTxt}>Apply Now</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      {/* Header */}
      <LinearGradient colors={['#7C3AED','#6D28D9','#5B21B6']} style={S.hdr}>
        <View style={S.navRow}>
          <TouchableOpacity style={S.navBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={S.navTitle}>UGC Campaigns</Text>
          <View style={S.navBtn} />
        </View>

        <View style={S.statsChip}>
          <Text style={S.statsVal}>{total}</Text>
          <Text style={S.statsLbl}>Active Campaigns</Text>
        </View>

        <View style={S.searchBar}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={S.searchInput} placeholder="Search campaigns…"
            placeholderTextColor="rgba(255,255,255,0.55)" value={search} onChangeText={onSearch}
          />
        </View>
      </LinearGradient>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.catBar} contentContainerStyle={{ paddingHorizontal: 14, gap: 8, flexDirection: 'row' }}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[S.catChip, category === c && S.catChipActive]} onPress={() => onCategory(c)}>
            <Text style={[S.catTxt, category === c && S.catTxtActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && page === 1 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={{ color: '#9CA3AF', marginTop: 10 }}>Loading campaigns…</Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          renderItem={renderCard}
          keyExtractor={(c) => c._id}
          numColumns={1}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch({ refresh: true })} tintColor="#7C3AED" />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color="#7C3AED" /> : null}
          ListEmptyComponent={(
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <MaterialCommunityIcons name="briefcase-search-outline" size={64} color="#D1D5DB" />
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#374151' }}>No Campaigns Found</Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 }}>
                {search || category !== 'All' ? 'Try different filters.' : 'New UGC campaigns are added daily!'}
              </Text>
            </View>
          )}
        />
      )}

      {/* ── Detail Modal ── */}
      <Modal visible={detailModal} animationType="slide" transparent onRequestClose={() => setDetail(false)}>
        <View style={S.overlay}>
          <View style={S.sheet}>
            <View style={S.handle} />
            {selected && (
              <>
                <View style={S.mHdr}>
                  <TouchableOpacity style={S.mClose} onPress={() => setDetail(false)}>
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                  <Text style={S.mTitle}>Campaign Brief</Text>
                  <View style={{ width: 36 }} />
                </View>
                <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                  {toUrl(selected.thumbnailUrl) && (
                    <Image source={{ uri: toUrl(selected.thumbnailUrl)! }} style={S.detailThumb} resizeMode="contain" />
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <View style={S.advAvatar}><Text style={S.advAvatarTxt}>{advInitials(selected.advertiser)}</Text></View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>{advLabel(selected.advertiser)}</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Posted {new Date(selected.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 14 }}>{selected.title}</Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    <View style={S.tag}><Text style={S.tagTxt}>{selected.category}</Text></View>
                    <View style={[S.tag, { backgroundColor: '#F5F3FF' }]}><Text style={[S.tagTxt, { color: '#7C3AED' }]}>{selected.preferredLength}</Text></View>
                    <View style={[S.tag, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[S.tagTxt, { color: '#D97706' }]}>{daysLeft(selected.applicationDeadline)}</Text>
                    </View>
                  </View>

                  <View style={S.detailSection}>
                    <Text style={S.detailSectionTitle}>Brief</Text>
                    <Text style={S.detailSectionTxt}>{selected.description}</Text>
                  </View>

                  {selected.script && (
                    <View style={[S.detailSection, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                      <Text style={[S.detailSectionTitle, { color: '#1D4ED8' }]}>Script</Text>
                      <Text style={[S.detailSectionTxt, { color: '#1E40AF' }]}>{selected.script}</Text>
                    </View>
                  )}

                  {(selected.keyPhrases || []).length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={S.detailSectionTitle}>Key Phrases to Include</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {selected.keyPhrases!.map((kp, i) => (
                          <View key={i} style={[S.tag, { backgroundColor: '#ECFDF5' }]}>
                            <Text style={[S.tagTxt, { color: '#059669' }]}>{kp}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {selected.creativeDirection && (
                    <View style={S.detailSection}>
                      <Text style={S.detailSectionTitle}>Creative Direction</Text>
                      {[
                        ['Aspect Ratio',  selected.creativeDirection.aspectRatio],
                        ['Location',      selected.creativeDirection.preferredLocation],
                        ['Mood / Tone',   selected.creativeDirection.moodTone],
                      ].filter(([, v]) => v).map(([l, v]) => (
                        <Text key={l} style={S.detailSectionTxt}><Text style={{ fontWeight: '600' }}>{l}: </Text>{v}</Text>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[S.applyBtn, { paddingVertical: 15, marginBottom: 20 }]}
                    onPress={() => { setDetail(false); setApplyModal(true); }}
                  >
                    <Text style={[S.applyBtnTxt, { fontSize: 16 }]}>Apply to This Campaign</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Apply Modal ── */}
      <Modal visible={applyModal} animationType="slide" transparent onRequestClose={() => setApplyModal(false)}>
        <View style={S.overlay}>
          <View style={[S.sheet, { maxHeight: '75%' }]}>
            <View style={S.handle} />
            <View style={S.mHdr}>
              <TouchableOpacity style={S.mClose} onPress={() => setApplyModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
              <Text style={S.mTitle}>Submit Application</Text>
              <View style={{ width: 36 }} />
            </View>
            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 16 }}>
                {selected?.title}
              </Text>

              <View style={S.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color="#7C3AED" />
                <Text style={[S.infoBoxTxt, { color: '#5B21B6' }]}>
                  Set your rate and a short pitch. If selected, your rate will be locked in escrow. You have 2 hours to accept, then 48 hours to deliver.
                </Text>
              </View>

              <Text style={S.mLabel}>Your Rate (NGN)</Text>
              <View style={S.inputRow}>
                <Text style={S.inputPrefix}>₦</Text>
                <TextInput style={S.bigInput} value={rateNGN} onChangeText={setRateNGN} keyboardType="numeric" placeholder="e.g. 15000" placeholderTextColor="#9CA3AF" />
              </View>

              <Text style={[S.mLabel, { marginTop: 14 }]}>Your Rate (USDT)</Text>
              <View style={S.inputRow}>
                <Text style={S.inputPrefix}>$</Text>
                <TextInput style={S.bigInput} value={rateUSDT} onChangeText={setRateUSDT} keyboardType="numeric" placeholder="e.g. 10" placeholderTextColor="#9CA3AF" />
              </View>

              <Text style={[S.mLabel, { marginTop: 14 }]}>Pitch / Note (optional)</Text>
              <TextInput
                style={S.textArea} value={note} onChangeText={setNote} multiline
                placeholder="Why are you the best creator for this campaign?"
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity
                style={[S.applyBtn, { paddingVertical: 15, marginTop: 20, marginBottom: 20 }, applying && { opacity: 0.6 }]}
                onPress={handleApply} disabled={applying}
              >
                {applying ? <ActivityIndicator color="#FFF" /> : (
                  <><Text style={[S.applyBtnTxt, { fontSize: 16 }]}>Submit Application</Text><Ionicons name="send" size={18} color="#FFF" /></>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  hdr:       { paddingTop: 10, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  navRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 14 },
  navBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  navTitle:  { fontSize: 18, fontWeight: '700', color: '#FFF' },
  statsChip: { alignSelf: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 12 },
  statsVal:  { fontSize: 22, fontWeight: '800', color: '#FFF' },
  statsLbl:  { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 2 },
  searchInput:{ flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 15, color: '#FFF' },
  catBar:    { maxHeight: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  catChip:   { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 20, marginVertical: 8 },
  catChipActive:{ backgroundColor: '#EDE9FE' },
  catTxt:    { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  catTxtActive: { color: '#7C3AED', fontWeight: '700' },

  card:      { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  thumb:     { width: '100%', height: 160 },
  thumbPlaceholder: { width: '100%', height: 120, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  cardBody:  { padding: 14 },
  advRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  advAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },
  advAvatarTxt: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  advName:   { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  cardDate:  { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  deadlineBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#EDE9FE', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  deadlineBadgeExpired: { backgroundColor: '#FEF2F2' },
  deadlineTxt: { fontSize: 11, fontWeight: '600', color: '#7C3AED' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  cardDesc:  { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 10 },
  tagsRow:   { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  tag:       { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  tagTxt:    { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  applyBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 11, gap: 8 },
  applyBtnTxt: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '93%' },
  handle:    { width: 42, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2 },
  mHdr:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  mTitle:    { fontSize: 17, fontWeight: '700', color: '#111827' },
  mClose:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  mLabel:    { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputRow:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FAFAFA', paddingHorizontal: 14 },
  inputPrefix: { fontSize: 20, fontWeight: '700', color: '#9CA3AF', marginRight: 6 },
  bigInput:  { flex: 1, paddingVertical: 13, fontSize: 18, fontWeight: '700', color: '#111' },
  textArea:  { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111', minHeight: 80, textAlignVertical: 'top', backgroundColor: '#FAFAFA' },
  infoBox:   { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F5F3FF', borderRadius: 12, padding: 12, gap: 8, marginBottom: 16 },
  infoBoxTxt:{ flex: 1, fontSize: 13, lineHeight: 18 },
  detailThumb: { width: '100%', height: 180, borderRadius: 14, marginBottom: 16 },
  detailSection: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 14 },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  detailSectionTxt: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
});
