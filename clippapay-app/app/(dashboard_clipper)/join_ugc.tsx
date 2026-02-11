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

      const res = await axios.get(`${API_BASE}/clippers/pgc/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCampaigns(res.data || []);
    } catch (e: any) {
      console.error(e);
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
      Alert.alert('Error', e.response?.data?.error || 'Failed to apply');
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
            Apply to create professional content for brands.
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
                  No available campaigns right now. Check back soon!
                </Text>
              </View>
            }
          />
        </ScrollView>

        {/* MODAL */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>

              {selectedCampaign && (
                <ScrollView>
                  <Text style={styles.modalTitle}>{selectedCampaign.title}</Text>

                  <Text style={styles.sectionTitle}>Brief</Text>
                  <Text style={styles.sectionText}>{selectedCampaign.brief}</Text>

                  <TouchableOpacity
                    style={styles.modalApplyButton}
                    onPress={() => {
                      handleApply(selectedCampaign._id);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalApplyText}>Apply to this Campaign</Text>
                  </TouchableOpacity>
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
  scrollContent: { padding: 16, paddingTop: 124,  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  error: { color: 'red', marginBottom: 16 },
  list: { gap: 16 },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardGradient: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  statusBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, color: '#0EA5E9', fontWeight: '600' },
  cardStats: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 14, fontWeight: '600' },
  briefPreview: { fontSize: 14, color: '#4B5563', marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deadline: { fontSize: 12, color: '#6B7280' },
  applyButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyText: { color: '#FFF', fontWeight: '600' },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
  loader: { flex: 1, justifyContent: 'center' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalClose: { alignSelf: 'flex-end' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  sectionText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  modalApplyButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalApplyText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
