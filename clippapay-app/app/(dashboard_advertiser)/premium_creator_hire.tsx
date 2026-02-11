// app/(dashboard_advertiser)/premium_creator_hire.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const scale = width / 428;

const API_BASE = 'https://clippapay.com/api';

export default function PremiumCreatorHire() {
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [brief, setBrief] = useState('');
  const [directions, setDirections] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [approvalCriteria, setApprovalCriteria] = useState('');
  const [cta_url, setCtaUrl] = useState('');
  const [assets, setAssets] = useState<any[]>([]);

  // Wallet states
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('brief');

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

  const toFullUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://clippapay.com${path}`;
  };

  // Load creator ID from storage
  useEffect(() => {
    const loadCreatorId = async () => {
      try {
        const storedId = await AsyncStorage.getItem('selectedCreatorId');
        if (storedId) {
          setCreatorId(storedId);
        } else {
          setError('No creator selected');
          setLoading(false);
        }
      } catch (storageErr) {
        console.error('Failed to load creator ID from storage:', storageErr);
        setError('Failed to load selected creator');
        setLoading(false);
      }
    };

    loadCreatorId();
  }, []);

  // Fetch creator profile
  useEffect(() => {
    if (!creatorId) return;

    setLoading(true);
    setError(null);

    const fetchCreator = async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token found');
        }

        console.log(`Fetching creator profile for ID: ${creatorId}`);

        const res = await axios.get(`${API_BASE}/user/clipper-profile/${creatorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('Received creator data:', res.data);

        setCreator(res.data);
      } catch (err: any) {
        console.error('Failed to load creator:', err);
        const errMsg = err.response?.data?.error || 'Failed to load creator profile';
        setError(errMsg);
        Alert.alert('Error', errMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [creatorId]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      setWalletLoading(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('No token');

        const res = await axios.get(`${API_BASE}/wallet`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setWalletBalance(res.data.balance || 0);
      } catch (err) {
        console.error('Failed to load wallet:', err);
        Alert.alert('Error', 'Failed to load wallet balance');
      } finally {
        setWalletLoading(false);
      }
    };

    fetchWalletBalance();
  }, []);

  const pickAssets = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*', 'application/pdf'],
        multiple: true,
      });

      if (result.assets && result.assets.length > 0) {
        const newAssets = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType,
        }));
        setAssets([...assets, ...newAssets]);
      }
    } catch (err) {
      console.error('Asset picker error:', err);
      Alert.alert('Error', 'Failed to select assets');
    }
  };

  const removeAsset = (index: number) => {
    const newAssets = assets.filter((_, i) => i !== index);
    setAssets(newAssets);
  };

  const handleCreateCampaign = async () => {
    setSubmitError(null);
    setMessage(null);

    // Required fields validation
    if (!title || !directions || !approvalCriteria) {
      setSubmitError('Please fill all required fields: Campaign Title, Creative Directions, Approval Criteria');
      return;
    }

    const budget = creator.ratePerVideo || 0;

    // Wallet balance check
    if (budget > walletBalance) {
      setSubmitError(`Campaign cost ($${budget}) exceeds wallet balance ($${walletBalance}).`);
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const fd = new FormData();
      fd.append('title', title);
      fd.append('budget', budget.toString());
      fd.append('kind', 'premium');
      fd.append('creatorId', creatorId || '');
      fd.append('script', script);
      fd.append('brief', brief);
      fd.append('directions', JSON.stringify(directions.split('\n').map((s) => s.trim()).filter(Boolean)));
      fd.append('deliverables', JSON.stringify(deliverables.split(/\n|,/).map((s) => s.trim()).filter(Boolean)));
      fd.append('hashtags', JSON.stringify(hashtags.split(',').map((s) => s.trim()).filter(Boolean)));
      fd.append('approvalCriteria', approvalCriteria);
      if (cta_url) fd.append('cta_url', cta_url);

      // Assets
      setUploadingAssets(true);
      assets.forEach((asset) => {
        fd.append('assets', {
          uri: asset.uri,
          name: asset.name,
          type: asset.type,
        });
      });

      // Placeholder API call - to be implemented after view verification
      await axios.post(`${API_BASE}/campaigns/premium`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('CAMPAIGN PAYLOAD:', fd);

      setMessage('Campaign created successfully!');
    } catch (err: any) {
      console.error('Submit error:', err);
      setSubmitError(err.response?.data?.error || 'Failed to create campaign. Please try again.');
    } finally {
      setUploadingAssets(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <LinearGradient
          colors={['#0A0A0A', '#1A1A1A']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loaderContent}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loaderText}>Loading creator profile...</Text>
        </View>
      </View>
    );
  }

  if (error || !creator) {
    return (
      <View style={styles.loader}>
        <LinearGradient
          colors={['#0A0A0A', '#1A1A1A']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B35" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error || 'Creator not found'}</Text>
          <TouchableOpacity style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const image = toFullUrl(creator.profileImage);
  const video = toFullUrl(creator.sampleVideo);
  const budget = creator.ratePerVideo || 0;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#0A0A0A', '#121212', '#1E1E1E']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Section with Gradient Overlay */}
          <View style={styles.heroSection}>
            <Image source={{ uri: image }} style={styles.heroImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)', '#0A0A0A']}
              style={styles.heroGradient}
              locations={[0, 0.6, 1]}
            />
            
            <View style={styles.heroContent}>
              <View style={styles.badgeContainer}>
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.premiumText}>Premium Creator</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#4F46E5" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>

              <Text style={styles.name}>
                {creator.user?.firstName} {creator.user?.lastName}
              </Text>

              <View style={styles.ratingContainer}>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= Math.round(creator.user?.rating || 0) ? "star" : "star-outline"}
                      size={18}
                      color="#FFD700"
                    />
                  ))}
                </View>
                <Text style={styles.ratingText}>
                  {(creator.user?.rating || 0).toFixed(1)} · {creator.completedProjects || 0} projects
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Stats Card */}
          <BlurView intensity={20} tint="dark" style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{creator.completedProjects || 0}</Text>
              <Text style={styles.statLabel}>Completed Projects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{creator.expectedDelivery || 2}d</Text>
              <Text style={styles.statLabel}>Avg. Delivery</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₦{creator.ratePerVideo || 0}</Text>
              <Text style={styles.statLabel}>Rate / Video</Text>
            </View>
          </BlurView>

          {/* Bio Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="user-circle" size={20} color="#FF6B35" />
              <Text style={styles.sectionTitle}>About the Creator</Text>
            </View>
            <Text style={styles.bioText}>
              {creator.bio || 'Professional premium creator specializing in high-quality branded content. Experienced in product reviews, tutorials, and storytelling.'}
            </Text>
          </View>

          {/* Sample Video */}
          {video && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="videocam" size={20} color="#FF6B35" />
                <Text style={styles.sectionTitle}>Sample Work</Text>
              </View>
              <View style={styles.videoContainer}>
                <Video
                  source={{ uri: video }}
                  style={styles.video}
                  useNativeControls
                  resizeMode="cover"
                />
              </View>
            </View>
          )}

          {/* How It Works Card */}
          <View style={styles.howItWorksCard}>
            <LinearGradient
              colors={['rgba(79, 70, 229, 0.15)', 'rgba(255, 51, 102, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.howItWorksHeader}>
              <Ionicons name="flash" size={24} color="#FF6B35" />
              <Text style={styles.howItWorksTitle}>Premium Creator Hire</Text>
            </View>
            <Text style={styles.howItWorksText}>
              Commission this premium creator to produce a custom, high-quality video tailored to your brand.
            </Text>
            <View style={styles.stepsGrid}>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Provide Brief</Text>
                <Text style={styles.stepDesc}>Script, directions & examples</Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Creator Produces</Text>
                <Text style={styles.stepDesc}>Professional video content</Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepTitle}>Review & Approve</Text>
                <Text style={styles.stepDesc}>Request changes or publish</Text>
              </View>
            </View>
          </View>

          {/* Campaign Form */}
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <View style={styles.formHeaderLeft}>
                <Ionicons name="document-text" size={24} color="#FF6B35" />
                <Text style={styles.formTitle}>Create Campaign</Text>
              </View>
              <View style={styles.walletBadge}>
                <Ionicons name="wallet" size={16} color="#10B981" />
                <Text style={styles.walletText}>
                  ₦{walletBalance.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'brief' && styles.activeTab]}
                onPress={() => setActiveTab('brief')}
              >
                <Text style={[styles.tabText, activeTab === 'brief' && styles.activeTabText]}>Brief</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'requirements' && styles.activeTab]}
                onPress={() => setActiveTab('requirements')}
              >
                <Text style={[styles.tabText, activeTab === 'requirements' && styles.activeTabText]}>Requirements</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'assets' && styles.activeTab]}
                onPress={() => setActiveTab('assets')}
              >
                <Text style={[styles.tabText, activeTab === 'assets' && styles.activeTabText]}>Assets</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'brief' && (
              <>
                {/* Title */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Campaign Title <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="megaphone-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g. Summer Collection 2024 Launch"
                      placeholderTextColor="#6B7280"
                    />
                  </View>
                </View>

                {/* Script */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Script</Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <Ionicons name="create-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={script}
                      onChangeText={setScript}
                      placeholder="Write the exact words the creator should say..."
                      placeholderTextColor="#6B7280"
                      multiline
                      numberOfLines={6}
                    />
                  </View>
                </View>

                {/* Brief */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Creative Brief</Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <Ionicons name="briefcase-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={brief}
                      onChangeText={setBrief}
                      placeholder="Target audience, key messages, mood, tone..."
                      placeholderTextColor="#6B7280"
                      multiline
                      numberOfLines={5}
                    />
                  </View>
                </View>
              </>
            )}

            {activeTab === 'requirements' && (
              <>
                {/* Creative Directions */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Creative Directions <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <Ionicons name="compass-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={directions}
                      onChangeText={setDirections}
                      placeholder="• Use bright, natural lighting&#10;• Show product from multiple angles&#10;• Include lifestyle shots"
                      placeholderTextColor="#6B7280"
                      multiline
                      numberOfLines={6}
                    />
                  </View>
                </View>

                {/* Deliverables */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Deliverables</Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <Ionicons name="cube-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={deliverables}
                      onChangeText={setDeliverables}
                      placeholder="Format, resolution, duration, orientation..."
                      placeholderTextColor="#6B7280"
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                </View>

                {/* Approval Criteria */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Approval Criteria <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <Ionicons name="checkmark-done-circle-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={approvalCriteria}
                      onChangeText={setApprovalCriteria}
                      placeholder="• No watermarks&#10;• Clear audio&#10;• Brand colors used"
                      placeholderTextColor="#6B7280"
                      multiline
                      numberOfLines={5}
                    />
                  </View>
                </View>

                {/* Hashtags */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hashtags</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="pricetag-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={hashtags}
                      onChangeText={setHashtags}
                      placeholder="#brand, #campaign, #product"
                      placeholderTextColor="#6B7280"
                    />
                  </View>
                </View>

                {/* CTA URL */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Call-to-Action Link</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="link-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={cta_url}
                      onChangeText={setCtaUrl}
                      placeholder="https://yourwebsite.com"
                      placeholderTextColor="#6B7280"
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </>
            )}

            {activeTab === 'assets' && (
              <>
                {/* Reference Assets */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reference Assets</Text>
                  <View style={styles.assetsInfoCard}>
                    <Ionicons name="information-circle-outline" size={20} color="#4F46E5" />
                    <Text style={styles.assetsInfoText}>
                      Upload images, videos, logos, or mood boards to help the creator understand your vision
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.uploadArea} onPress={pickAssets}>
                    <View style={styles.uploadIconContainer}>
                      <Ionicons name="cloud-upload" size={40} color="#FF6B35" />
                    </View>
                    <Text style={styles.uploadTitle}>Browse Files</Text>
                    <Text style={styles.uploadDescription}>
                      Tap to select images, videos, or PDFs
                    </Text>
                    <Text style={styles.uploadHint}>
                      Multiple files allowed
                    </Text>
                  </TouchableOpacity>

                  {assets.length > 0 && (
                    <View style={styles.assetsList}>
                      <View style={styles.assetsListHeader}>
                        <Text style={styles.assetsListTitle}>Selected Files</Text>
                        <Text style={styles.assetsListCount}>{assets.length}</Text>
                      </View>
                      {assets.map((asset, index) => (
                        <View key={index} style={styles.assetCard}>
                          <View style={styles.assetIconContainer}>
                            {asset.type?.includes('image') ? (
                              <Ionicons name="image" size={24} color="#4F46E5" />
                            ) : asset.type?.includes('video') ? (
                              <Ionicons name="videocam" size={24} color="#4F46E5" />
                            ) : (
                              <Ionicons name="document" size={24} color="#4F46E5" />
                            )}
                          </View>
                          <View style={styles.assetInfo}>
                            <Text style={styles.assetName} numberOfLines={1}>
                              {asset.name}
                            </Text>
                            <Text style={styles.assetType}>
                              {asset.type?.split('/')[0] || 'document'}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            onPress={() => removeAsset(index)}
                            style={styles.assetRemoveButton}
                          >
                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Budget & Submit Section */}
            <View style={styles.budgetSection}>
              <View style={styles.budgetInfo}>
                <Text style={styles.budgetLabel}>Campaign Investment</Text>
                <View style={styles.budgetAmount}>
                  <Text style={styles.budgetCurrency}>₦</Text>
                  <Text style={styles.budgetValue}>{budget}</Text>
                </View>
                <View style={[
                  styles.balanceIndicator,
                  budget > walletBalance && styles.insufficientBalance
                ]}>
                  <Ionicons 
                    name={budget > walletBalance ? "alert-circle" : "checkmark-circle"} 
                    size={16} 
                    color={budget > walletBalance ? "#EF4444" : "#10B981"} 
                  />
                  <Text style={[
                    styles.balanceText,
                    budget > walletBalance && styles.insufficientBalanceText
                  ]}>
                    {walletLoading ? 'Loading...' : `₦${walletBalance.toLocaleString()} available`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (loading || uploadingAssets || budget > walletBalance) && styles.submitButtonDisabled
                ]}
                onPress={handleCreateCampaign}
                disabled={loading || uploadingAssets || budget > walletBalance}
              >
                <LinearGradient
                  colors={budget > walletBalance ? ['#4B5563', '#6B7280'] : ['#FF3366', '#FF6B35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitGradient}
                />
                <Text style={styles.submitButtonText}>
                  {uploadingAssets ? 'Uploading Assets...' : 
                   loading ? 'Creating Campaign...' : 
                   `Hire Creator • $${budget}`}
                </Text>
              </TouchableOpacity>
            </View>

            {message && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.successMessage}>{message}</Text>
              </View>
            )}
            
            {submitError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <Text style={styles.errorMessage}>{submitError}</Text>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContent: {
    alignItems: 'center',
  },
  loaderText: {
    color: '#FFF',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContent: {
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: 'rgba(255, 51, 102, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FF3366',
  },
  errorButtonText: {
    color: '#FF3366',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 80,
    marginTop: 120 * scale,
  },
  heroSection: {
    height: 300 * scale,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.3)',
  },
  verifiedText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  name: {
    color: '#FFF',
    fontSize: 32 * scale,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -0,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    flex: 1,
    paddingVertical: 20,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: -0.3,
  },
  bioText: {
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  videoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  video: {
    width: '100%',
    height: 200 * scale,
  },
  howItWorksCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  howItWorksTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  howItWorksText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  stepsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  stepNumberText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
  },
  stepTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDesc: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
  },
  formSection: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  walletText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FF6B35',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  requiredStar: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    paddingVertical: 14,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  assetsInfoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.3)',
  },
  assetsInfoText: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 13,
    marginLeft: 10,
    lineHeight: 18,
  },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,107,53,0.3)',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,107,53,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  uploadDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  uploadHint: {
    color: '#6B7280',
    fontSize: 12,
  },
  assetsList: {
    marginTop: 20,
  },
  assetsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  assetsListTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  assetsListCount: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  assetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(79,70,229,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetInfo: {
    flex: 1,
    marginLeft: 12,
  },
  assetName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  assetType: {
    color: '#9CA3AF',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  assetRemoveButton: {
    padding: 4,
  },
  budgetSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  budgetAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  budgetCurrency: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    marginRight: 2,
  },
  budgetValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
  },
  balanceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  insufficientBalance: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  balanceText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  insufficientBalanceText: {
    color: '#EF4444',
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  successMessage: {
    flex: 1,
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorMessage: {
    flex: 1,
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
});