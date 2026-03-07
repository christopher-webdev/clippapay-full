// app/(dashboard)/clipper/campaign-detail/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
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

const toFullUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${UPLOADS_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

// Constants for currency conversion
const NAIRA_TO_USDT_RATE = 1400;
const MIN_NAIRA = 35000;
const MIN_USDT = MIN_NAIRA / NAIRA_TO_USDT_RATE; // ~26.92

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  // Apply form fields - synchronized
  const [rateNGN, setRateNGN] = useState('');
  const [rateUSDT, setRateUSDT] = useState('');
  const [note, setNote] = useState('');

  // Auto-convert when NGN changes
  const handleNGNChange = (value: string) => {
    const ngn = value.replace(/[^0-9]/g, '');
    setRateNGN(ngn);
    
    if (ngn) {
      const usdt = (Number(ngn) / NAIRA_TO_USDT_RATE).toFixed(2);
      setRateUSDT(usdt);
    } else {
      setRateUSDT('');
    }
  };

  // Auto-convert when USDT changes
  const handleUSDTChange = (value: string) => {
    // Allow numbers and one decimal point
    const usdt = value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
    setRateUSDT(usdt);
    
    if (usdt) {
      const ngn = Math.round(Number(usdt) * NAIRA_TO_USDT_RATE);
      setRateNGN(ngn.toString());
    } else {
      setRateNGN('');
    }
  };

  // Validation
  const isValidRate = () => {
    const ngn = Number(rateNGN);
    return ngn >= MIN_NAIRA;
  };

  const fetchCampaign = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Please log in', 'You need to be logged in to view campaign details.');
        router.replace('/(auth)/login');
        return;
      }

      const res = await fetch(`${API_URL}/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load campaign');

      setCampaign(data.campaign || data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load campaign details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCampaign();
  }, [id]);

  const handleApply = async () => {
    // Validation
    if (!rateNGN.trim() || !rateUSDT.trim()) {
      Alert.alert('Required', 'Please enter your proposed rate');
      return;
    }

    if (!isValidRate()) {
      Alert.alert(
        'Rate Too Low', 
        `Minimum UGC rate is ₦${MIN_NAIRA.toLocaleString()} ($${MIN_USDT.toFixed(2)} USDT). Please increase your rate.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const token = await SecureStore.getItemAsync('userToken');

      const body: any = {
        proposedRateNGN: Number(rateNGN),
        proposedRateUSDT: Number(rateUSDT),
        note: note.trim() || undefined,
      };

      const res = await fetch(`${API_URL}/applications/${id}/apply`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      Alert.alert(
        'Success',
        'Application submitted! The advertiser will review it soon.',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-NG').format(num);
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

  // Calculate fees (30%)
  const proposedNGN = rateNGN ? Number(rateNGN) : 0;
  const proposedUSDT = rateUSDT ? Number(rateUSDT) : 0;
  const feeNGN = proposedNGN * 0.3;
  const feeUSDT = proposedUSDT * 0.3;
  const yourEarningsNGN = proposedNGN - feeNGN;
  const yourEarningsUSDT = proposedUSDT - feeUSDT;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading campaign details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
          <Text style={styles.errorText}>Campaign not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Image with Gradient */}
          <View style={styles.heroContainer}>
            <Image
              source={{ 
                uri: toFullUrl(campaign.thumbnailUrl) || 'https://via.placeholder.com/600x300/6366f1/ffffff?text=UGC+Campaign' 
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

            {/* Status Badge */}
            <View style={[styles.heroStatus, { backgroundColor: getStatusColor(campaign.status) }]}>
              <Ionicons name={getStatusIcon(campaign.status)} size={14} color="#fff" />
              <Text style={styles.heroStatusText}>{campaign.status.toUpperCase()}</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Title and Category */}
            <View style={styles.headerSection}>
              <Text style={styles.title}>{campaign.title}</Text>
              <View style={styles.categoryRow}>
                <View style={styles.categoryBadge}>
                  <Ionicons name="pricetag" size={14} color="#6366f1" />
                  <Text style={styles.categoryText}>{campaign.category}</Text>
                </View>
                <View style={styles.lengthBadge}>
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.lengthText}>{campaign.preferredLength}</Text>
                </View>
              </View>
            </View>

            {/* Advertiser Info */}
            <View style={styles.advertiserCard}>
              <View style={styles.advertiserAvatar}>
                <Text style={styles.avatarText}>
                  {campaign.advertiser.company 
                    ? campaign.advertiser.company.charAt(0)
                    : `${campaign.advertiser.firstName.charAt(0)}${campaign.advertiser.lastName.charAt(0)}`}
                </Text>
              </View>
              <View style={styles.advertiserInfo}>
                <Text style={styles.advertiserName}>
                  {campaign.advertiser.company || `${campaign.advertiser.firstName} ${campaign.advertiser.lastName}`}
                </Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#fbbf24" />
                  <Text style={styles.ratingText}>{campaign.advertiser.rating.toFixed(1)}</Text>
                </View>
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={20} color="#6366f1" />
                <Text style={styles.sectionTitle}>Description</Text>
              </View>
              <Text style={styles.description}>{campaign.description}</Text>
            </View>

            {/* Script */}
            {campaign.script && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="mic-outline" size={20} color="#6366f1" />
                  <Text style={styles.sectionTitle}>Script / Talking Points</Text>
                </View>
                <Text style={styles.script}>{campaign.script}</Text>
              </View>
            )}

            {/* Key Phrases */}
            {campaign.keyPhrases?.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbubble-outline" size={20} color="#6366f1" />
                  <Text style={styles.sectionTitle}>Key Phrases (Must Include)</Text>
                </View>
                {campaign.keyPhrases.map((phrase: string, idx: number) => (
                  <View key={idx} style={styles.phraseItem}>
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    <Text style={styles.phraseText}>{phrase}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Creative Direction */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="color-palette-outline" size={20} color="#6366f1" />
                <Text style={styles.sectionTitle}>Creative Direction</Text>
              </View>

              <View style={styles.directionGrid}>
                <View style={styles.directionItem}>
                  <Text style={styles.directionLabel}>Aspect Ratio</Text>
                  <Text style={styles.directionValue}>{campaign.creativeDirection?.aspectRatio || 'Any'}</Text>
                </View>
                <View style={styles.directionItem}>
                  <Text style={styles.directionLabel}>Location</Text>
                  <Text style={styles.directionValue}>{campaign.creativeDirection?.preferredLocation || 'Anywhere'}</Text>
                </View>
              </View>

              {campaign.creativeDirection?.locationDescription && (
                <View style={styles.directionDetail}>
                  <Text style={styles.directionDetailLabel}>Location Details</Text>
                  <Text style={styles.directionDetailText}>{campaign.creativeDirection.locationDescription}</Text>
                </View>
              )}

              {campaign.creativeDirection?.backgroundStyle && (
                <View style={styles.directionDetail}>
                  <Text style={styles.directionDetailLabel}>Background Style</Text>
                  <Text style={styles.directionDetailText}>{campaign.creativeDirection.backgroundStyle}</Text>
                </View>
              )}

              {campaign.creativeDirection?.moodTone && (
                <View style={styles.directionDetail}>
                  <Text style={styles.directionDetailLabel}>Mood / Tone</Text>
                  <Text style={styles.directionDetailText}>{campaign.creativeDirection.moodTone}</Text>
                </View>
              )}
            </View>

            {/* Reference Links */}
            {campaign.creativeDirection?.referenceLinks?.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="link-outline" size={20} color="#6366f1" />
                  <Text style={styles.sectionTitle}>Reference Links</Text>
                </View>
                {campaign.creativeDirection.referenceLinks.map((link: string, idx: number) => {
                  const isValidUrl = link.startsWith('http://') || link.startsWith('https://');
                  return (
                    <TouchableOpacity 
                      key={idx} 
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
                      <Text style={[styles.linkText, !isValidUrl && styles.linkTextDisabled]} numberOfLines={1}>
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
                  {new Date(campaign.applicationDeadline).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {/* Apply Form - only if active and not already applied */}
            {campaign.status === 'active' && !alreadyApplied ? (
              <View style={styles.applySection}>
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyHeader}
                >
                  <Ionicons name="paper-plane" size={24} color="#fff" />
                  <Text style={styles.applyHeaderTitle}>Apply for this Campaign</Text>
                </LinearGradient>

                <View style={styles.applyContent}>
                  {/* Minimum Rate Notice */}
                  <View style={styles.minRateNotice}>
                    <Ionicons name="information-circle" size={20} color="#f59e0b" />
                    <Text style={styles.minRateText}>
                      Minimum UGC rate: <Text style={styles.minRateBold}>₦{MIN_NAIRA.toLocaleString()} ($${MIN_USDT.toFixed(2)} USDT)</Text>
                      {'\n'}Rate: ₦{NAIRA_TO_USDT_RATE} per 1 USDT
                    </Text>
                  </View>

                  <Text style={styles.inputLabel}>
                    Proposed Rate (NGN) <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`Minimum ₦${MIN_NAIRA.toLocaleString()}`}
                    value={rateNGN}
                    onChangeText={handleNGNChange}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.inputLabel}>
                    Proposed Rate (USDT) <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`Minimum $${MIN_USDT.toFixed(2)}`}
                    value={rateUSDT}
                    onChangeText={handleUSDTChange}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#94a3b8"
                  />

                  {/* Fee Preview - Shows when rates are entered */}
                  {(rateNGN || rateUSDT) && (
                    <View style={styles.feePreview}>
                      <Text style={styles.feePreviewTitle}>After ClippaPay Fee (30%)</Text>
                      {rateNGN && (
                        <View style={styles.feeRow}>
                          <Text style={styles.feeLabel}>You'll receive (NGN):</Text>
                          <Text style={styles.feeValue}>₦{formatNumber(yourEarningsNGN)}</Text>
                        </View>
                      )}
                      {rateUSDT && (
                        <View style={styles.feeRow}>
                          <Text style={styles.feeLabel}>You'll receive (USDT):</Text>
                          <Text style={styles.feeValue}>${formatNumber(yourEarningsUSDT)}</Text>
                        </View>
                      )}
                      <View style={styles.feeNote}>
                        <Ionicons name="information-circle" size={14} color="#6366f1" />
                        <Text style={styles.feeNoteText}>
                          ClippaPay deducts 30% from your proposed rate
                        </Text>
                      </View>
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Note / Message to Advertiser (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Why you're a great fit, your experience, etc..."
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={4}
                    placeholderTextColor="#94a3b8"
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={[
                      styles.submitButton, 
                      (submitting || !isValidRate()) && styles.disabled
                    ]}
                    onPress={handleApply}
                    disabled={submitting || !isValidRate()}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.submitText}>Submit Application</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : campaign.status !== 'active' ? (
              <View style={styles.statusMessage}>
                <Ionicons name="lock-closed" size={24} color="#92400e" />
                <Text style={styles.statusText}>
                  This campaign is {campaign.status}. Applications are closed.
                </Text>
              </View>
            ) : (
              <View style={[styles.statusMessage, styles.appliedMessage]}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text style={[styles.statusText, styles.appliedText]}>
                  You have already applied to this campaign
                </Text>
              </View>
            )}

            {/* Info Note */}
            <View style={styles.infoNote}>
              <Ionicons name="information-circle" size={20} color="#6366f1" />
              <Text style={styles.infoNoteText}>
                Advertisers can choose to pay in either NGN or USDT. ClippaPay's 30% fee applies to all payments. Minimum rate: ₦{MIN_NAIRA.toLocaleString()}.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  scrollContent: { 
    paddingBottom: 40, 
    marginTop: 100,
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
  heroStatus: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  heroStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  content: { 
    padding: 20,
    marginTop: -20,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerSection: {
    marginBottom: 16,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#0f172a',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  lengthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  lengthText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  advertiserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  advertiserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
  },
  advertiserInfo: {
    flex: 1,
  },
  advertiserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#64748b',
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
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
  },
  script: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  phraseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  phraseText: {
    fontSize: 15,
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
  applySection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginTop: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  applyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  applyHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  applyContent: {
    padding: 20,
  },
  minRateNotice: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  minRateText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  minRateBold: {
    fontWeight: '700',
    color: '#b45309',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  feePreview: {
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  feePreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  feeLabel: {
    fontSize: 14,
    color: '#475569',
  },
  feeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  feeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  feeNoteText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  disabled: { 
    opacity: 0.6 
  },
  submitText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  statusMessage: {
    backgroundColor: '#fef3c7',
    padding: 20,
    borderRadius: 16,
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  appliedMessage: {
    backgroundColor: '#d1fae5',
  },
  statusText: { 
    fontSize: 15, 
    color: '#92400e', 
    textAlign: 'center',
    lineHeight: 22,
  },
  appliedText: {
    color: '#065f46',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#64748b',
    marginTop: 16,
    marginBottom: 20,
  },
  backButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 56,
    gap: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
});