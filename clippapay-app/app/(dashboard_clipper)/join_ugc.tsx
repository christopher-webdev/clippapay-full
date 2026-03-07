// app/(dashboard)/clipper/browse-campaigns.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TextInput,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const THUMBNAIL_SIZE = 70;

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_BASE_URL = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL;

const toFullUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${UPLOADS_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

type Campaign = {
  _id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  category: string;
  preferredLength: string;
  applicationDeadline: string;
  advertiser: {
    firstName: string;
    lastName: string;
    company?: string;
    rating: number;
    profileImage?: string;
  };
  status: string;
  createdAt: string;
  reward?: string;
  slots?: number;
};

// Categories with icons for filter
const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'Beauty', label: 'Beauty', icon: 'color-palette-outline' },
  { id: 'Tech', label: 'Tech', icon: 'hardware-chip-outline' },
  { id: 'Food', label: 'Food', icon: 'restaurant-outline' },
  { id: 'Fashion', label: 'Fashion', icon: 'shirt-outline' },
  { id: 'Lifestyle', label: 'Lifestyle', icon: 'leaf-outline' },
  { id: 'Fitness', label: 'Fitness', icon: 'fitness-outline' },
  { id: 'Travel', label: 'Travel', icon: 'airplane-outline' },
  { id: 'Gaming', label: 'Gaming', icon: 'game-controller-outline' },
];

export default function BrowseCampaignsScreen() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCampaigns = useCallback(async (
    isRefresh = false, 
    category?: string | null, 
    search?: string,
    pageNum = 1
  ) => {
    if (isRefresh) {
      setRefreshing(true);
      setPage(1);
    } else if (pageNum > 1) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      // Build query params
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', '30'); // Increased to 30 per page
      
      if (category && category !== 'all') {
        params.append('category', category);
      }
      
      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const url = `${API_URL}/d/active?${params.toString()}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load campaigns');

      // Update campaigns list
      if (pageNum === 1) {
        setCampaigns(data.campaigns || []);
      } else {
        setCampaigns(prev => [...prev, ...(data.campaigns || [])]);
      }

      // Update pagination and count
      setHasMore(data.campaigns?.length === 30);
      if (data.total) setTotalCount(data.total);

    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [router]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCampaigns(false, selectedCategory, searchQuery, 1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const onRefresh = () => {
    fetchCampaigns(true, selectedCategory, searchQuery, 1);
  };

  const loadMore = () => {
    if (hasMore && !loadingMore && !refreshing) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchCampaigns(false, selectedCategory, searchQuery, nextPage);
    }
  };

  const formatDeadline = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Expired', color: '#ef4444' };
    if (diffDays === 0) return { text: 'Today', color: '#f59e0b' };
    if (diffDays <= 3) return { text: `${diffDays}d left`, color: '#f59e0b' };
    return { text: `${diffDays}d left`, color: '#10b981' };
  };

  const renderCampaign = ({ item }: { item: Campaign }) => {
    const deadline = formatDeadline(item.applicationDeadline);
    const isUrgent = deadline.color === '#f59e0b';
    const advertiserName = item.advertiser.company || 
      `${item.advertiser.firstName} ${item.advertiser.lastName.charAt(0)}.`;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({
          pathname: '/(dashboard_clipper)/campaign-detail/[id]',
          params: { id: item._id },
        })}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ 
              uri: toFullUrl(item.thumbnailUrl) || 'https://via.placeholder.com/70/6366f1/ffffff?text=UGC' 
            }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          
          {/* Urgent Badge */}
          {isUrgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="time" size={10} color="#fff" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.reward} numberOfLines={1}>
              {item.reward || '$'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            {/* Category */}
            <View style={styles.categoryBadge}>
              <Ionicons 
                name={CATEGORIES.find(c => c.id === item.category)?.icon || 'pricetag-outline'} 
                size={12} 
                color="#6366f1" 
              />
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>

            {/* Length */}
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color="#64748b" />
              <Text style={styles.metaText}>{item.preferredLength}</Text>
            </View>

            {/* Slots */}
            {item.slots && (
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={12} color="#64748b" />
                <Text style={styles.metaText}>{item.slots}</Text>
              </View>
            )}
          </View>

          <View style={styles.footerRow}>
            <View style={styles.advertiserInfo}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={styles.ratingText}>{item.advertiser.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.advertiserName} numberOfLines={1}>
                • {advertiserName}
              </Text>
            </View>

            <View style={styles.deadlineContainer}>
              <Ionicons name="calendar-outline" size={12} color={deadline.color} />
              <Text style={[styles.deadline, { color: deadline.color }]}>
                {deadline.text}
              </Text>
            </View>
          </View>
        </View>

        {/* Apply Arrow */}
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Title and Count */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Available Campaigns</Text>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Find Opportunities</Text>
            {totalCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{totalCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Search Bar - Prominent */}
      {/* <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search campaigns by title, brand, category..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View> */}

      {/* Categories - Horizontal Scroll */}
      <View style={styles.categoriesWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                (selectedCategory === cat.id || (cat.id === 'all' && !selectedCategory)) && 
                styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id === 'all' ? null : cat.id)}
            >
              <Ionicons 
                name={cat.icon as any} 
                size={16} 
                color={(selectedCategory === cat.id || (cat.id === 'all' && !selectedCategory)) 
                  ? '#fff' 
                  : '#6366f1'
                } 
              />
              <Text
                style={[
                  styles.categoryChipText,
                  (selectedCategory === cat.id || (cat.id === 'all' && !selectedCategory)) && 
                  styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Active Filters Indicator */}
      {(searchQuery || selectedCategory) && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersText}>Filters active</Text>
          <TouchableOpacity 
            onPress={() => {
              setSearchQuery('');
              setSelectedCategory(null);
            }}
          >
            <Text style={styles.clearFiltersText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#6366f1" />
        <Text style={styles.footerLoaderText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={campaigns}
        renderItem={renderCampaign}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={15}
        removeClippedSubviews={true}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={32} color="#6366f1" />
              </View>
              <Text style={styles.emptyTitle}>No campaigns found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? `No matches for "${searchQuery}"`
                  : 'Try adjusting your filters'}
              </Text>
            </View>
          ) : null
        }
      />
      
      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )}
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginTop: 100,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  greeting: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  categoriesWrapper: {
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  categoryChipText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#475569' 
  },
  categoryChipTextActive: { 
    color: '#fff' 
  },
  activeFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    marginTop: 4,
  },
  activeFiltersText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  list: { 
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  urgentBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  reward: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  advertiserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
  },
  advertiserName: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadline: { 
    fontSize: 11, 
    fontWeight: '600',
  },
  arrowContainer: {
    justifyContent: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 13,
    color: '#64748b',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: { 
    alignItems: 'center', 
    padding: 40, 
    marginTop: 40,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1e293b', 
    marginBottom: 4,
  },
  emptySubtitle: { 
    fontSize: 14, 
    color: '#64748b', 
    textAlign: 'center', 
  },
});