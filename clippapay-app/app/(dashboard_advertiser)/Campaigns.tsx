// app/(dashboard)/campaigns.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  StatusBar,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Video, Download, X, Film } from 'lucide-react-native';

import ProfileHeader from './ProfileHeader';
import Footer from './Footer';

const API_BASE = 'https://api.clippapay.com/api';

const { width } = Dimensions.get('window');
const scale = width / 428;

interface Campaign {
  _id: string;
  title: string;
  thumb_url?: string;
  status: string;
  adWorkerStatus: 'pending' | 'processing' | 'ready' | 'rejected';
  createdAt: string;
  rate_per_view: number;
  budget_total: number;
  budget_remaining: number;
  views_purchased: number;
  views_left: number;
  numClipsSuggested: number;
  kind?: 'normal' | 'ugc' | 'pgc';
  clippersCount?: number;
  desiredVideos?: number;
  approvedVideosCount?: number;
  platforms?: string[];
  countries?: string[];
  hashtags?: string[];
  categories?: string[];
  directions?: string[];
  cta_url?: string;
  ugc?: {
    assets?: string[];
    brief?: string;
    deliverables?: string[];
    captionTemplate?: string;
    usageRights?: string;
    approvalCriteria?: string;
  };
}

interface Clip {
  _id: string;
  url: string;
  createdAt: string;
  index: number;
  adWorker: { contactName: string; email: string };
  status?: 'pending' | 'approved' | 'rejected';
}

