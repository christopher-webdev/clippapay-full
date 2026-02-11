// app/(dashboard)/join_ugc.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const API_BASE = 'https://clippapay.com/api';

interface PGCCampaign {
  _id: string;
  title: string;
  kind: 'pgc';
  brief: string;
  deliverables: string[];
  assets: string[];
  approvalCriteria: string;
  pgcAddons: string[];
  script: string;
  budget_total: number;
  clipper_cpm: number;
  desiredVideos: number;
  approvedVideosCount: number;
  clippersCount: number;
  status: string;
  createdAt: string;
  advertiser?: {
    company?: string;
    contactName?: string;
    email?: string;
  };
  directions?: string;
  captionTemplate?: string;
  hashtags?: string[];
  categories?: string[];
  cta_url?: string;
  usageRights?: string;
}

export default function JoinUGC() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<PGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<PGCCampaign | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const getToken = async () => {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('userToken');
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      const res = await axios.get(`${API_BASE}/clippers/available-pgc`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCampaigns(res.data || []);
    } catch (e: any) {
      console.error('Error loading campaigns:', e);
      setError(e.response?.data?.error || e.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
  };

  const handleApply = async (campaignId: string) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      await axios.post(
        `${API_BASE}/applications`,
        { campaignId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        'Success',
        'Application submitted! The advertiser will review and contact you if selected.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to submit application');
    }
  };

  const openDetails = (campaign: PGCCampaign) => {
    setSelectedCampaign(campaign);
    setModalVisible(true);
  };

  const renderCampaignCard = ({ item: c }: { item: PGCCampaign }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetails(c)}>
      <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.cardGradient}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {c.title}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {c.status === 'active' ? 'Open for Applications' : c.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={16} color="#059669" />
            <Text style={styles.statValue}>₦{c.clipper_cpm.toLocaleString()} Payout</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color="#3B82F6" />
            <Text style={styles.statValue}>{c.clippersCount || 0} Applicants</Text>
          </View>
        </View>

        <Text style={styles.briefPreview} numberOfLines={3}>
          {c.brief || 'No brief provided'}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.deadline}>
            Created: {new Date(c.createdAt).toLocaleDateString()}
          </Text>

          <TouchableOpacity style={styles.applyButton} onPress={() => handleApply(c._id)}>
            <Text style={styles.applyText}>Apply Now</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#F3F4F6', '#FFFFFF']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <Text style={styles.title}>Available PGC Campaigns</Text>
          <Text style={styles.subtitle}>
            Apply to create professional branded content for brands and get paid.
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <FlatList
            data={campaigns}
            renderItem={renderCampaignCard}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  No available PGC campaigns right now. Check back soon!
                </Text>
              </View>
            }
          />
        </ScrollView>

        {/* ──────────────────────────────────────────────── */}
        {/*                   DETAILED MODAL                   */}
        {/* ──────────────────────────────────────────────── */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={28} color="#374151" />
              </TouchableOpacity>

              {selectedCampaign && (
                <ScrollView style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedCampaign.title}</Text>

                  {/* Quick Stats */}
                  <View style={styles.modalStatsRow}>
                    <View style={styles.modalStat}>
                      <Ionicons name="cash-outline" size={20} color="#059669" />
                      <Text style={styles.modalStatLabel}>Your Payout</Text>
                      <Text style={styles.modalStatValue}>
                        ₦{selectedCampaign.clipper_cpm.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.modalStat}>
                      <Ionicons name="people-outline" size={20} color="#3B82F6" />
                      <Text style={styles.modalStatLabel}>Applicants</Text>
                      <Text style={styles.modalStatValue}>
                        {selectedCampaign.clippersCount || 0}
                      </Text>
                    </View>
                  </View>

                  {/* Brief */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Creative Brief</Text>
                    <Text style={styles.sectionText}>
                      {selectedCampaign.brief || 'Not provided'}
                    </Text>
                  </View>

                  {/* Directions */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Creative Directions</Text>
                    <Text style={styles.sectionText}>
                      {selectedCampaign.directions || 'No specific directions provided'}
                    </Text>
                  </View>

                  {/* Deliverables */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Deliverables</Text>
                    {selectedCampaign.deliverables?.length > 0 ? (
                      selectedCampaign.deliverables.map((item, index) => (
                        <View key={index} style={styles.bulletItem}>
                          <Text style={styles.bullet}>•</Text>
                          <Text style={styles.sectionText}>{item}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.sectionTextDim}>No specific deliverables listed</Text>
                    )}
                  </View>

                  {/* Approval Criteria */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Approval Criteria</Text>
                    <Text style={styles.sectionText}>
                      {selectedCampaign.approvalCriteria || 'Standard quality & brand alignment'}
                    </Text>
                  </View>

                  {/* Add-ons */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Selected Add-ons</Text>
                    {selectedCampaign.pgcAddons?.length > 0 ? (
                      <View style={styles.tagsContainer}>
                        {selectedCampaign.pgcAddons.map((addon, index) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{addon}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.sectionTextDim}>No add-ons selected</Text>
                    )}
                  </View>

                  {/* Script / Guidelines */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Script / Guidelines</Text>
                    <Text style={styles.sectionText}>
                      {selectedCampaign.script || 'Creator is expected to provide or develop the script'}
                    </Text>
                  </View>

                  {/* Caption Template */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Caption Template</Text>
                    <Text style={styles.sectionText}>
                      {selectedCampaign.captionTemplate || 'No caption template provided'}
                    </Text>
                  </View>

                  {/* Hashtags */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Required Hashtags</Text>
                    {selectedCampaign.hashtags?.length > 0 ? (
                      <View style={styles.tagsContainer}>
                        {selectedCampaign.hashtags.map((hashtag, index) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>#{hashtag}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.sectionTextDim}>No required hashtags</Text>
                    )}
                  </View>

                  {/* Categories */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    {selectedCampaign.categories?.length > 0 ? (
                      <View style={styles.tagsContainer}>
                        {selectedCampaign.categories.map((category, index) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{category}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.sectionTextDim}>No categories specified</Text>
                    )}
                  </View>

                  {/* CTA URL */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Call to Action URL</Text>
                    <Text style={styles.sectionText}>
                      {selectedCampaign.cta_url || 'No CTA URL provided'}
                    </Text>
                  </View>

                  {/* Usage Rights */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Usage Rights</Text>
                    <Text style={styles.sectionText}>
                      {selectedCampaign.usageRights || 'Standard usage rights apply'}
                    </Text>
                  </View>

                  {/* Assets */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Reference Assets</Text>
                    {selectedCampaign.assets?.length > 0 ? (
                      <View style={styles.assetsContainer}>
                        {selectedCampaign.assets.map((asset, index) => (
                          <View key={index} style={styles.assetItem}>
                            <Ionicons name="document-outline" size={16} color="#6B7280" />
                            <Text style={styles.assetName} numberOfLines={1}>
                              {asset.split('/').pop() || `Asset ${index + 1}`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.sectionTextDim}>No reference assets uploaded</Text>
                    )}
                  </View>

                  {/* Apply Button */}
                  <TouchableOpacity
                    style={styles.modalApplyButton}
                    onPress={() => {
                      handleApply(selectedCampaign._id);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalApplyText}>Apply to this Campaign</Text>
                  </TouchableOpacity>

                  <View style={{ height: 60 }} />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 100 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8, color: '#111827' },
  subtitle: { fontSize: 16, color: '#4B5563', marginBottom: 24 },
  error: { color: '#EF4444', marginBottom: 16, textAlign: 'center' },
  list: { gap: 16 },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardGradient: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', flex: 1, color: '#111827' },
  statusBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, color: '#0EA5E9', fontWeight: '600' },
  cardStats: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  briefPreview: { fontSize: 14, color: '#4B5563', marginBottom: 16, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deadline: { fontSize: 12, color: '#6B7280' },
  applyButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  applyText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
  loader: { flex: 1, justifyContent: 'center' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalClose: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  modalStat: {
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  sectionTextDim: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bullet: {
    marginRight: 10,
    color: '#4F46E5',
    fontSize: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#4338CA',
    fontSize: 13,
    fontWeight: '500',
  },
  assetsContainer: {
    marginTop: 8,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  assetName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#374151',
  },
  modalApplyButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  modalApplyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});