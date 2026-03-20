// app/(dashboard)/advertiser/campaign-details/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_BASE_URL = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL;

const toFullUrl = (path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${UPLOADS_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

// Exchange rate (you might want to fetch this from an API)
const USDT_TO_NGN_RATE = 1400; // Example rate: 1 USDT = 1500 NGN

export default function CampaignDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'NGN' | 'USDT'>('USDT');

  const fetchCampaign = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch(`${API_URL}/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setCampaign(data.campaign || data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const handleAction = async (action: 'activate' | 'close' | 'cancel') => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch(`${API_URL}/campaigns/${id}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Action failed');
      Alert.alert('Success', `Campaign ${action}ed successfully`);
      fetchCampaign();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDelete = async () => {
    if (campaign?.status !== 'cancelled') {
      Alert.alert('Not allowed', 'You can only delete a cancelled campaign.');
      return;
    }

    Alert.alert(
      'Delete Campaign',
      'Are you sure you want to permanently delete this campaign? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const token = await SecureStore.getItemAsync('userToken');
              const res = await fetch(`${API_URL}/campaigns/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Delete failed');

              Alert.alert('Deleted', 'Campaign has been permanently deleted.');
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return '#10b981';
      case 'draft': return '#64748b';
      case 'closed': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': return 'checkmark-circle';
      case 'draft': return 'create-outline';
      case 'closed': return 'lock-closed';
      case 'cancelled': return 'close-circle';
      default: return 'information-circle';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-NG').format(num);
  };

  // Calculate amounts
  const usdtAmount = campaign?.reward?.usdt || 0;
  const ngnAmount = campaign?.reward?.ngn || 0;
  const clippaFeeUSDT = usdtAmount * 0.3; // 30% fee
  const clippaFeeNGN = ngnAmount * 0.3;
  const yourEarningsUSDT = usdtAmount - clippaFeeUSDT;
  const yourEarningsNGN = ngnAmount - clippaFeeNGN;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading campaign details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Image with Gradient Overlay */}
      <View style={styles.heroContainer}>
        <Image
          source={{ 
            uri: toFullUrl(campaign?.thumbnailUrl) || 'https://via.placeholder.com/600x300/6366f1/ffffff?text=No+Image' 
          }}
          style={styles.heroImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(15, 23, 42, 0.9)']}
          style={styles.heroGradient}
        />
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Category Badge */}
        <View style={styles.heroCategory}>
          <Ionicons name="pricetag" size={14} color="#fff" />
          <Text style={styles.heroCategoryText}>{campaign?.category}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>{campaign?.title}</Text>
          
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(campaign?.status) }]}>
            <Ionicons name={getStatusIcon(campaign?.status)} size={16} color="#fff" />
            <Text style={styles.statusText}>{campaign?.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <Text style={styles.text}>{campaign?.description}</Text>
        </View>

        {/* Script Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mic-outline" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Script / Talking Points</Text>
          </View>
          <Text style={styles.text}>{campaign?.script || 'No script provided'}</Text>
        </View>

        {/* Key Phrases */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-outline" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Key Phrases (Must be said)</Text>
          </View>
          {campaign?.keyPhrases?.length > 0 ? (
            campaign.keyPhrases.map((phrase: string, index: number) => (
              <View key={index} style={styles.phraseItem}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.phraseText}>{phrase}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.textMuted}>No key phrases added</Text>
          )}
        </View>

        {/* Creative Direction */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="color-palette-outline" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Creative Direction</Text>
          </View>

          <View style={styles.directionGrid}>
            <View style={styles.directionItem}>
              <Text style={styles.directionLabel}>Aspect Ratio</Text>
              <Text style={styles.directionValue}>{campaign?.creativeDirection?.aspectRatio}</Text>
            </View>
            <View style={styles.directionItem}>
              <Text style={styles.directionLabel}>Location</Text>
              <Text style={styles.directionValue}>{campaign?.creativeDirection?.preferredLocation}</Text>
            </View>
          </View>

          {campaign?.creativeDirection?.locationDescription && (
            <View style={styles.directionDetail}>
              <Text style={styles.directionDetailLabel}>Location Details:</Text>
              <Text style={styles.directionDetailText}>{campaign.creativeDirection.locationDescription}</Text>
            </View>
          )}

          {campaign?.creativeDirection?.backgroundStyle && (
            <View style={styles.directionDetail}>
              <Text style={styles.directionDetailLabel}>Background Style:</Text>
              <Text style={styles.directionDetailText}>{campaign.creativeDirection.backgroundStyle}</Text>
            </View>
          )}

          {campaign?.creativeDirection?.moodTone && (
            <View style={styles.directionDetail}>
              <Text style={styles.directionDetailLabel}>Mood / Tone:</Text>
              <Text style={styles.directionDetailText}>{campaign.creativeDirection.moodTone}</Text>
            </View>
          )}
        </View>

        {/* Reference Links */}
        {campaign?.creativeDirection?.referenceLinks?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="link-outline" size={20} color="#6366f1" />
              <Text style={styles.sectionTitle}>Reference Links</Text>
            </View>
            {campaign.creativeDirection.referenceLinks.map((link: string, index: number) => {
              const isValidUrl = link.startsWith('http://') || link.startsWith('https://');
              return (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.linkItem,
                    !isValidUrl && styles.linkItemDisabled
                  ]}
                  onPress={() => isValidUrl && Linking.openURL(link)}
                  disabled={!isValidUrl}
                >
                  <Ionicons 
                    name={isValidUrl ? "link" : "alert-circle"} 
                    size={18} 
                    color={isValidUrl ? "#3b82f6" : "#94a3b8"} 
                  />
                  <Text style={[styles.linkText, !isValidUrl && styles.linkTextDisabled]}>
                    {link}
                  </Text>
                  {isValidUrl && (
                    <Ionicons name="open-outline" size={16} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Deadline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Application Deadline</Text>
          </View>
          <View style={styles.deadlineCard}>
            <Ionicons name="time" size={20} color="#ef4444" />
            <Text style={styles.deadlineText}>
              {new Date(campaign?.applicationDeadline).toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {campaign?.status === 'draft' && (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => handleAction('activate')}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Ionicons name="rocket-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Activate Campaign</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {campaign?.status === 'active' && (
            <TouchableOpacity style={styles.btnWarning} onPress={() => handleAction('close')}>
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Close Applications</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {campaign?.status === 'active' && (
            <TouchableOpacity style={styles.btnWarning} onPress={() => router.push({
              pathname: '/(dashboard_advertiser)/review-applications/[campaignId]',
              params: { campaignId: id as string }
            })}>
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Review Applications</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnDanger} onPress={() => handleAction('cancel')}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>Cancel Campaign</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Delete Button - Only for cancelled campaigns */}
          {campaign?.status === 'cancelled' && (
            <TouchableOpacity 
              style={styles.btnDelete} 
              onPress={handleDelete} 
              disabled={deleting}
            >
              <LinearGradient
                colors={['#1f2937', '#111827']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>
                  {deleting ? 'Deleting...' : 'Delete Campaign'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={20} color="#6366f1" />
          <Text style={styles.infoNoteText}>
            Advertisers can choose to pay in either NGN or USDT.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  heroContainer: {
    position: 'relative',
    height: 300,
  },
  heroImage: { 
    width: '100%', 
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCategory: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  heroCategoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: { 
    padding: 20,
    marginTop: -20,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerSection: {
    marginBottom: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#0f172a',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  rewardSection: {
    marginBottom: 24,
  },
  rewardSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  currencyToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  currencyOptionActive: {
    backgroundColor: '#6366f1',
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  currencyTextActive: {
    color: '#fff',
  },
  rewardCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  rewardGradient: {
    padding: 20,
  },
  rewardLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  rewardAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  feeBreakdown: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  feeValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  feeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feeNoteText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },
  section: {
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
    fontWeight: '600',
    color: '#1e293b',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
  },
  textMuted: {
    fontSize: 16,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  phraseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  phraseText: {
    fontSize: 16,
    color: '#475569',
    flex: 1,
  },
  directionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  directionItem: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
  },
  directionLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  directionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  directionDetail: {
    marginBottom: 12,
  },
  directionDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  directionDetailText: {
    fontSize: 15,
    color: '#475569',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  linkItemDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.7,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  linkTextDisabled: {
    color: '#94a3b8',
    textDecorationLine: 'none',
  },
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  deadlineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    flex: 1,
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  btnPrimary: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnWarning: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnDanger: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnDelete: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 20,
    gap: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
});