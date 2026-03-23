// app/(dashboard_clipper)/join_clipping.tsx
// FIXED:
//  - Shows clipperCpm (what clipper earns) not costPerThousand (what advertiser pays)
//  - "Per 1K Views" stat card now says "You Earn / 1K" and shows 40% rate
//  - Detail modal also shows correct clipper rate with clear label
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, Alert, ActivityIndicator, RefreshControl, Modal,
  Platform, Linking, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

interface ClippingCampaign {
  _id: string;
  title: string;
  videoUrl: string;
  budget: number;
  currency: 'NGN' | 'USDT';
  platforms: string[];
  categories: string[];
  hashtags: string[];
  directions: string[];
  ctaUrl?: string;
  estimatedViews: number;
  totalSpent: number;
  totalViews: number;
  clipsCreated: number;
  costPerThousand: number;   // advertiser pays this
  clipperCpm: number;        // clipper EARNS this (40%)
  status: string;
  createdAt: string;
  advertiser: { firstName?: string; lastName?: string; company?: string };
  hasJoined: boolean;
  remainingBudget: number;
  completionPct: number;
}
interface Stats {
  totalCampaigns: number;
  totalBudget: number;       // NGN (backward compat)
  totalBudgetNGN: number;
  totalBudgetUSDT: number;
}

const PLATFORM_OPTIONS = [
  { id: 'tiktok',    label: 'TikTok',      icon: 'logo-tiktok'    },
  { id: 'instagram', label: 'Instagram',   icon: 'logo-instagram' },
  { id: 'youtube',   label: 'YouTube',     icon: 'logo-youtube'   },
  { id: 'facebook',  label: 'Facebook',    icon: 'logo-facebook'  },
  { id: 'snapchat',  label: 'Snapchat',    icon: 'logo-snapchat'  },
  { id: 'twitter',   label: 'X / Twitter', icon: 'logo-twitter'   },
  { id: 'whatsapp',  label: 'WhatsApp',    icon: 'logo-whatsapp'  },
] as const;
const PLATFORM_MAP = Object.fromEntries(PLATFORM_OPTIONS.map((p) => [p.id, p]));

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Newest'    },
  { value: 'budget_high', label: 'Budget ↑'  },
  { value: 'budget_low',  label: 'Budget ↓'  },
  { value: 'cpm_high',    label: 'Pay ↑'     },
] as const;

