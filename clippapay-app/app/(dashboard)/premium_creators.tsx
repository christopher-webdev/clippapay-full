// app/premium_creators.tsx
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Create Animated FlatList (required for native driver scroll events)
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const { width } = Dimensions.get('window');
const scale = width / 428;

// ────────────────────────────────────────────────
// Mock Data
// ────────────────────────────────────────────────
const mockCreators = [
  {
    id: '1',
    name: 'Alex Rivera',
    description: 'Lifestyle & Tech Reviews',
    pricePerVideo: 150,
    rating: 4.9,
    completedProjects: 42,
    deliveryTime: '3 days',
    tags: ['Tech', 'Lifestyle', 'Review'],
    image: require('../../assets/images/creator1.png'),
  },
  {
    id: '2',
    name: 'Jordan Lee',
    description: 'Fitness & Wellness Specialist',
    pricePerVideo: 200,
    rating: 5.0,
    completedProjects: 78,
    deliveryTime: '5 days',
    tags: ['Fitness', 'Wellness', 'Coaching'],
    image: require('../../assets/images/creator2.png'),
  },
  {
    id: '3',
    name: 'Taylor Kim',
    description: 'Travel & Adventure Storytelling',
    pricePerVideo: 120,
    rating: 4.7,
    completedProjects: 36,
    deliveryTime: '7 days',
    tags: ['Travel', 'Adventure', 'Photography'],
    image: require('../../assets/images/creator3.png'),
  },
  {
    id: '4',
    name: 'Morgan Patel',
    description: 'Culinary & Recipe Tutorials',
    pricePerVideo: 180,
    rating: 4.8,
    completedProjects: 54,
    deliveryTime: '2 days',
    tags: ['Food', 'Cooking', 'Tutorial'],
    image: require('../../assets/images/creator4.png'),
  },
  {
    id: '5',
    name: 'Casey Chen',
    description: 'Fashion & Beauty Influencer',
    pricePerVideo: 220,
    rating: 4.9,
    completedProjects: 65,
    deliveryTime: '4 days',
    tags: ['Fashion', 'Beauty', 'Style'],
    image: require('../../assets/images/creator5.png'),
  },
  {
    id: '6',
    name: 'Riley Morgan',
    description: 'Business & Finance Education',
    pricePerVideo: 250,
    rating: 4.8,
    completedProjects: 29,
    deliveryTime: '6 days',
    tags: ['Finance', 'Business', 'Education'],
    image: require('../../assets/images/creator6.png'),
  },
];

const CATEGORIES = ['All', 'Tech', 'Fitness', 'Travel', 'Food', 'Fashion', 'Business'];

// ────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────
export default function PremiumCreators() {
  const [selectedCategory, setSelectedCategory] = useState('All');
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

  const filteredCreators = selectedCategory === 'All'
    ? mockCreators
    : mockCreators.filter(creator =>
        creator.tags.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase())
      );

  const renderCreatorItem = ({ item }: { item: typeof mockCreators[0] }) => {
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
          onPress={() => router.push(`/creator_profile?id=${item.id}`)}
        >
          <LinearGradient
            colors={['#1A1A1A', '#2A2A2A', '#3A1A2A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.premiumRibbon}>
              <Ionicons name="star" size={12 * scale} color="#FFD700" />
              <Text style={styles.premiumRibbonText}>PREMIUM</Text>
            </View>

            <Image source={item.image} style={styles.creatorImage} resizeMode="cover" />

            <View style={styles.creatorInfo}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14 * scale} color="#FFD700" />
                  <Text style={styles.rating}>{item.rating}</Text>
                </View>
              </View>

              <Text style={styles.description}>{item.description}</Text>

              <View style={styles.tagsContainer}>
                {item.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{item.completedProjects}</Text>
                  <Text style={styles.statLabel}>Projects</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{item.deliveryTime}</Text>
                  <Text style={styles.statLabel}>Delivery</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.price}>${item.pricePerVideo}</Text>
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
    shadowColor: '#FF3366',
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
});