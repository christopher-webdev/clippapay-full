// app/(dashboard)/campaigns.tsx
import { React, useEffect, useState } from 'react';
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
import { Video, Download, X, Film, Clock, DollarSign, Users, Target, CheckCircle, AlertCircle, Eye, TrendingUp, Calendar } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

import ProfileHeader from './ProfileHeader';


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
  kind?: 'normal' | 'ugc' | 'pgc' | 'premium';
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
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const PER_PAGE = 5;

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
      setRefreshing(false);
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

  const handleViewClips = (campaignId: string) => {
    router.push(`/(dashboard)/CampaignAnalyticsScreen`);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCampaigns();
  };

  const getCampaignStats = () => {
    const total = campaigns.length;
    const active = campaigns.filter(c => 
      c.views_left > 0 || c.adWorkerStatus === 'processing' || c.adWorkerStatus === 'ready'
    ).length;
    const completed = campaigns.filter(c => 
      c.views_left <= 0 || (c.kind === 'pgc' && (c.approvedVideosCount || 0) >= (c.desiredVideos || 0))
    ).length;
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.budget_total - c.budget_remaining), 0);
    
    return { total, active, completed, totalSpent };
  };

  // Filter campaigns by status
  const filteredCampaigns = campaigns.filter((c) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') {
      return c.views_left > 0 || c.adWorkerStatus === 'processing' || c.adWorkerStatus === 'ready';
    }
    if (activeFilter === 'pending') {
      return c.adWorkerStatus === 'pending';
    }
    if (activeFilter === 'completed') {
      return c.views_left <= 0 || (c.kind === 'pgc' && (c.approvedVideosCount || 0) >= (c.desiredVideos || 0));
    }
    return true;
  });

  // Split into active and completed for sections
  const activeCampaigns = filteredCampaigns.filter(c => 
    c.views_left > 0 || c.adWorkerStatus === 'processing' || c.adWorkerStatus === 'ready'
  );
  const completedCampaigns = filteredCampaigns.filter(c => 
    c.views_left <= 0 || (c.kind === 'pgc' && (c.approvedVideosCount || 0) >= (c.desiredVideos || 0))
  );

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

  // Get status with proper formatting
  const getStatus = (c: Campaign) => {
    const isCompleted = (c.views_left <= 0 && c.kind !== 'pgc') || 
      (c.kind === 'pgc' && (c.approvedVideosCount || 0) >= (c.desiredVideos || 0));
    
    if (isCompleted) return 'completed';
    if (c.adWorkerStatus === 'ready') return 'live';
    if (c.adWorkerStatus === 'processing') return 'active';
    if (c.adWorkerStatus === 'pending') return 'pending';
    if (c.adWorkerStatus === 'rejected') return 'rejected';
    return 'draft';
  };

  // Get status color and icon
  const getStatusConfig = (status: string) => {
    const configs = {
      live: { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC', icon: CheckCircle },
      active: { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD', icon: TrendingUp },
      completed: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB', icon: CheckCircle },
      pending: { bg: '#FEF3C7', text: '#D97706', border: '#FBBF24', icon: Clock },
      rejected: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5', icon: AlertCircle },
      draft: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB', icon: Film },
    };
    return configs[status as keyof typeof configs] || configs.draft;
  };

  // Format currency
  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const stats = getCampaignStats();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F9FAFB', '#F3F4F6', '#E5E7EB']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          {/* <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.title}>Your Campaigns</Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <TrendingUp size={20} color="#4F46E5" />
            </TouchableOpacity>
          </View> */}

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#EEF2FF' }]}>
                <Target size={20} color="#4F46E5" />
              </View>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Campaigns</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#DCFCE7' }]}>
                <TrendingUp size={20} color="#16A34A" />
              </View>
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#F3F4F6' }]}>
                <CheckCircle size={20} color="#6B7280" />
              </View>
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <DollarSign size={20} color="#D97706" />
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
          </View>

          {/* Filters */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            <View style={styles.filterRow}>
              {[
                { id: 'all', label: 'All Campaigns', icon: Film },
                { id: 'active', label: 'Active', icon: TrendingUp },
                { id: 'pending', label: 'Pending', icon: Clock },
                { id: 'completed', label: 'Completed', icon: CheckCircle },
              ].map((filter) => {
                const isActive = activeFilter === filter.id;
                const Icon = filter.icon;
                
                return (
                  <TouchableOpacity
                    key={filter.id}
                    onPress={() => setActiveFilter(filter.id)}
                    style={[
                      styles.filterChip,
                      isActive && styles.filterChipActive
                    ]}
                  >
                    <Icon 
                      size={16} 
                      color={isActive ? '#4F46E5' : '#6B7280'} 
                    />
                    <Text
                      style={[
                        styles.filterText,
                        isActive && styles.filterTextActive
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loaderText}>Loading your campaigns...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={48} color="#DC2626" />
              <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadCampaigns}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Active Campaigns Section */}
              {activeCampaigns.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleContainer}>
                      <TrendingUp size={20} color="#4F46E5" />
                      <Text style={styles.sectionTitle}>Active Campaigns</Text>
                    </View>
                    <Text style={styles.sectionCount}>{activeCampaigns.length}</Text>
                  </View>

                  {activeCampaigns
                    .slice((activePage - 1) * PER_PAGE, activePage * PER_PAGE)
                    .map((campaign) => (
                      <CampaignCard
                        key={campaign._id}
                        campaign={campaign}
                        onPress={() => handleCampaignPress(campaign)}
                        onViewClips={() => handleViewClips(campaign._id)}
                        getProgress={getProgress}
                        getStatus={getStatus}
                        getStatusConfig={getStatusConfig}
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                      />
                    ))}
                  
                  {Math.ceil(activeCampaigns.length / PER_PAGE) > 1 && (
                    <Pagination
                      currentPage={activePage}
                      totalPages={Math.ceil(activeCampaigns.length / PER_PAGE)}
                      onPageChange={setActivePage}
                    />
                  )}
                </View>
              )}

              {/* Completed Campaigns Section */}
              {completedCampaigns.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleContainer}>
                      <CheckCircle size={20} color="#6B7280" />
                      <Text style={[styles.sectionTitle, styles.completedTitle]}>
                        Completed Campaigns
                      </Text>
                    </View>
                    <Text style={styles.sectionCount}>{completedCampaigns.length}</Text>
                  </View>

                  {completedCampaigns
                    .slice((completedPage - 1) * PER_PAGE, completedPage * PER_PAGE)
                    .map((campaign) => (
                      <CampaignCard
                        key={campaign._id}
                        campaign={campaign}
                        onPress={() => handleCampaignPress(campaign)}
                        onViewClips={() => handleViewClips(campaign._id)}
                        getProgress={getProgress}
                        getStatus={getStatus}
                        getStatusConfig={getStatusConfig}
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
                </View>
              )}

              {/* Empty State */}
              {campaigns.length === 0 && !loading && (
                <View style={styles.emptyState}>
                  <Image
                    source={require('../../assets/images/no_campaign.png')}
                    style={styles.emptyImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.emptyTitle}>No campaigns yet</Text>
                  <Text style={styles.emptyDescription}>
                    Create your first campaign to start reaching creators and growing your brand.
                  </Text>
                  <TouchableOpacity style={styles.createButton}>
                    <LinearGradient
                      colors={['#4F46E5', '#6366F1']}
                      style={styles.createButtonGradient}
                    >
                      <Text style={styles.createButtonText}>Create Campaign</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Campaign Details Modal */}
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
            getStatus={getStatus}
            getStatusConfig={getStatusConfig}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// Campaign Card Component
function CampaignCard({ 
  campaign, 
  onPress,
  onViewClips,
  getProgress,
  getStatus,
  getStatusConfig,
  formatCurrency,
  formatDate 
}: {
  campaign: Campaign;
  onPress: () => void;
  onViewClips: () => void;
  getProgress: (c: Campaign) => number;
  getStatus: (c: Campaign) => string;
  getStatusConfig: (status: string) => any;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}) {
  const progress = getProgress(campaign);
  const status = getStatus(campaign);
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;
  const isPGC = campaign.kind === 'pgc';
  const isCompleted = status === 'completed';

  return (
    <TouchableOpacity 
      style={[styles.campaignCard, isCompleted && styles.completedCard]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.thumbnailContainer}>
            {campaign.thumb_url ? (
              <Image 
                source={{ uri: `https://api.clippapay.com${campaign.thumb_url}` }}
                style={styles.cardThumbnail}
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Film size={24} color="#9CA3AF" />
              </View>
            )}
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {campaign.title}
            </Text>
            <View style={styles.cardMeta}>
              <View style={styles.cardType}>
                <Text style={styles.cardTypeText}>
                  {campaign.kind === 'premium' ? 'Premium' : 
                   campaign.kind === 'pgc' ? 'UGC' : 
                   campaign.kind === 'normal' ? 'Clipping' : 'Campaign'}
                </Text>
              </View>
              <View style={styles.cardDate}>
                <Calendar size={12} color="#6B7280" />
                <Text style={styles.cardDateText}>{formatDate(campaign.createdAt)}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { 
          backgroundColor: statusConfig.bg,
          borderColor: statusConfig.border
        }]}>
          <StatusIcon size={12} color={statusConfig.text} />
          <Text style={[styles.statusText, { color: statusConfig.text }]}>
            {status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressPercentage}>{progress}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { 
                width: `${progress}%`,
                backgroundColor: progress >= 100 
                  ? '#10B981' 
                  : progress > 60 
                    ? '#4F46E5'
                    : '#F59E0B'
              }
            ]}
          />
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.cardStatsGrid}>
        <View style={styles.cardStat}>
          <DollarSign size={16} color="#6B7280" />
          <Text style={styles.cardStatLabel}>Budget</Text>
          <Text style={styles.cardStatValue}>{formatCurrency(campaign.budget_total)}</Text>
        </View>
        
        {isPGC ? (
          <>
            <View style={styles.cardStat}>
              <Target size={16} color="#6B7280" />
              <Text style={styles.cardStatLabel}>Desired</Text>
              <Text style={styles.cardStatValue}>{campaign.desiredVideos || 0}</Text>
            </View>
            <View style={styles.cardStat}>
              <CheckCircle size={16} color="#6B7280" />
              <Text style={styles.cardStatLabel}>Approved</Text>
              <Text style={styles.cardStatValue}>{campaign.approvedVideosCount || 0}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.cardStat}>
              <Eye size={16} color="#6B7280" />
              <Text style={styles.cardStatLabel}>Views</Text>
              <Text style={styles.cardStatValue}>
                {((campaign.views_purchased - campaign.views_left) || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.cardStat}>
              <TrendingUp size={16} color="#6B7280" />
              <Text style={styles.cardStatLabel}>Left</Text>
              <Text style={styles.cardStatValue}>{campaign.views_left?.toLocaleString() || 0}</Text>
            </View>
          </>
        )}
        
        <View style={styles.cardStat}>
          <Users size={16} color="#6B7280" />
          <Text style={styles.cardStatLabel}>Creators</Text>
          <Text style={styles.cardStatValue}>{campaign.clippersCount || 0}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      {!isCompleted && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={onPress}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>

          {campaign.adWorkerStatus === 'ready' && (campaign.views_left > 0 || isPGC) && (
            <TouchableOpacity
              style={styles.viewClipsButton}
              onPress={onViewClips}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                style={styles.viewClipsGradient}
              >
                <Text style={styles.viewClipsText}>
                  {isPGC ? "View Assets " : "View Clips"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}
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
    <View style={styles.paginationContainer}>
      <TouchableOpacity
        style={[styles.paginationButton, currentPage <= 1 && styles.paginationButtonDisabled]}
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <Text style={styles.paginationButtonText}>Previous</Text>
      </TouchableOpacity>
      
      <View style={styles.paginationInfo}>
        <Text style={styles.paginationText}>
          Page {currentPage} of {totalPages}
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.paginationButton, currentPage >= totalPages && styles.paginationButtonDisabled]}
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        <Text style={styles.paginationButtonText}>Next</Text>
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
  getStatus,
  getStatusConfig,
  formatCurrency,
  formatDate
}: {
  visible: boolean;
  campaign: Campaign | null;
  details: any;
  loading: boolean;
  onClose: () => void;
  getProgress: (c: Campaign) => number;
  getStatus: (c: Campaign) => string;
  getStatusConfig: (status: string) => any;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}) {
  if (!campaign || !visible) return null;

  const progress = getProgress(campaign);
  const status = getStatus(campaign);
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;
  const isPGC = campaign.kind === 'pgc';
  const clips = details?.clips || [];

  return (
    <View style={styles.modalOverlay}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      
      <View style={styles.modalContent}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <View style={[styles.modalStatusBadge, { 
              backgroundColor: statusConfig.bg,
              borderColor: statusConfig.border
            }]}>
              <StatusIcon size={14} color={statusConfig.text} />
              <Text style={[styles.modalStatusText, { color: statusConfig.text }]}>
                {status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.modalTitle}>{campaign.title}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.modalBody}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.modalLoadingText}>Loading campaign details...</Text>
            </View>
          ) : (
            <>
              {/* Campaign Overview */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Campaign Overview</Text>
                
                <View style={styles.modalOverviewGrid}>
                  <View style={styles.modalOverviewItem}>
                    <Text style={styles.modalOverviewLabel}>Created</Text>
                    <Text style={styles.modalOverviewValue}>
                      {formatDate(campaign.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.modalOverviewItem}>
                    <Text style={styles.modalOverviewLabel}>Campaign ID</Text>
                    <Text style={styles.modalOverviewValue}>
                      {campaign._id.slice(-8).toUpperCase()}
                    </Text>
                  </View>
                  {/* <View style={styles.modalOverviewItem}>
                    <Text style={styles.modalOverviewLabel}>Type</Text>
                    <Text style={styles.modalOverviewValue}>
                      {campaign.kind?.toUpperCase() || 'STANDARD'}
                    </Text>
                  </View> */}
                  {/* <View style={styles.modalOverviewItem}>
                    <Text style={styles.modalOverviewLabel}>Progress</Text>
                    <Text style={styles.modalOverviewValue}>{progress}%</Text>
                  </View> */}
                </View>

                {/* Progress Bar */}
                <View style={styles.modalProgressContainer}>
                  <View style={styles.modalProgressBar}>
                    <View
                      style={[
                        styles.modalProgressFill,
                        { width: `${progress}%` }
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* Budget & Performance */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Budget & Performance</Text>
                
                <View style={styles.modalInfoGrid}>
                  <InfoCard
                    icon={DollarSign}
                    label="Total Budget"
                    value={formatCurrency(campaign.budget_total)}
                    color="#4F46E5"
                  />
                  <InfoCard
                    icon={TrendingUp}
                    label="Remaining"
                    value={formatCurrency(campaign.budget_remaining)}
                    color="#F59E0B"
                  />
                  {isPGC ? (
                    <>
                      <InfoCard
                        icon={Target}
                        label="Videos Desired"
                        value={campaign.desiredVideos?.toLocaleString() || '0'}
                        color="#2563EB"
                      />
                      <InfoCard
                        icon={CheckCircle}
                        label="Videos Approved"
                        value={campaign.approvedVideosCount?.toLocaleString() || '0'}
                        color="#10B981"
                      />
                    </>
                  ) : (
                    <>
                      <InfoCard
                        icon={Eye}
                        label="Views Purchased"
                        value={campaign.views_purchased?.toLocaleString() || '0'}
                        color="#2563EB"
                      />
                      <InfoCard
                        icon={TrendingUp}
                        label="Views Left"
                        value={campaign.views_left?.toLocaleString() || '0'}
                        color="#F59E0B"
                      />
                      <InfoCard
                        icon={DollarSign}
                        label="Rate per View"
                        value={`₦${campaign.rate_per_view}`}
                        color="#8B5CF6"
                      />
                    </>
                  )}
                  <InfoCard
                    icon={Users}
                    label="Creators Engaged"
                    value={campaign.clippersCount?.toLocaleString() || '0'}
                    color="#EC4899"
                  />
                </View>
              </View>

              {/* Campaign Details */}
              {(campaign.platforms?.length > 0 || 
                campaign.countries?.length > 0 || 
                campaign.hashtags?.length > 0 ||
                campaign.categories?.length > 0 ||
                campaign.directions?.length > 0 ||
                campaign.cta_url ||
                campaign.ugc?.brief) && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Campaign Details</Text>
                  
                  <View style={styles.modalDetailsList}>
                    {campaign.platforms && campaign.platforms.length > 0 && (
                      <DetailRow 
                        label="Platforms" 
                        value={campaign.platforms.join(' • ')} 
                      />
                    )}
                    
                    {campaign.countries && campaign.countries.length > 0 && (
                      <DetailRow 
                        label="Target Countries" 
                        value={campaign.countries.join(' • ')} 
                      />
                    )}
                    
                    {campaign.categories && campaign.categories.length > 0 && (
                      <DetailRow 
                        label="Categories" 
                        value={campaign.categories.join(' • ')} 
                      />
                    )}
                    
                    {campaign.hashtags && campaign.hashtags.length > 0 && (
                      <DetailRow 
                        label="Hashtags" 
                        value={campaign.hashtags.map(tag => `#${tag}`).join(' ')} 
                      />
                    )}
                    
                    {campaign.directions && campaign.directions.length > 0 && (
                      <View style={styles.detailBlock}>
                        <Text style={styles.detailBlockLabel}>Creative Directions</Text>
                        {campaign.directions.map((direction, idx) => (
                          <View key={idx} style={styles.bulletPoint}>
                            <Text style={styles.bulletDot}>•</Text>
                            <Text style={styles.bulletText}>{direction}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {campaign.ugc?.brief && (
                      <DetailRow 
                        label="Creative Brief" 
                        value={campaign.ugc.brief} 
                        multiline
                      />
                    )}
                    
                    {campaign.ugc?.deliverables && campaign.ugc.deliverables.length > 0 && (
                      <DetailRow 
                        label="Deliverables" 
                        value={campaign.ugc.deliverables.join(' • ')} 
                      />
                    )}
                    
                    {campaign.ugc?.approvalCriteria && (
                      <DetailRow 
                        label="Approval Criteria" 
                        value={campaign.ugc.approvalCriteria} 
                        multiline
                      />
                    )}
                    
                    {campaign.cta_url && (
                      <DetailRow 
                        label="Call to Action URL" 
                        value={campaign.cta_url} 
                      />
                    )}
                  </View>
                </View>
              )}

              {/* Submitted Clips/Videos */}
              {clips.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    {isPGC ? 'Submitted Videos' : 'Processed Clips'}
                  </Text>
                  
                  <FlatList
                    data={clips}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item: clip }) => (
                      <View style={styles.clipCard}>
                        <View style={styles.clipPreview}>
                          <Film size={32} color="#4F46E5" />
                        </View>
                        <View style={styles.clipInfo}>
                          <Text style={styles.clipCreator}>
                            {clip.adWorker?.contactName || 'Creator'}
                          </Text>
                          <Text style={styles.clipDate}>
                            {formatDate(clip.createdAt)}
                          </Text>
                          {isPGC && (
                            <View style={[
                              styles.clipStatusBadge,
                              clip.status === 'approved' && styles.clipStatusApproved,
                              clip.status === 'rejected' && styles.clipStatusRejected,
                            ]}>
                              <Text style={styles.clipStatusText}>
                                {clip.status || 'Pending'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.clipsList}
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// Helper Components
function InfoCard({ icon: Icon, label, value, color }: any) {
  return (
    <View style={styles.infoCard}>
      <View style={[styles.infoCardIcon, { backgroundColor: `${color}10` }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={styles.infoCardLabel}>{label}</Text>
      <Text style={styles.infoCardValue}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, multiline && styles.detailValueMultiline]}>
        {value}
      </Text>
    </View>
  );
}

// Add RefreshControl import
const RefreshControl = require('react-native').RefreshControl;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 40,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 0,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterScroll: {
    marginBottom: 3,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#4F46E5',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
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
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  completedTitle: {
    color: '#6B7280',
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  completedCard: {
    opacity: 0.9,
    backgroundColor: '#F9FAFB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  cardThumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 24,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardType: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  cardDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardStat: {
    flex: 1,
    minWidth: (width - 80) / 3,
  },
  cardStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 2,
  },
  cardStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewDetailsButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  viewClipsButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewClipsGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewClipsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  paginationInfo: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  paginationText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyImage: {
    width: 200,
    height: 180,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  createButton: {
    width: 200,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  closeButton: {
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
  modalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalSection: {
    marginBottom: 32,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  modalOverviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  modalOverviewItem: {
    flex: 1,
    minWidth: (width - 80) / 2,
  },
  modalOverviewLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  modalOverviewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalProgressContainer: {
    marginTop: 8,
  },
  modalProgressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCard: {
    width: (width - 72) / 2,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalDetailsList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  detailValueMultiline: {
    lineHeight: 20,
  },
  detailBlock: {
    gap: 8,
  },
  detailBlockLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontSize: 16,
    color: '#4F46E5',
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  clipsSection: {
    marginTop: 8,
  },
  clipsList: {
    paddingRight: 20,
    gap: 12,
  },
  clipCard: {
    width: 200,
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  clipPreview: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clipInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  clipCreator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  clipDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  clipStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
  },
  clipStatusApproved: {
    backgroundColor: '#DCFCE7',
  },
  clipStatusRejected: {
    backgroundColor: '#FEE2E2',
  },
  clipStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
});