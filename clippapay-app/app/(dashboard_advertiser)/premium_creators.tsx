// app/premium_creators.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Animated,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// Create Animated FlatList (required for native driver scroll events)
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = 'https://clippapay.com/api';

const CATEGORIES = ['All', 'Tech', 'Fitness', 'Travel', 'Food', 'Fashion', 'Business'];

// ────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────
export default function PremiumCreators() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Header collapse values
  const HEADER_MAX_HEIGHT = 220 * scale;
  const HEADER_MIN_HEIGHT = 90 * scale;
  const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

  // Slide header up
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  // Fade out subtitle
  const subtitleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.7],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const getToken = async () => {
    let token = null;
    if (Platform.OS === 'web') {
      token = await AsyncStorage.getItem('userToken');
    } else {
      token = await SecureStore.getItemAsync('userToken');
      if (!token) token = await AsyncStorage.getItem('userToken');
    }
    return token;
  };

  const toFullUrl = (path) => {
    if (!path) return 'https://via.placeholder.com/300x200?text=No+Image';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('file://') || path.startsWith('ph://')) return path;
    let cleanPath = path;
    if (cleanPath.startsWith('/api/')) {
      cleanPath = cleanPath.replace('/api', '');
    } else if (cleanPath.startsWith('api/')) {
      cleanPath = cleanPath.replace('api/', '');
    }
    return `https://clippapay.com${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  useEffect(() => {
    const fetchPremiumCreators = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }

        // Fetch all clippers
        const { data: users } = await axios.get(`${API_BASE}/users?role=clipper`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Filter premium creators
        const premiumUsers = users.filter((u) => u.isPremiumCreator);

        // Fetch profiles for each premium user
        const creatorsData = await Promise.all(
          premiumUsers.map(async (u) => {
            const { data: profile } = await axios.get(`${API_BASE}/clipper-profile/${u._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            return {
              ...profile,
              id: u._id,
              name: `${profile.user.firstName || ''} ${profile.user.lastName || ''}`.trim() || 'Anonymous Creator',
              rating: profile.user.rating || 0,
            };
          })
        );

        setCreators(creatorsData);
      } catch (err) {
        console.error('Error fetching premium creators:', err);
        setError(err.response?.data?.error || 'Failed to load premium creators. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPremiumCreators();
  }, []);

  const filteredCreators = selectedCategory === 'All'
    ? creators
    : creators.filter((creator) =>
        creator.categories?.some((tag) => tag.toLowerCase() === selectedCategory.toLowerCase())
      );

  const renderCreatorItem = ({ item }) => {
    const description = item.categories?.length > 0 ? `${item.categories.join(' & ')} Specialist` : 'Content Creator';
    const pricePerVideo = item.ratePerVideo || 0;
    const completedProjects = item.completedProjects || 0;
    const deliveryTime = item.expectedDelivery ? `${item.expectedDelivery} days` : 'N/A';
    const tags = item.categories || [];
    const imageUri = toFullUrl(item.profileImage);

    return (
      <Animated.View
        style={{
          opacity: scrollY.interpolate({
            inputRange: [0, 100],
            outputRange: [0.6, 1],
            extrapolate: 'clamp',
          }),
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [30, 0],
                extrapolate: 'clamp',
              }),
            },
          ],
          marginBottom: 24 * scale,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.cardWrapper}
          onPress={() => router.push(`/premium_creator_hire?id=${item.id}`)}
        >
          <LinearGradient
            colors={['#343434', '#2A2A2A', '#3A1A2A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.premiumRibbon}>
              <Ionicons name="star" size={12 * scale} color="#FFD700" />
              <Text style={styles.premiumRibbonText}>PREMIUM</Text>
            </View>

            <Image source={{ uri: imageUri }} style={styles.creatorImage} resizeMode="cover" />

            <View style={styles.creatorInfo}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14 * scale} color="#FFD700" />
                  <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
                </View>
              </View>

              <Text style={styles.description}>{description}</Text>

              <View style={styles.tagsContainer}>
                {tags.map((tag, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{completedProjects}</Text>
                  <Text style={styles.statLabel}>Projects</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{deliveryTime}</Text>
                  <Text style={styles.statLabel}>Delivery</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.price}>${pricePerVideo}</Text>
                  <Text style={styles.statLabel}>/video</Text>
                </View>
              </View>

              <TouchableOpacity activeOpacity={0.85} style={styles.ctaButton}>
                <LinearGradient
                  colors={['#FF3366', '#FF6B35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.ctaButtonText}>HIRE NOW</Text>
                <Ionicons name="arrow-forward" size={18 * scale} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3366" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <LinearGradient
        colors={['#0F0F0F', '#1A1A1A', '#252525']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.container}>
        {/* Collapsing Header */}
        <Animated.View
          style={[
            styles.header,
            {
              transform: [{ translateY: headerTranslate }],
            },
          ]}
        >
          <Text style={styles.headerTitle}>Premium Creators</Text>
          <Animated.Text style={[styles.headerSubtitle, { opacity: subtitleOpacity }]}>
            Hire top-tier verified professionals
          </Animated.Text>
        </Animated.View>

        {/* Scrollable content: categories + stats + list */}
        <AnimatedFlatList
          data={filteredCreators}
          renderItem={renderCreatorItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={() => (
            <>
              {/* Category Chips */}
              <View style={styles.categoriesWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesContainer}
                >
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        selectedCategory === category && styles.categoryChipActive,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          selectedCategory === category && styles.categoryTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Stats Bar */}
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <Text style={styles.statItemNumber}>{filteredCreators.length}</Text>
                  <Text style={styles.statItemLabel}>Creators</Text>
                </View>
                <View style={styles.statDividerVertical} />
                <View style={styles.statItem}>
                  <Text style={styles.statItemNumber}>4.8+</Text>
                  <Text style={styles.statItemLabel}>Avg Rating</Text>
                </View>
                <View style={styles.statDividerVertical} />
                <View style={styles.statItem}>
                  <Text style={styles.statItemNumber}>24h</Text>
                  <Text style={styles.statItemLabel}>Response</Text>
                </View>
              </View>
            </>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No premium creators available at this time</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      </SafeAreaView>
    </View>
  );
}

// ────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    backgroundColor: '#0F0F0F',
    // paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 24 * scale,
    paddingBottom: 12 * scale,
    zIndex: 100,
    borderBottomWidth: 1,
    // borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 32 * scale,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 15 * scale,
    color: '#BBBBBB',
    marginTop: 4 * scale,
    fontWeight: '500',
  },
  categoriesWrapper: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 12 * scale,
    marginTop: 178 * scale,
  },
  categoriesContainer: {
    paddingHorizontal: 20 * scale,
  },
  categoryChip: {
    paddingHorizontal: 20 * scale,
    paddingVertical: 10 * scale,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 12 * scale,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(255,51,102,0.25)',
    borderColor: '#FF3366',
  },
  categoryText: {
    color: '#CCCCCC',
    fontWeight: '600',
    fontSize: 14 * scale,
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 20 * scale,
    marginVertical: 16 * scale,
    borderRadius: 20 * scale,
    paddingVertical: 16 * scale,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemNumber: {
    fontSize: 22 * scale,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statItemLabel: {
    fontSize: 12 * scale,
    color: '#AAAAAA',
    marginTop: 4 * scale,
    fontWeight: '500',
  },
  statDividerVertical: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 80 * scale,
  },
  cardWrapper: {
    borderRadius: 28 * scale,
    overflow: 'hidden',
    marginHorizontal: 20 * scale,
    marginBottom: 24 * scale,
    // shadowColor: '#33151c',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: Platform.OS === 'android' ? 10 : 0,
  },
  card: {
    borderRadius: 28 * scale,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  premiumRibbon: {
    position: 'absolute',
    top: 16 * scale,
    left: 16 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12 * scale,
    paddingVertical: 6 * scale,
    borderRadius: 20 * scale,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
  },
  premiumRibbonText: {
    color: '#FFD700',
    fontSize: 11 * scale,
    fontWeight: '800',
    marginLeft: 6 * scale,
  },
  creatorImage: {
    width: '100%',
    height: 200 * scale,
  },
  creatorInfo: {
    padding: 20 * scale,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10 * scale,
  },
  name: {
    fontSize: 24 * scale,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: 10 * scale,
    paddingVertical: 4 * scale,
    borderRadius: 12 * scale,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  rating: {
    color: '#FFD700',
    fontSize: 14 * scale,
    fontWeight: '700',
    marginLeft: 4 * scale,
  },
  description: {
    fontSize: 15 * scale,
    color: '#CCCCCC',
    lineHeight: 22 * scale,
    marginBottom: 14 * scale,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16 * scale,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12 * scale,
    paddingVertical: 6 * scale,
    borderRadius: 20 * scale,
    marginRight: 8 * scale,
    marginBottom: 8 * scale,
  },
  tagText: {
    color: '#DDDDDD',
    fontSize: 12 * scale,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16 * scale,
    paddingVertical: 12 * scale,
    marginBottom: 16 * scale,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18 * scale,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11 * scale,
    color: '#AAAAAA',
    marginTop: 2 * scale,
  },
  price: {
    fontSize: 20 * scale,
    fontWeight: '900',
    color: '#FF8A65',
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center',
  },
  ctaButton: {
    borderRadius: 20 * scale,
    overflow: 'hidden',
    marginTop: 8 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16 * scale,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16 * scale,
    fontWeight: '800',
    marginRight: 10 * scale,
    zIndex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    padding: 20 * scale,
  },
  errorText: {
    color: '#FF3366',
    fontSize: 16 * scale,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40 * scale,
    alignItems: 'center',
  },
  emptyText: {
    color: '#AAAAAA',
    fontSize: 16 * scale,
    textAlign: 'center',
  },
});