export default function AdvertiserDashboard() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Pagination
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    loadCampaigns();
  }, []);

  const getToken = async () => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem('userToken');
    }
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

      const res = await fetch(`${API_BASE}/campaigns`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!res.ok) throw new Error(`API ERROR ${res.status}`);
      const data = await res.json();
      setCampaigns(data || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignDetails = async (campaignId: string) => {
    try {
      setDetailsLoading(true);
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/details`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!res.ok) throw new Error(`API ERROR ${res.status}`);
      const data = await res.json();
      setCampaignDetails(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCampaignPress = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    await loadCampaignDetails(campaign._id);
    setModalVisible(true);
  };

  // const handleViewClips = (campaignId: string) => {
  //   router.push(`/campaign/${campaignId}/clips`);
  // };

  const handleViewClips = (campaignId: string) => {
    router.push(`/(dashboard)/CampaignAnalyticsScreen`);
  };
  

  // Split campaigns into active and completed
  const now = Date.now();
  const activeCampaigns = campaigns.filter(
    c => c.views_left > 0 || c.adWorkerStatus !== 'ready' || c.kind === 'pgc'
  );
  const completedCampaigns = campaigns.filter(
    c =>
      (c.views_left <= 0 && c.adWorkerStatus === 'ready' && c.kind !== 'pgc') ||
      (c.kind === 'pgc' && (c.approvedVideosCount || 0) >= (c.desiredVideos || 0))
  );

  // ================= FILTER LOGIC (STATUS BASED) =================
  const filteredCampaigns = campaigns.filter((c) => {
    if (activeFilter === 'all') return true;

    if (activeFilter === 'active') {
      return ['live', 'active'].includes(c.status?.toLowerCase());
    }

    if (activeFilter === 'pending') {
      return c.status?.toLowerCase() === 'pending';
    }

    if (activeFilter === 'completed') {
      return c.status?.toLowerCase() === 'completed';
    }

    return true;
  });


  // Get progress for a campaign
  const getProgress = (c: Campaign) => {
    if (c.kind === 'pgc') {
      return c.desiredVideos 
        ? Math.round(((c.approvedVideosCount || 0) / c.desiredVideos) * 100)
        : 0;
    } else {
      return c.views_purchased && c.views_purchased > 0
        ? Math.min(((c.views_purchased - c.views_left) / c.views_purchased) * 100, 100)
        : 0;
    }
  };

  // Get status color
  const getStatusColor = (c: Campaign) => {
    const isPGC = c.kind === 'pgc';
    
    if (isPGC && (c.approvedVideosCount || 0) >= (c.desiredVideos || 0)) {
      return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
    } else if (c.views_left <= 0 && !isPGC) {
      return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
    } else if (c.adWorkerStatus === 'ready') {
      return { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' };
    } else if (c.adWorkerStatus === 'processing') {
      return { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' };
    } else if (c.adWorkerStatus === 'rejected') {
      return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
    } else {
      return { bg: '#FEF3C7', text: '#D97706', border: '#FBBF24' };
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  return (
  <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

    <LinearGradient
      colors={['#34D3991A', '#D6CF8D80', '#d8d8d8b2']}
      style={{ flex: 1 }}
    >
      {/* Fixed Header */}
  

      {/* Scrollable Content - starts below header */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.topRow}>
            <View>
              <Text style={styles.title}>Your Campaigns</Text>
              <Text style={styles.subText}>
                You have {campaigns.length} campaigns
              </Text>
            </View>

            <View style={styles.buttonGroup}>
            </View>
          </View>

          {/* FILTERS */}
          <View style={styles.filterRow}>
            {['all', 'active', 'pending', 'completed'].map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                style={
                  activeFilter === f
                    ? styles.allBtn
                    : styles.outlineBtn
                }
              >
                <Text
                  style={
                    activeFilter === f
                      ? styles.allBtnText
                      : styles.outlineBtnText
                  }
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* LOADING & ERROR */}
          {loading && <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#203A43" />}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* ACTIVE CAMPAIGNS SECTION */}
          {!loading && !error && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>Live/Active Campaigns</Text>
                <View style={styles.sectionDivider} />
              </View>

              {filteredCampaigns.length === 0 ? (
                <View style={styles.emptyCampaignWrapper}>
                  <Image
                    source={require('../../assets/images/no_campaign.png')}
                    style={styles.emptyCampaignImage}
                    resizeMode="contain"
                  />

                  <Text style={styles.emptyCampaignTitle}>
                    No active campaigns yet
                  </Text>

                  <Text style={styles.emptyCampaignDesc}>
                    Create your first campaign to start reaching clippers and growing your brand visibility.
                  </Text>
                </View>
              ) : (
                <>
                  {filteredCampaigns.slice((activePage - 1) * PER_PAGE, activePage * PER_PAGE).map((c) => (
                    <CampaignCard
                      key={c._id}
                      campaign={c}
                      onPress={() => handleCampaignPress(c)}
                      onViewClips={() => handleViewClips(c._id)}
                      getProgress={getProgress}
                      getStatusColor={getStatusColor}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                    />
                  ))}
                  
                  {Math.ceil(filteredCampaigns.length / PER_PAGE) > 1 && (
                    <Pagination
                      currentPage={activePage}
                      totalPages={Math.ceil(filteredCampaigns.length / PER_PAGE)}
                      onPageChange={setActivePage}
                    />
                  )}
                </>
              )}

              {/* COMPLETED CAMPAIGNS SECTION */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDivider} />
                <Text style={[styles.sectionTitle, styles.completedSectionTitle]}>
                  Recently Completed (Last 30 Days)
                </Text>
                <View style={styles.sectionDivider} />
              </View>

              {completedCampaigns.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No completed campaigns in last 30 days.</Text>
                </View>
              ) : (
                <>
                  {completedCampaigns.slice((completedPage - 1) * PER_PAGE, completedPage * PER_PAGE).map((c) => (
                    <CampaignCard
                      key={c._id}
                      campaign={c}
                      onPress={() => handleCampaignPress(c)}
                      onViewClips={() => handleViewClips(c._id)}
                      getProgress={getProgress}
                      getStatusColor={getStatusColor}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                    />
                  ))}
                  
                  {Math.ceil(completedCampaigns.length / PER_PAGE) > 1 && (
                    <Pagination
                      currentPage={completedPage}
                      totalPages={Math.ceil(completedCampaigns.length / PER_PAGE)}
                      onPageChange={setCompletedPage}
                    />
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* CAMPAIGN DETAILS MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <CampaignDetailsModal
          visible={modalVisible}
          campaign={selectedCampaign}
          details={campaignDetails}
          loading={detailsLoading}
          onClose={() => setModalVisible(false)}
          getProgress={getProgress}
          getStatusColor={getStatusColor}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      </Modal>
    </LinearGradient>
  </SafeAreaView>
);
}
// Campaign Card Component
function CampaignCard({ 
  campaign, 
  onPress,
  onViewClips,
  getProgress,
  getStatusColor,
  formatCurrency,
  formatDate 
}: {
  campaign: Campaign;
  onPress: () => void;
  onViewClips: () => void;
  getProgress: (c: Campaign) => number;
  getStatusColor: (c: Campaign) => any;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}) {
  const progress = getProgress(campaign);
  const statusColor = getStatusColor(campaign);
  const isPGC = campaign.kind === 'pgc';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* TITLE + STATUS */}
      <View style={styles.cardTop}>
        <View style={styles.titleContainer}>
          {campaign.thumb_url ? (
            <Image 
              source={{ uri: `https://api.clippapay.com${campaign.thumb_url}` }}
              style={styles.thumbnail}
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Film size={20} color="#9CA3AF" />
            </View>
          )}
          <Text style={styles.cardTitle} numberOfLines={2}>{campaign.title}</Text>
        </View>
        <View style={[styles.statusBadge, { 
          backgroundColor: statusColor.bg,
          borderColor: statusColor.border
        }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {campaign.adWorkerStatus === 'ready' && (campaign.views_left > 0 || isPGC) 
              ? (isPGC ? 'Active' : 'Live') 
              : campaign.adWorkerStatus}
          </Text>
        </View>
      </View>

      {/* TYPE BADGE */}
      <View style={styles.typeBadge}>
        <Text style={styles.typeBadgeText}>
          {campaign.kind === 'pgc' ? 'PGC' : campaign.kind === 'ugc' ? 'UGC' : 'Normal'}
        </Text>
      </View>

      {/* PROGRESS */}
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Progress</Text>
        <Text style={styles.progressPercent}>{progress}%</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { 
              width: `${progress}%`,
              backgroundColor: progress >= 100 
                ? '#A3A3A3' 
                : progress > 80 
                  ? '#16A34A'
                  : '#4F46E5'
            }
          ]}
        />
      </View>

      {/* STATS - Updated to match web */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Budget</Text>
          <Text style={styles.statValue}>{formatCurrency(campaign.budget_total)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Budget Rem.</Text>
          <Text style={styles.statValue}>{formatCurrency(campaign.budget_remaining)}</Text>
        </View>
        
        {isPGC ? (
          <>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Videos Desired</Text>
              <Text style={styles.statValue}>{campaign.desiredVideos?.toLocaleString()}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Videos Approved</Text>
              <Text style={styles.statValue}>{campaign.approvedVideosCount?.toLocaleString() || '0'}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Views Purchased</Text>
              <Text style={styles.statValue}>{campaign.views_purchased?.toLocaleString()}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Views Left</Text>
              <Text style={styles.statValue}>{campaign.views_left?.toLocaleString()}</Text>
            </View>
          </>
        )}
        
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Created</Text>
          <Text style={styles.statValue}>{formatDate(campaign.createdAt)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Clippers Engaged</Text>
          <Text style={styles.statValue}>{campaign.clippersCount?.toLocaleString() || '0'}</Text>
        </View>
      </View>

      {/* ACTIONS */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={onPress}
        >
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>

        {campaign.adWorkerStatus === 'ready' && (campaign.views_left > 0 || isPGC) && (
          <TouchableOpacity
            style={styles.clipBtn}
            onPress={onViewClips}
          >
            <Text style={styles.clipBtnText}>
              {isPGC ? "View Videos" : "View Clips Analytics"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Pagination Component
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <View style={styles.pagination}>
      <TouchableOpacity
        style={[styles.paginationBtn, currentPage <= 1 && styles.paginationBtnDisabled]}
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <Text style={styles.paginationText}>Prev</Text>
      </TouchableOpacity>
      
      <Text style={styles.pageNumber}>
        Page {currentPage} of {totalPages}
      </Text>
      
      <TouchableOpacity
        style={[styles.paginationBtn, currentPage >= totalPages && styles.paginationBtnDisabled]}
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        <Text style={styles.paginationText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

// Campaign Details Modal Component
function CampaignDetailsModal({
  visible,
  campaign,
  details,
  loading,
  onClose,
  getProgress,
  getStatusColor,
  formatCurrency,
  formatDate
}: {
  visible: boolean;
  campaign: Campaign | null;
  details: any;
  loading: boolean;
  onClose: () => void;
  getProgress: (c: Campaign) => number;
  getStatusColor: (c: Campaign) => any;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}) {
  if (!campaign || !visible) return null;

  const progress = getProgress(campaign);
  const statusColor = getStatusColor(campaign);
  const isPGC = campaign.kind === 'pgc';
  const clips = details?.clips || [];

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Campaign Details</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.modalLoadingText}>Loading details...</Text>
            </View>
          ) : (
            <>
              {/* Campaign Header */}
              <View style={styles.modalCampaignHeader}>
                <View style={styles.modalCampaignTitleRow}>
                  {campaign.thumb_url ? (
                    <Image 
                      source={{ uri: `https://api.clippapay.com${campaign.thumb_url}` }}
                      style={styles.modalThumbnail}
                    />
                  ) : (
                    <View style={[styles.modalThumbnail, styles.modalThumbnailPlaceholder]}>
                      <Film size={24} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalCampaignTitle}>{campaign.title}</Text>
                    <Text style={styles.modalCreatedDate}>
                      Created: {new Date(campaign.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.modalStatusBadge, { 
                  backgroundColor: statusColor.bg,
                  borderColor: statusColor.border
                }]}>
                  <Text style={[styles.modalStatusText, { color: statusColor.text }]}>
                    {(campaign.views_left <= 0 && !isPGC) || 
                     (isPGC && (campaign.approvedVideosCount || 0) >= (campaign.desiredVideos || 0))
                      ? "COMPLETED"
                      : campaign.adWorkerStatus.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.modalProgressContainer}>
                <View style={styles.modalProgressHeader}>
                  <Text style={styles.modalProgressLabel}>Progress</Text>
                  <Text style={styles.modalProgressPercent}>{progress}%</Text>
                </View>
                <View style={styles.modalProgressBar}>
                  <View
                    style={[
                      styles.modalProgressFill,
                      { 
                        width: `${progress}%`,
                        backgroundColor: progress >= 100 
                          ? '#A3A3A3' 
                          : progress > 80 
                            ? '#16A34A'
                            : '#4F46E5'
                      }
                    ]}
                  />
                </View>
              </View>

              {/* Info Grid */}
              <View style={styles.infoGrid}>
                <InfoRow label="Total Budget (₦)" value={formatCurrency(campaign.budget_total)} />
                <InfoRow label="Budget Remaining (₦)" value={formatCurrency(campaign.budget_remaining)} />
                
                {isPGC ? (
                  <>
                    <InfoRow label="Videos Desired" value={campaign.desiredVideos?.toLocaleString()} />
                    <InfoRow label="Videos Approved" value={(campaign.approvedVideosCount || 0).toLocaleString()} />
                  </>
                ) : (
                  <>
                    <InfoRow label="Views Purchased" value={campaign.views_purchased?.toLocaleString()} />
                    <InfoRow label="Views Left" value={campaign.views_left?.toLocaleString()} />
                    <InfoRow label="Rate per View" value={`₦${campaign.rate_per_view}`} />
                  </>
                )}
                
                <InfoRow label="Clippers Engaged" value={(campaign.clippersCount || 0).toString()} />
                
                {campaign.platforms && campaign.platforms.length > 0 && (
                  <InfoRow label="Platforms" value={campaign.platforms.join(', ')} />
                )}
                
                {campaign.countries && campaign.countries.length > 0 && (
                  <InfoRow label="Countries" value={campaign.countries.join(', ')} />
                )}
                
                {campaign.hashtags && campaign.hashtags.length > 0 && (
                  <InfoRow label="Hashtags" value={campaign.hashtags.join(', ')} />
                )}
                
                {campaign.categories && campaign.categories.length > 0 && (
                  <InfoRow label="Categories" value={campaign.categories.join(', ')} />
                )}
                
                {campaign.directions && campaign.directions.length > 0 && (
                  <InfoRow label="Directions" value={campaign.directions.join(' | ')} />
                )}
                
                {campaign.cta_url && (
                  <InfoRow label="CTA URL" value={campaign.cta_url} />
                )}
                
                {/* UGC/PGC Specific Fields */}
                {campaign.ugc?.brief && (
                  <InfoRow label="Brief" value={campaign.ugc.brief} />
                )}
                
                {campaign.ugc?.deliverables && campaign.ugc.deliverables.length > 0 && (
                  <InfoRow label="Deliverables" value={campaign.ugc.deliverables.join(', ')} />
                )}
                
                {campaign.ugc?.captionTemplate && (
                  <InfoRow label="Caption Template" value={campaign.ugc.captionTemplate} />
                )}
                
                {campaign.ugc?.usageRights && (
                  <InfoRow label="Usage Rights" value={campaign.ugc.usageRights} />
                )}
                
                {campaign.ugc?.approvalCriteria && (
                  <InfoRow label="Approval Criteria" value={campaign.ugc.approvalCriteria} />
                )}
              </View>

              {/* Clips Section */}
              <View style={styles.clipsSection}>
                <Text style={styles.clipsTitle}>
                  {isPGC ? 'Submitted Videos' : 'Processed Clips'}
                </Text>
                
                {clips.length > 0 ? (
                  <FlatList
                    data={clips}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item: clip }) => (
                      <View style={styles.clipCard}>
                        <View style={styles.clipThumbnail}>
                          <Video size={24} color="#4F46E5" />
                        </View>
                        <View style={styles.clipInfo}>
                          <Text style={styles.clipDate}>
                            {new Date(clip.createdAt).toLocaleDateString()}
                          </Text>
                          {isPGC ? (
                            <Text style={styles.clipStatus}>
                              Status: {clip.status || 'Pending'}
                            </Text>
                          ) : (
                            <Text style={styles.clipIndex}>Clip {clip.index}</Text>
                          )}
                        </View>
                      </View>
                    )}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.clipsList}
                  />
                ) : (
                  <Text style={styles.noClipsText}>
                    {isPGC ? 'No videos submitted yet.' : 'No clips uploaded yet.'}
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// Info Row Component for Modal
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1,
    backgroundColor: '#FFF' 
  },
  headerContainer: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  footerContainer: { 
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  // Update scrollContent to account for fixed header and footer
  scrollContent: {
    paddingTop: 120 * scale, // Space for fixed header
    paddingHorizontal: 16,
    paddingBottom: 120, // Space for fixed footer
    minHeight: '100%',
  },

  container: { marginTop: 10 },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subText: { color: '#6B7280', marginTop: 4 },

  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },

  newBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
  },

  newBtnText: { color: '#FFF', fontWeight: '600' },

  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },

  allBtn: {
    backgroundColor: '#203A43',
    padding: 8,
    borderRadius: 6,
  },

  allBtnText: { color: '#FFF', fontWeight: '700' },

  outlineBtn: {
    borderWidth: 1,
    borderColor: '#203A434D',
    padding: 8,
    borderRadius: 6,
  },

  outlineBtnText: { color: '#203A43', fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },

  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 20,
    paddingVertical: 4,
  },

  completedSectionTitle: {
    backgroundColor: '#E5E7EB',
    color: '#374151',
  },

  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 14,
  },

  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#0000001A',
    backgroundColor: '#FFF',
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },

  thumbnailPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },

  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  typeBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },

  typeBadgeText: {
    fontSize: 12,
    color: '#374151',
  },

  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },

  progressLabel: {
    fontSize: 14,
    color: '#374151',
  },

  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  progressBarBg: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginTop: 6,
  },

  progressBarFill: {
    height: 8,
    borderRadius: 10,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },

  statBox: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },

  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  statValue: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111827',
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },

  viewBtn: {
    width: '48%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  viewBtnText: {
    fontSize: 14,
    color: '#374151',
  },

  clipBtn: {
    width: '48%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#16A34A',
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  clipBtnText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
  },

  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 8,
  },

  paginationBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },

  paginationBtnDisabled: {
    opacity: 0.5,
  },

  paginationText: {
    color: '#374151',
    fontSize: 14,
  },

  pageNumber: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  modalBody: {
    padding: 20,
  },

  modalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  modalLoadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },

  modalCampaignHeader: {
    marginBottom: 20,
  },

  modalCampaignTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  modalThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },

  modalThumbnailPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  modalTitleContainer: {
    flex: 1,
  },

  modalCampaignTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  modalCreatedDate: {
    fontSize: 14,
    color: '#6B7280',
  },

  modalStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },

  modalStatusText: {
    fontSize: 14,
    fontWeight: '700',
  },

  modalProgressContainer: {
    marginBottom: 24,
  },

  modalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  modalProgressLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  modalProgressPercent: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },

  modalProgressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },

  modalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },

  infoGrid: {
    gap: 16,
    marginBottom: 24,
  },

  infoRow: {
    marginBottom: 12,
  },

  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },

  clipsSection: {
    marginBottom: 20,
  },

  clipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },

  clipsList: {
    gap: 12,
  },

  clipCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 200,
  },

  clipThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  clipInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  clipDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },

  clipStatus: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },

  clipIndex: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },

  noClipsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  emptyCampaignWrapper: {
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 40,
  paddingBottom: 20,
},

emptyCampaignImage: {
  width: 210 * scale,
  height: 190 * scale,
  marginBottom: 20,
},

emptyCampaignTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#111827',
  marginBottom: 6,
  textAlign: 'center',
},

emptyCampaignDesc: {
  fontSize: 12,
  color: '#6B7280',
  textAlign: 'center',
  paddingHorizontal: 40,
  lineHeight: 18,
  marginBottom: 20,
},

emptyCampaignBtn: {
  backgroundColor: '#203A43',
  height: 52,
  paddingHorizontal: 24,
  borderRadius: 10,
  justifyContent: 'center',
  alignItems: 'center',
},

emptyCampaignBtnText: {
  color: '#FFF',
  fontWeight: '600',
  fontSize: 15,
},

});