const fmtMoney = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n.toLocaleString()}` : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const fmtCpm = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n}` : `$${n.toFixed(2)}`;
const advLabel = (a?: ClippingCampaign['advertiser']) =>
  !a ? 'Advertiser' : a.company || `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Advertiser';
const advInitials = (a?: ClippingCampaign['advertiser']) => advLabel(a).slice(0, 2).toUpperCase();

export default function JoinClippingScreen() {
  const router = useRouter();

  const [campaigns, setCampaigns]           = useState<ClippingCampaign[]>([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [stats, setStats]                   = useState<Stats>({ totalCampaigns: 0, totalBudget: 0, totalBudgetNGN: 0, totalBudgetUSDT: 0 });
  const [search, setSearch]                 = useState('');
  const [sortBy, setSortBy]                 = useState('newest');
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [tempPlatforms, setTempPlatforms]   = useState<string[]>([]);
  const [filterModal, setFilterModal]       = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<ClippingCampaign | null>(null);
  const [detailModal, setDetailModal]       = useState(false);
  const [joining, setJoining]               = useState(false);
  const searchTimer                         = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getToken = async () => {
    if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
    return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
  };

  const fetchCampaigns = useCallback(async (opts: {
    refresh?: boolean; newPage?: number; newSort?: string;
    newSearch?: string; newPlatforms?: string[];
  } = {}) => {
    const {
      refresh = false, newPage = page, newSort = sortBy,
      newSearch = search, newPlatforms = platformFilter,
    } = opts;

    if (refresh)            setRefreshing(true);
    else if (newPage === 1) setLoading(true);
    else                    setLoadingMore(true);

    try {
      const token = await getToken();
      if (!token) { router.push('/login'); return; }

      const params = new URLSearchParams({
        page: String(refresh ? 1 : newPage),
        limit: '10', sortBy: newSort,
      });
      if (newSearch) params.append('search', newSearch);
      if (newPlatforms.length) params.append('platforms', newPlatforms.join(','));

      const { data } = await axios.get<{ campaigns: ClippingCampaign[]; totalPages: number }>(
        `${API_BASE}/clipping/available?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (refresh || newPage === 1) { setCampaigns(data.campaigns); setPage(1); }
      else setCampaigns((prev) => [...prev, ...data.campaigns]);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('fetchCampaigns:', err);
      Alert.alert('Error', 'Could not load campaigns. Please try again.');
    } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
  }, [page, sortBy, search, platformFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const { data } = await axios.get<Stats>(`${API_BASE}/clipping/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(data);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchCampaigns({ refresh: true }); fetchStats(); }, []);

  const onSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchCampaigns({ refresh: true, newSearch: text }), 500);
  };

  const onSortChange    = (v: string) => { setSortBy(v); fetchCampaigns({ refresh: true, newSort: v }); };
  const applyFilter     = () => { setPlatformFilter(tempPlatforms); setFilterModal(false); fetchCampaigns({ refresh: true, newPlatforms: tempPlatforms }); };
  const resetFilter     = () => { setTempPlatforms([]); setPlatformFilter([]); setFilterModal(false); fetchCampaigns({ refresh: true, newPlatforms: [] }); };
  const onLoadMore      = () => { if (page < totalPages && !loadingMore && !loading) { const n = page + 1; setPage(n); fetchCampaigns({ newPage: n }); } };

  const handleJoin = async (c: ClippingCampaign) => {
    if (c.hasJoined) {
      router.push({ pathname: '/(dashboard_clipper)/submit_clipping', params: { campaignId: c._id, campaignTitle: c.title } });
      return;
    }
    setJoining(true);
    try {
      const token = await getToken();
      if (!token) return;
      await axios.post(`${API_BASE}/clipping/${c._id}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });

      const patch = (list: ClippingCampaign[]) => list.map((x) => x._id === c._id ? { ...x, hasJoined: true } : x);
      setCampaigns(patch);
      if (selectedCampaign?._id === c._id) setSelectedCampaign((s) => s && { ...s, hasJoined: true });

      Alert.alert('🎉 Joined!', `You've joined "${c.title}".\n\nPost the video on your platforms and submit proof to earn ${fmtCpm(c.clipperCpm, c.currency)} per 1,000 views!`, [
        { text: 'Submit Proof Now', onPress: () => { setDetailModal(false); router.push({ pathname: '/(dashboard_clipper)/submit_clipping', params: { campaignId: c._id, campaignTitle: c.title } }); } },
        { text: 'Later', style: 'cancel' },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not join campaign.');
    } finally {
      setJoining(false);
    }
  };

  const renderCard = ({ item: c }: { item: ClippingCampaign }) => {
    // Use clipperCpm (what they earn) or fall back to 40% of advertiser rate
    const earningRate = c.clipperCpm ?? (c.costPerThousand * 0.4);
    return (
      <TouchableOpacity activeOpacity={0.93} style={styles.card}
        onPress={() => { setSelectedCampaign(c); setDetailModal(true); }}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{advInitials(c.advertiser)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.advName} numberOfLines={1}>{advLabel(c.advertiser)}</Text>
            <Text style={styles.cardDate}>{new Date(c.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.badge, c.hasJoined ? styles.badgeJoined : styles.badgeActive]}>
            <Text style={[styles.badgeTxt, c.hasJoined && { color: '#7C3AED' }]}>
              {c.hasJoined ? 'Joined ✓' : '● Active'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{c.title}</Text>

        <View style={styles.statsRow}>
          {[
            { icon: 'cash-multiple',  label: 'Budget',        val: fmtMoney(c.budget, c.currency),              isIonicon: false },
            { icon: 'trending-up',    label: 'You Earn/1K',   val: fmtCpm(earningRate, c.currency),             isIonicon: true  },
            { icon: 'chart-line',     label: 'Target Views',  val: (c.estimatedViews / 1000).toFixed(0) + 'K',  isIonicon: false },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.statSep} />}
              <View style={styles.statCell}>
                {s.isIonicon
                  ? <Ionicons name={s.icon as any} size={14} color="#10B981" />
                  : <MaterialCommunityIcons name={s.icon as any} size={14} color="#FF6B35" />}
                <Text style={styles.statLbl}>{s.label}</Text>
                <Text style={[styles.statVal, s.label === 'You Earn/1K' && { color: '#10B981' }]} numberOfLines={1}>{s.val}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.progressRow}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${c.completionPct}%` as any }]} />
          </View>
          <Text style={styles.progTxt}>{c.completionPct}% done</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {c.platforms.map((pid) => {
            const p = PLATFORM_MAP[pid];
            return (
              <View key={pid} style={styles.pChip}>
                <Ionicons name={(p?.icon || 'globe-outline') as any} size={12} color="#FF6B35" />
                <Text style={styles.pChipTxt}>{p?.label || pid}</Text>
              </View>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={[styles.joinBtn, c.hasJoined && styles.joinBtnGhost]}
          onPress={() => handleJoin(c)}
        >
          <Text style={[styles.joinBtnTxt, c.hasJoined && { color: '#FF6B35' }]}>
            {c.hasJoined ? 'Submit Proof' : 'Join Campaign'}
          </Text>
          <Ionicons name="arrow-forward" size={15} color={c.hasJoined ? '#FF6B35' : '#FFF'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const DetailModal = () => {
    const c = selectedCampaign;
    if (!c) return null;
    const earningRate = c.clipperCpm ?? (c.costPerThousand * 0.4);
    return (
      <Modal animationType="slide" transparent visible={detailModal} onRequestClose={() => setDetailModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.mHdr}>
                <TouchableOpacity style={styles.mClose} onPress={() => setDetailModal(false)}>
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.mHdrTxt}>Campaign Details</Text>
                <View style={{ width: 36 }} />
              </View>

              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <View style={[styles.avatar, { width: 50, height: 50, borderRadius: 25 }]}>
                    <Text style={[styles.avatarTxt, { fontSize: 17 }]}>{advInitials(c.advertiser)}</Text>
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>{advLabel(c.advertiser)}</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                      Posted {new Date(c.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 19, fontWeight: '800', color: '#111827', marginBottom: 16 }}>{c.title}</Text>

                {/* Earnings highlight banner */}
                <View style={styles.earningsBanner}>
                  <MaterialCommunityIcons name="cash-multiple" size={24} color="#10B981" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 13, color: '#059669' }}>Your Earning Rate</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#10B981' }}>
                      {fmtCpm(earningRate, c.currency)} per 1,000 views
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.videoBtn}
                  onPress={() => Linking.openURL(c.videoUrl).catch(() => Alert.alert('Error', 'Could not open link.'))}>
                  <MaterialCommunityIcons name="play-circle-outline" size={22} color="#FF6B35" />
                  <Text style={{ flex: 1, fontSize: 14, color: '#FF6B35', fontWeight: '600', marginLeft: 10 }}>
                    Watch Source Video
                  </Text>
                  <Ionicons name="open-outline" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <View style={styles.statsGrid}>
                  {[
                    ['Total Budget',      fmtMoney(c.budget, c.currency)],
                    ['You Earn / 1K Views', fmtCpm(earningRate, c.currency)],
                    ['Target Views',      c.estimatedViews.toLocaleString()],
                    ['Remaining Budget',  fmtMoney(c.remainingBudget, c.currency)],
                  ].map(([lbl, val]) => (
                    <View key={lbl} style={styles.statsGridCell}>
                      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{lbl}</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: lbl === 'You Earn / 1K Views' ? '#10B981' : '#111827', marginTop: 4 }}>{val}</Text>
                    </View>
                  ))}
                </View>

                <SBlock title="Allowed Platforms">
                  <View style={styles.chipRow}>
                    {c.platforms.map((pid) => {
                      const p = PLATFORM_MAP[pid];
                      return (
                        <View key={pid} style={styles.pChip}>
                          <Ionicons name={(p?.icon || 'globe-outline') as any} size={14} color="#FF6B35" />
                          <Text style={styles.pChipTxt}>{p?.label || pid}</Text>
                        </View>
                      );
                    })}
                  </View>
                </SBlock>

                {c.directions?.length > 0 && (
                  <SBlock title="Editing Directions">
                    {c.directions.map((d, i) => (
                      <View key={i} style={{ flexDirection: 'row', marginBottom: 6 }}>
                        <Text style={{ color: '#FF6B35', marginRight: 8, fontSize: 16 }}>•</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 20 }}>{d}</Text>
                      </View>
                    ))}
                  </SBlock>
                )}

                {c.hashtags?.length > 0 && (
                  <SBlock title="Required Hashtags">
                    <View style={styles.chipRow}>
                      {c.hashtags.map((tag, i) => (
                        <View key={i} style={styles.tagChip}>
                          <Text style={styles.tagChipTxt}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </SBlock>
                )}

                <View style={styles.howBox}>
                  <Text style={styles.howTitle}>How Clipping Works</Text>
                  {[
                    ['play-circle-outline',     'Watch the source video & clip / edit it creatively'],
                    ['share-social-outline',     'Post your clip on the allowed platforms'],
                    ['cloud-upload-outline',     'Submit your post link + view count as proof'],
                    ['checkmark-circle-outline', 'Admin verifies & credits your wallet instantly'],
                    ['refresh-circle-outline',   'Update views as they grow for additional pay'],
                  ].map(([icon, txt], i) => (
                    <View key={i} style={styles.howRow}>
                      <View style={styles.howCircle}>
                        <Ionicons name={icon as any} size={18} color="#FF6B35" />
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, color: '#4B5563' }}>{txt}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.bigBtn, c.hasJoined && styles.bigBtnGhost, (joining || c.completionPct >= 100) && { opacity: 0.55 }]}
                  onPress={() => handleJoin(c)}
                  disabled={joining || c.completionPct >= 100}
                >
                  {joining ? (
                    <ActivityIndicator color={c.hasJoined ? '#FF6B35' : '#FFF'} />
                  ) : (
                    <>
                      <Text style={[styles.bigBtnTxt, c.hasJoined && { color: '#FF6B35' }]}>
                        {c.hasJoined ? 'Go to Submission' : c.completionPct >= 100 ? 'Campaign Full' : 'Join & Start Clipping'}
                      </Text>
                      <Ionicons name={c.hasJoined ? 'arrow-forward' : 'checkmark-circle'} size={18} color={c.hasJoined ? '#FF6B35' : '#FFF'} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const FilterModal = () => (
    <Modal animationType="slide" transparent visible={filterModal} onRequestClose={() => setFilterModal(false)}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { maxHeight: '65%' }]}>
          <View style={styles.handle} />
          <View style={styles.mHdr}>
            <TouchableOpacity onPress={() => setFilterModal(false)}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.mHdrTxt}>Filter by Platform</Text>
            <TouchableOpacity onPress={resetFilter}>
              <Text style={{ fontSize: 14, color: '#FF6B35', fontWeight: '600' }}>Reset</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <View style={styles.chipRow}>
              {PLATFORM_OPTIONS.map((p) => {
                const on = tempPlatforms.includes(p.id);
                return (
                  <TouchableOpacity key={p.id}
                    style={[styles.fChip, on && styles.fChipOn]}
                    onPress={() => setTempPlatforms((prev) => on ? prev.filter((x) => x !== p.id) : [...prev, p.id])}>
                    <Ionicons name={p.icon as any} size={16} color={on ? '#FF6B35' : '#6B7280'} />
                    <Text style={[styles.fChipTxt, on && { color: '#FF6B35', fontWeight: '600' }]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <View style={{ padding: 18, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
            <TouchableOpacity style={styles.bigBtn} onPress={applyFilter}>
              <Text style={styles.bigBtnTxt}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <LinearGradient colors={['#f25015', '#e23c00', '#FF6B35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradHdr}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Clipping Campaigns</Text>
          <TouchableOpacity style={[styles.navBtn, platformFilter.length > 0 && { backgroundColor: 'rgba(255,255,255,0.4)' }]}
            onPress={() => { setTempPlatforms(platformFilter); setFilterModal(true); }}>
            <Ionicons name="options-outline" size={22} color="#FFF" />
            {platformFilter.length > 0 && (
              <View style={styles.fBadge}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#FF6B35' }}>{platformFilter.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsChips}>
          <View style={{ alignItems: 'center', paddingHorizontal: 12 }}>
            <Text style={styles.scVal}>{stats.totalCampaigns}</Text>
            <Text style={styles.scLbl}>Active Campaigns</Text>
          </View>
          <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.scLbl} numberOfLines={1}>Budget Pool</Text>
            {/* Always show NGN if there's any */}
            {stats.totalBudgetNGN > 0 && (
              <Text style={styles.scVal} numberOfLines={1}>
                ₦{stats.totalBudgetNGN >= 1_000_000
                  ? `${(stats.totalBudgetNGN / 1_000_000).toFixed(1)}M`
                  : `${(stats.totalBudgetNGN / 1000).toFixed(0)}K`}
              </Text>
            )}
            {/* Show USDT on its own row if > 0 */}
            {stats.totalBudgetUSDT > 0 && (
              <Text style={[styles.scVal, { color: '#FCD34D', fontSize: 13 }]} numberOfLines={1}>
                + ${stats.totalBudgetUSDT >= 1000
                  ? `${(stats.totalBudgetUSDT / 1000).toFixed(1)}K`
                  : stats.totalBudgetUSDT.toFixed(0)} USDT
              </Text>
            )}
            {/* Fallback if no campaigns yet */}
            {stats.totalBudgetNGN === 0 && stats.totalBudgetUSDT === 0 && (
              <Text style={styles.scVal}>—</Text>
            )}
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
          <TextInput style={styles.searchInput} placeholder="Search campaigns…"
            placeholderTextColor="rgba(255,255,255,0.6)" value={search} onChangeText={onSearchChange} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 18 }} contentContainerStyle={{ paddingRight: 20 }}>
          {SORT_OPTIONS.map((o) => (
            <TouchableOpacity key={o.value} style={[styles.sPill, sortBy === o.value && styles.sPillOn]}
              onPress={() => onSortChange(o.value)}>
              <Text style={[styles.sPillTxt, sortBy === o.value && { color: '#FF6B35', fontWeight: '600' }]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {loading && page === 1 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={{ color: '#9CA3AF' }}>Fetching campaigns…</Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          renderItem={renderCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCampaigns({ refresh: true })} tintColor="#FF6B35" />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color="#FF6B35" /> : null}
          ListEmptyComponent={(
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
              <MaterialCommunityIcons name="video-off-outline" size={64} color="#D1D5DB" />
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#374151' }}>No Campaigns Found</Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 }}>
                {search || platformFilter.length ? 'Try adjusting your filters.' : 'Check back soon — new campaigns launch daily!'}
              </Text>
            </View>
          )}
        />
      )}

      <DetailModal />
      <FilterModal />
    </View>
  );
}

function SBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 }}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  gradHdr:     { paddingTop: 5, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  navRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 16 },
  navBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  navTitle:    { fontSize: 18, fontWeight: '700', color: '#FFF' },
  fBadge:      { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  statsChips:  { flexDirection: 'row', marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 14, marginBottom: 14 },
  scVal:       { fontSize: 18, fontWeight: '800', color: '#FFF' },
  scLbl:       { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 14, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 11, marginLeft: 8, fontSize: 15, color: '#FFF' },
  sPill:       { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  sPillOn:     { backgroundColor: '#FFF' },
  sPillTxt:    { fontSize: 13, color: 'rgba(255,255,255,0.9)' },

  card:        { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarTxt:   { fontSize: 14, fontWeight: '700', color: '#FFF' },
  advName:     { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  cardDate:    { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeJoined: { backgroundColor: '#EDE9FE' },
  badgeTxt:    { fontSize: 11, fontWeight: '600', color: '#15803D' },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  statsRow:    { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 12 },
  statCell:    { flex: 1, alignItems: 'center', gap: 2 },
  statLbl:     { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },
  statVal:     { fontSize: 12, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  statSep:     { width: 1, backgroundColor: '#E5E7EB' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  track:       { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginRight: 8, overflow: 'hidden' },
  fill:        { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },
  progTxt:     { fontSize: 11, color: '#6B7280', minWidth: 68 },
  pChip:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2E9', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, gap: 4 },
  pChipTxt:    { fontSize: 11, color: '#FF6B35', fontWeight: '500' },
  joinBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 12, gap: 8 },
  joinBtnGhost:{ backgroundColor: '#FEF2E9', borderWidth: 1.5, borderColor: '#FF6B35' },
  joinBtnTxt:  { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // Earnings banner
  earningsBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 14, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: '#6EE7B7' },

  // Modal
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '93%' },
  handle:      { width: 42, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2 },
  mHdr:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  mHdrTxt:     { fontSize: 17, fontWeight: '700', color: '#111827' },
  mClose:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  videoBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2E9', borderRadius: 12, padding: 14, marginBottom: 18 },
  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#F9FAFB', borderRadius: 14, padding: 8, marginBottom: 18 },
  statsGridCell:{ width: '50%', padding: 10 },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip:     { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tagChipTxt:  { fontSize: 13, color: '#3B82F6', fontWeight: '500' },
  howBox:      { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 20 },
  howTitle:    { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  howRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  howCircle:   { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bigBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B35', borderRadius: 14, paddingVertical: 15, gap: 10 },
  bigBtnGhost: { backgroundColor: '#FEF2E9', borderWidth: 1.5, borderColor: '#FF6B35' },
  bigBtnTxt:   { fontSize: 16, fontWeight: '700', color: '#FFF' },

  fChip:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  fChipOn:     { backgroundColor: '#FEF2E9', borderWidth: 1.5, borderColor: '#FF6B35' },
  fChipTxt:    { fontSize: 13, color: '#6B7280' },
});
