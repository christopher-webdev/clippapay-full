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
  Image,
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
  
  // Root level fields
  pgcAddons: string[];
  script: string;
  budget_total: number;
  clipper_cpm: number;
  desiredVideos: number;
  approvedVideosCount: number;
  clippersCount: number;
  status: string;
  createdAt: string;
  directions?: string[];
  hashtags?: string[];
  categories?: string[];
  captionTemplate?: string;
  cta_url?: string;
  usageRights?: string;
  advertiser?: {
    company?: string;
    contactName?: string;
    email?: string;
  };
  
  // ⭐ CRITICAL: This is where PGC brief data is stored!
  ugc?: {
    brief: string;
    deliverables: string[];
    assets: string[];
    approvalCriteria: string;
    captionTemplate?: string;
    usageRights?: string;
    hashtags?: string[];
    directions?: string[];
  };
  
  // Mapped fields for easier access (from backend transformation)
  brief?: string;
  deliverables?: string[];
  assets?: string[];
  approvalCriteria?: string;
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

      console.log('Fetching PGC campaigns...');
      const res = await axios.get(`${API_BASE}/clippers/available-pgc`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(`Loaded ${res.data?.length || 0} PGC campaigns`);
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

  // ============ HELPER FUNCTIONS TO SAFELY ACCESS PGC DATA ============
  
  const getBrief = (campaign: PGCCampaign): string => {
    // Try root level first, then ugc subdocument
    return campaign.brief || campaign.ugc?.brief || '';
  };

  const getDeliverables = (campaign: PGCCampaign): string[] => {
    return campaign.deliverables || campaign.ugc?.deliverables || [];
  };

  const getAssets = (campaign: PGCCampaign): string[] => {
    return campaign.assets || campaign.ugc?.assets || [];
  };

  const getApprovalCriteria = (campaign: PGCCampaign): string => {
    return campaign.approvalCriteria || campaign.ugc?.approvalCriteria || '';
  };

  const getDirections = (campaign: PGCCampaign): string => {
    if (campaign.directions) {
      return Array.isArray(campaign.directions) 
        ? campaign.directions.join('\n') 
        : campaign.directions;
    }
    if (campaign.ugc?.directions) {
      return Array.isArray(campaign.ugc.directions)
        ? campaign.ugc.directions.join('\n')
        : campaign.ugc.directions;
    }
    return '';
  };

  const getCaptionTemplate = (campaign: PGCCampaign): string => {
    return campaign.captionTemplate || campaign.ugc?.captionTemplate || '';
  };

  const getHashtags = (campaign: PGCCampaign): string[] => {
    return campaign.hashtags || campaign.ugc?.hashtags || [];
  };

  const getUsageRights = (campaign: PGCCampaign): string => {
    return campaign.usageRights || campaign.ugc?.usageRights || 'Standard usage rights apply';
  };

  const getAddonLabel = (addonId: string): string => {
    const labels: Record<string, string> = {
      script: 'Creator provides script',
      whatsapp: 'Creator + Post their WhatsApp',
      ig: 'Collaborative - Creator Post on their IG',
      tiktok: 'Creator Post on TikTok',
      outdoor: 'Creator Outdoor shoot'
    };
    return labels[addonId] || addonId;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return { bg: '#DCFCE7', text: '#16A34A' };
      case 'pending': return { bg: '#FEF3C7', text: '#D97706' };
      case 'completed': return { bg: '#F3F4F6', text: '#6B7280' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // ============ RENDER CAMPAIGN CARD ============
  
  const renderCampaignCard = ({ item: c }: { item: PGCCampaign }) => {
    const statusColors = getStatusColor(c.status);
    const brief = getBrief(c);
    const deliverables = getDeliverables(c);
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => openDetails(c)}
        activeOpacity={0.7}
      >
        <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.cardGradient}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {c.title}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {c.status === 'active' ? 'Open for Applications' : c.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.cardStats}>
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={16} color="#059669" />
              <Text style={styles.statValue}>
                {formatCurrency(c.clipper_cpm || 0)} Payout
              </Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={16} color="#3B82F6" />
              <Text style={styles.statValue}>
                {c.clippersCount || 0} {c.clippersCount === 1 ? 'Applicant' : 'Applicants'}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="videocam-outline" size={16} color="#8B5CF6" />
              <Text style={styles.statValue}>
                {(c.approvedVideosCount || 0)}/{(c.desiredVideos || 1)} Videos
              </Text>
            </View>
          </View>

          {/* Brief Preview */}
          {brief ? (
            <Text style={styles.briefPreview} numberOfLines={3}>
              {brief}
            </Text>
          ) : (
            <Text style={styles.briefPreviewEmpty} numberOfLines={3}>
              No brief provided
            </Text>
          )}

          {/* Deliverables Preview */}
          {deliverables.length > 0 && (
            <View style={styles.deliverablesPreview}>
              <Text style={styles.deliverablesLabel}>Deliverables:</Text>
              <Text style={styles.deliverablesText} numberOfLines={2}>
                {deliverables.slice(0, 3).join(' • ')}
                {deliverables.length > 3 && ` +${deliverables.length - 3} more`}
              </Text>
            </View>
          )}

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.deadline}>
                {formatDate(c.createdAt)}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={() => handleApply(c._id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                style={styles.applyButtonGradient}
              >
                <Text style={styles.applyText}>Apply Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#F3F4F6', '#FFFFFF']} style={StyleSheet.absoluteFill} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading available campaigns...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#F3F4F6', '#FFFFFF']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>PGC Campaigns</Text>
            <Text style={styles.subtitle}>
              Apply to create professional branded content for top brands
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorTitle}>Failed to Load</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadCampaigns}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={campaigns}
            renderItem={renderCampaignCard}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              !error && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="videocam-outline" size={64} color="#9CA3AF" />
                  <Text style={styles.emptyTitle}>No Campaigns Available</Text>
                  <Text style={styles.emptyText}>
                    There are no open PGC campaigns right now. Check back soon!
                  </Text>
                </View>
              )
            }
          />
          
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ============ DETAILED MODAL ============ */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  {selectedCampaign && (
                    <View style={[styles.modalStatusBadge, 
                      { backgroundColor: getStatusColor(selectedCampaign.status).bg }
                    ]}>
                      <Text style={[styles.modalStatusText, 
                        { color: getStatusColor(selectedCampaign.status).text }
                      ]}>
                        {selectedCampaign.status === 'active' ? 'OPEN' : selectedCampaign.status.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {selectedCampaign && (
                <ScrollView 
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.modalTitle}>{selectedCampaign.title}</Text>

                  {/* Quick Stats */}
                  <View style={styles.modalStatsRow}>
                    <View style={styles.modalStat}>
                      <View style={[styles.modalStatIcon, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="cash-outline" size={20} color="#059669" />
                      </View>
                      <Text style={styles.modalStatLabel}>Your Payout</Text>
                      <Text style={styles.modalStatValue}>
                        {formatCurrency(selectedCampaign.clipper_cpm || 0)}
                      </Text>
                    </View>

                    <View style={styles.modalStat}>
                      <View style={[styles.modalStatIcon, { backgroundColor: '#DBEAFE' }]}>
                        <Ionicons name="people-outline" size={20} color="#3B82F6" />
                      </View>
                      <Text style={styles.modalStatLabel}>Applicants</Text>
                      <Text style={styles.modalStatValue}>
                        {selectedCampaign.clippersCount || 0}
                      </Text>
                    </View>

                    <View style={styles.modalStat}>
                      <View style={[styles.modalStatIcon, { backgroundColor: '#EDE9FE' }]}>
                        <Ionicons name="videocam-outline" size={20} color="#8B5CF6" />
                      </View>
                      <Text style={styles.modalStatLabel}>Videos</Text>
                      <Text style={styles.modalStatValue}>
                        {selectedCampaign.approvedVideosCount || 0}/{selectedCampaign.desiredVideos || 1}
                      </Text>
                    </View>
                  </View>

                  {/* Creative Brief */}
                  <View style={styles.modalSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="document-text-outline" size={20} color="#4F46E5" />
                      <Text style={styles.sectionTitle}>Creative Brief</Text>
                    </View>
                    <Text style={styles.sectionText}>
                      {getBrief(selectedCampaign) || 'No brief provided'}
                    </Text>
                  </View>

                  {/* Script */}
                  <View style={styles.modalSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="script-outline" size={20} color="#4F46E5" />
                      <Text style={styles.sectionTitle}>Script / Guidelines</Text>
                    </View>
                    <Text style={styles.sectionText}>
                      {selectedCampaign.script || 'Creator is expected to provide or develop the script'}
                    </Text>
                  </View>

                  {/* Creative Directions */}
                  {getDirections(selectedCampaign) && (
                    <View style={styles.modalSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="compass-outline" size={20} color="#4F46E5" />
                        <Text style={styles.sectionTitle}>Creative Directions</Text>
                      </View>
                      <Text style={styles.sectionText}>
                        {getDirections(selectedCampaign)}
                      </Text>
                    </View>
                  )}

                  {/* Deliverables */}
                  <View style={styles.modalSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="checkmark-done-outline" size={20} color="#4F46E5" />
                      <Text style={styles.sectionTitle}>Deliverables</Text>
                    </View>
                    {getDeliverables(selectedCampaign).length > 0 ? (
                      getDeliverables(selectedCampaign).map((item, index) => (
                        <View key={index} style={styles.bulletItem}>
                          <Text style={styles.bullet}>•</Text>
                          <Text style={styles.bulletText}>{item}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.sectionTextDim}>No specific deliverables listed</Text>
                    )}
                  </View>

                  {/* Approval Criteria */}
                  <View style={styles.modalSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#4F46E5" />
                      <Text style={styles.sectionTitle}>Approval Criteria</Text>
                    </View>
                    <Text style={styles.sectionText}>
                      {getApprovalCriteria(selectedCampaign) || 'Standard quality & brand alignment'}
                    </Text>
                  </View>

                  {/* Add-ons */}
                  {selectedCampaign.pgcAddons && selectedCampaign.pgcAddons.length > 0 && (
                    <View style={styles.modalSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="apps-outline" size={20} color="#4F46E5" />
                        <Text style={styles.sectionTitle}>Selected Add-ons</Text>
                      </View>
                      <View style={styles.tagsContainer}>
                        {selectedCampaign.pgcAddons.map((addon, index) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{getAddonLabel(addon)}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Caption Template */}
                  {getCaptionTemplate(selectedCampaign) && (
                    <View style={styles.modalSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="chatbubble-outline" size={20} color="#4F46E5" />
                        <Text style={styles.sectionTitle}>Caption Template</Text>
                      </View>
                      <Text style={styles.sectionText}>
                        {getCaptionTemplate(selectedCampaign)}
                      </Text>
                    </View>
                  )}

                  {/* Hashtags */}
                  {getHashtags(selectedCampaign).length > 0 && (
                    <View style={styles.modalSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="pound-outline" size={20} color="#4F46E5" />
                        <Text style={styles.sectionTitle}>Required Hashtags</Text>
                      </View>
                      <View style={styles.tagsContainer}>
                        {getHashtags(selectedCampaign).map((hashtag, index) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>
                              #{hashtag.replace('#', '')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Categories */}
                  {selectedCampaign.categories && selectedCampaign.categories.length > 0 && (
                    <View style={styles.modalSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="folder-outline" size={20} color="#4F46E5" />
                        <Text style={styles.sectionTitle}>Categories</Text>
                      </View>
                      <View style={styles.tagsContainer}>
                        {selectedCampaign.categories.map((category, index) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{category}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* CTA URL */}
                  {selectedCampaign.cta_url && (
                    <View style={styles.modalSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="link-outline" size={20} color="#4F46E5" />
                        <Text style={styles.sectionTitle}>Call to Action URL</Text>
                      </View>
                      <Text style={styles.sectionTextLink} numberOfLines={1}>
                        {selectedCampaign.cta_url}
                      </Text>
                    </View>
                  )}

                  {/* Usage Rights */}
                  <View style={styles.modalSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="document-lock-outline" size={20} color="#4F46E5" />
                      <Text style={styles.sectionTitle}>Usage Rights</Text>
                    </View>
                    <Text style={styles.sectionText}>
                      {getUsageRights(selectedCampaign)}
                    </Text>
                  </View>

                  {/* Reference Assets */}
                  {getAssets(selectedCampaign).length > 0 && (
                    <View style={styles.modalSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="images-outline" size={20} color="#4F46E5" />
                        <Text style={styles.sectionTitle}>Reference Assets</Text>
                      </View>
                      <View style={styles.assetsContainer}>
                        {getAssets(selectedCampaign).map((asset, index) => (
                          <View key={index} style={styles.assetItem}>
                            <Ionicons name="document-outline" size={16} color="#6B7280" />
                            <Text style={styles.assetName} numberOfLines={1}>
                              {asset.split('/').pop() || `Asset ${index + 1}`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Apply Button */}
                  <TouchableOpacity
                    style={styles.modalApplyButton}
                    onPress={() => {
                      handleApply(selectedCampaign._id);
                      setModalVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#22C55E', '#16A34A']}
                      style={styles.modalApplyGradient}
                    >
                      <Text style={styles.modalApplyText}>Apply to this Campaign</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={{ height: 40 }} />
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
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 24,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  briefPreview: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  briefPreviewEmpty: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 12,
  },
  deliverablesPreview: {
    marginBottom: 16,
  },
  deliverablesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  deliverablesText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadline: {
    fontSize: 13,
    color: '#6B7280',
  },
  applyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  modalStat: {
    alignItems: 'center',
    flex: 1,
  },
  modalStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    paddingLeft: 4,
  },
  sectionTextLink: {
    fontSize: 15,
    color: '#4F46E5',
    lineHeight: 22,
    paddingLeft: 4,
    textDecorationLine: 'underline',
  },
  sectionTextDim: {
    fontSize: 15,
    color: '#9CA3AF',
    fontStyle: 'italic',
    lineHeight: 22,
    paddingLeft: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 4,
  },
  bullet: {
    marginRight: 12,
    color: '#4F46E5',
    fontSize: 18,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '600',
  },
  assetsContainer: {
    marginTop: 8,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  assetName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  modalApplyButton: {
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalApplyGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});