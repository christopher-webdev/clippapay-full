// app/(dashboard)/create-clipping.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInRight,
} from 'react-native-reanimated';

// Types
interface WalletData {
  balance: number;
  usdtBalance: number;
  preferredCurrency: 'NGN' | 'USDT';
}

interface CampaignForm {
  title: string;
  videoUrl: string;
  budget: string;
  currency: 'NGN' | 'USDT';
  platforms: string[];
  hashtags: string;
  directions: string;
  categories: string[];
  ctaUrl: string;
}

interface FormErrors {
  title?: string;
  videoUrl?: string;
  budget?: string;
  platforms?: string;
  categories?: string;
}

// Constants
const API_BASE = 'https://clippapay.com/api';
const NGN_PER_THOUSAND_VIEWS = 3000;
const USDT_PER_THOUSAND_VIEWS = 1.85; // Approximate USDT equivalent

const PLATFORM_OPTIONS = [
  { id: 'tiktok', label: 'TikTok', icon: 'logo-tiktok' },
  { id: 'instagram', label: 'Instagram Reels', icon: 'logo-instagram' },
  { id: 'youtube', label: 'YouTube Shorts', icon: 'logo-youtube' },
  { id: 'facebook', label: 'Facebook Reels', icon: 'logo-facebook' },
  // { id: 'snapchat', label: 'Snapchat Spotlight', icon: 'logo-snapchat' },
  { id: 'twitter', label: 'X (Twitter)', icon: 'logo-twitter' },
] as const;

const CATEGORY_OPTIONS = [
  'Fashion & Style',
  'Beauty & Makeup',
  'Tech & Gadgets',
  'Gaming',
  'Food & Cooking',
  'Travel & Adventure',
  'Fitness & Health',
  'Business & Finance',
  'Education & Learning',
  'Entertainment',
  'Comedy',
  'Sports',
  'Music & Dance',
  'DIY & Crafts',
  'Lifestyle',
  'Motivation & Inspiration',
  'Pets & Animals',
  'Parenting & Family',
  'Automotive',
  'Real Estate',
] as const;

export default function CreateClippingCampaign() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [form, setForm] = useState<CampaignForm>({
    title: '',
    videoUrl: '',
    budget: '',
    currency: 'NGN',
    platforms: [],
    hashtags: '',
    directions: '',
    categories: [],
    ctaUrl: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [estimatedViews, setEstimatedViews] = useState(0);
  const [activeStep, setActiveStep] = useState(1);

  // Fetch wallet balance on mount
  useEffect(() => {
    fetchWalletData();
  }, []);

  // Calculate estimated views when budget or currency changes
  useEffect(() => {
    const budgetNum = parseFloat(form.budget) || 0;
    if (budgetNum > 0) {
      const ratePerView = form.currency === 'NGN' 
        ? NGN_PER_THOUSAND_VIEWS / 1000 
        : USDT_PER_THOUSAND_VIEWS / 1000;
      const views = Math.floor(budgetNum / ratePerView);
      setEstimatedViews(views);
    } else {
      setEstimatedViews(0);
    }
  }, [form.budget, form.currency]);

  const getToken = async () => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem('userToken');
    }
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

  const fetchWalletData = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');

      const response = await axios.get(`${API_BASE}/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setWallet(response.data);
      // Set preferred currency from wallet
      setForm(prev => ({ 
        ...prev, 
        currency: response.data.preferredCurrency || 'NGN' 
      }));
    } catch (error) {
      console.error('Wallet fetch error:', error);
      Alert.alert('Error', 'Failed to load wallet balance');
    } finally {
      setWalletLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.title.trim()) {
      newErrors.title = 'Campaign title is required';
    } else if (form.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (form.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (!form.videoUrl.trim()) {
      newErrors.videoUrl = 'Video URL is required';
    } else {
      try {
        new URL(form.videoUrl);
        if (!form.videoUrl.match(/\.(mp4|mov|avi|mkv|webm)$/i) && 
            !form.videoUrl.includes('youtube.com') && 
            !form.videoUrl.includes('youtu.be') && 
            !form.videoUrl.includes('vimeo.com') && 
            !form.videoUrl.includes('drive.google.com')) {
          newErrors.videoUrl = 'Please enter a valid video URL (MP4, YouTube, Vimeo, or Google Drive)';
        }
      } catch {
        newErrors.videoUrl = 'Please enter a valid URL';
      }
    }

    const budgetNum = parseFloat(form.budget);
    if (!form.budget) {
      newErrors.budget = 'Budget is required';
    } else if (isNaN(budgetNum) || budgetNum <= 0) {
      newErrors.budget = 'Please enter a valid budget amount';
    } else {
      const minBudget = form.currency === 'NGN' ? 3000 : 1.85;
      if (budgetNum < minBudget) {
        newErrors.budget = `Minimum budget is ${form.currency === 'NGN' ? '₦3,000' : '$1.85 USDT'}`;
      }

      const availableBalance = form.currency === 'NGN' ? wallet?.balance || 0 : wallet?.usdtBalance || 0;
      if (budgetNum > availableBalance) {
        newErrors.budget = `Insufficient ${form.currency} balance`;
      }
    }

    if (form.platforms.length === 0) {
      newErrors.platforms = 'Select at least one platform';
    }

    if (form.categories.length === 0) {
      newErrors.categories = 'Select at least one category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');

      const budgetNum = parseFloat(form.budget);
      const payload = {
        title: form.title.trim(),
        videoUrl: form.videoUrl.trim(),
        budget: budgetNum,
        currency: form.currency,
        platforms: form.platforms,
        hashtags: form.hashtags.split(',').map(tag => tag.trim()).filter(Boolean),
        directions: form.directions.split('\n').filter(line => line.trim()),
        categories: form.categories,
        ctaUrl: form.ctaUrl.trim() || undefined,
        estimatedViews,
        costPerThousand: form.currency === 'NGN' ? NGN_PER_THOUSAND_VIEWS : USDT_PER_THOUSAND_VIEWS,
      };

      const response = await axios.post(`${API_BASE}/campaigns/clipping`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      Alert.alert(
        'Success!',
        'Your clipping campaign has been created successfully.',
        [
          {
            text: 'View Campaign',
            onPress: () => router.push(`/campaign/${response.data.campaignId}`),
          },
          {
            text: 'Close',
            style: 'cancel',
          },
        ]
      );
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create campaign. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(id => id !== platformId)
        : [...prev.platforms, platformId],
    }));
    if (errors.platforms) {
      setErrors(prev => ({ ...prev, platforms: undefined }));
    }
  };

  const toggleCategory = (category: string) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
    if (errors.categories) {
      setErrors(prev => ({ ...prev, categories: undefined }));
    }
  };

  const formatCurrency = (amount: number, currency: 'NGN' | 'USDT') => {
    return currency === 'NGN' 
      ? `₦${amount.toLocaleString()}`
      : `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
  };

  const renderWalletInfo = () => (
    <Animated.View entering={FadeInDown.delay(100)} style={styles.walletCard}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.walletGradient}
      >
        <View style={styles.walletHeader}>
          <MaterialCommunityIcons name="wallet" size={24} color="#FFF" />
          <Text style={styles.walletTitle}>Your Wallet</Text>
        </View>
        
        {walletLoading ? (
          <ActivityIndicator color="#FFF" style={styles.walletLoader} />
        ) : wallet ? (
          <View style={styles.walletBalances}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>NGN Balance</Text>
              <Text style={styles.balanceValue}>₦{wallet.balance.toLocaleString()}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>USDT Balance</Text>
              <Text style={styles.balanceValue}>${wallet.usdtBalance.toLocaleString()}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.walletError}>Failed to load wallet</Text>
        )}
      </LinearGradient>
    </Animated.View>
  );

  const renderCurrencySelector = () => (
    <View style={styles.currencyContainer}>
      <TouchableOpacity
        style={[
          styles.currencyOption,
          form.currency === 'NGN' && styles.currencyOptionActive,
        ]}
        onPress={() => setForm(prev => ({ ...prev, currency: 'NGN' }))}
      >
        <Text style={[
          styles.currencyText,
          form.currency === 'NGN' && styles.currencyTextActive,
        ]}>₦ NGN</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.currencyOption,
          form.currency === 'USDT' && styles.currencyOptionActive,
        ]}
        onPress={() => setForm(prev => ({ ...prev, currency: 'USDT' }))}
      >
        <Text style={[
          styles.currencyText,
          form.currency === 'USDT' && styles.currencyTextActive,
        ]}>$ USDT</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#6B46C1']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <Animated.View entering={FadeInUp} style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Create Clipping Campaign</Text>
              <Text style={styles.headerSubtitle}>
                Turn your video into viral clips
              </Text>
            </View>
          </Animated.View>

          {/* Wallet Info */}
          {renderWalletInfo()}

          {/* Campaign Info Card */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.infoCard}>
            <MaterialCommunityIcons name="information" size={20} color="#6366F1" />
            <Text style={styles.infoText}>
              Creators will download your video from the provided link and create engaging clips. 
              You pay {form.currency === 'NGN' ? '₦3,000' : '$1.85 USDT'} per 1,000 views generated.
            </Text>
          </Animated.View>

          {/* Main Form */}
          <Animated.View entering={SlideInRight.delay(300)} style={styles.formCard}>
            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <View style={[
                    styles.stepDot,
                    activeStep >= step && styles.stepDotActive,
                  ]}>
                    <Text style={[
                      styles.stepText,
                      activeStep >= step && styles.stepTextActive,
                    ]}>{step}</Text>
                  </View>
                  {step < 3 && (
                    <View style={[
                      styles.stepLine,
                      activeStep > step && styles.stepLineActive,
                    ]} />
                  )}
                </React.Fragment>
              ))}
            </View>

            {/* Step 1: Basic Info */}
            {activeStep === 1 && (
              <Animated.View entering={FadeInDown}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Campaign Title</Text>
                  <TextInput
                    style={[styles.input, errors.title && styles.inputError]}
                    value={form.title}
                    onChangeText={(text) => {
                      setForm(prev => ({ ...prev, title: text }));
                      if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
                    }}
                    placeholder="e.g., Summer Fashion Lookbook Clips"
                    placeholderTextColor="#9CA3AF"
                    maxLength={100}
                  />
                  {errors.title && (
                    <Text style={styles.errorText}>{errors.title}</Text>
                  )}
                  <Text style={styles.charCount}>
                    {form.title.length}/100
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Video URL</Text>
                  <View style={styles.urlInputContainer}>
                    <MaterialCommunityIcons name="link-variant" size={20} color="#9CA3AF" />
                    <TextInput
                      style={[styles.urlInput, errors.videoUrl && styles.inputError]}
                      value={form.videoUrl}
                      onChangeText={(text) => {
                        setForm(prev => ({ ...prev, videoUrl: text }));
                        if (errors.videoUrl) setErrors(prev => ({ ...prev, videoUrl: undefined }));
                      }}
                      placeholder="https://youtube.com/watch?v=... or direct video URL"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {errors.videoUrl && (
                    <Text style={styles.errorText}>{errors.videoUrl}</Text>
                  )}
                  <Text style={styles.helperText}>
                    Supported: YouTube, Vimeo, Google Drive, or direct MP4 links
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => setActiveStep(2)}
                >
                  <Text style={styles.nextButtonText}>Next: Budget & Platforms</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Step 2: Budget & Platforms */}
            {activeStep === 2 && (
              <Animated.View entering={FadeInDown}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Payment Currency</Text>
                  {renderCurrencySelector()}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Budget</Text>
                  <View style={styles.budgetInputContainer}>
                    <Text style={styles.currencySymbol}>
                      {form.currency === 'NGN' ? '₦' : '$'}
                    </Text>
                    <TextInput
                      style={[styles.budgetInput, errors.budget && styles.inputError]}
                      value={form.budget}
                      onChangeText={(text) => {
                        const numeric = text.replace(/[^0-9.]/g, '');
                        setForm(prev => ({ ...prev, budget: numeric }));
                        if (errors.budget) setErrors(prev => ({ ...prev, budget: undefined }));
                      }}
                      placeholder="0.00"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                  </View>
                  {errors.budget && (
                    <Text style={styles.errorText}>{errors.budget}</Text>
                  )}
                  
                  {estimatedViews > 0 && (
                    <View style={styles.estimateBox}>
                      <Text style={styles.estimateLabel}>Estimated Views</Text>
                      <Text style={styles.estimateValue}>
                        {estimatedViews.toLocaleString()} views
                      </Text>
                      <Text style={styles.estimateRate}>
                        Rate: {form.currency === 'NGN' ? '₦3,000' : '$1.85 USDT'}/1k views
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Platforms</Text>
                  <View style={styles.platformsGrid}>
                    {PLATFORM_OPTIONS.map((platform) => (
                      <TouchableOpacity
                        key={platform.id}
                        style={[
                          styles.platformButton,
                          form.platforms.includes(platform.id) && styles.platformButtonActive,
                        ]}
                        onPress={() => togglePlatform(platform.id)}
                      >
                        <Ionicons 
                          name={platform.icon as any} 
                          size={24} 
                          color={form.platforms.includes(platform.id) ? '#6366F1' : '#6B7280'} 
                        />
                        <Text style={[
                          styles.platformButtonText,
                          form.platforms.includes(platform.id) && styles.platformButtonTextActive,
                        ]}>
                          {platform.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.platforms && (
                    <Text style={styles.errorText}>{errors.platforms}</Text>
                  )}
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.backButtonStep}
                    onPress={() => setActiveStep(1)}
                  >
                    <Ionicons name="arrow-back" size={20} color="#6B7280" />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.nextButton}
                    onPress={() => setActiveStep(3)}
                  >
                    <Text style={styles.nextButtonText}>Next: Guidelines</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Step 3: Guidelines */}
            {activeStep === 3 && (
              <Animated.View entering={FadeInDown}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Hashtags</Text>
                  <TextInput
                    style={styles.input}
                    value={form.hashtags}
                    onChangeText={(text) => setForm(prev => ({ ...prev, hashtags: text }))}
                    placeholder="#viral, #trending, #fashion"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text style={styles.helperText}>
                    Separate hashtags with commas
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Editing Directions</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.directions}
                    onChangeText={(text) => setForm(prev => ({ ...prev, directions: text }))}
                    placeholder="• Use trending audio&#10;• Add captions&#10;• Keep clips under 30 seconds&#10;• Highlight key moments"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Categories</Text>
                  <View style={styles.categoriesContainer}>
                    {CATEGORY_OPTIONS.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryChip,
                          form.categories.includes(category) && styles.categoryChipActive,
                        ]}
                        onPress={() => toggleCategory(category)}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          form.categories.includes(category) && styles.categoryChipTextActive,
                        ]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.categories && (
                    <Text style={styles.errorText}>{errors.categories}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Call-to-Action URL (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.ctaUrl}
                    onChangeText={(text) => setForm(prev => ({ ...prev, ctaUrl: text }))}
                    placeholder="https://yourwebsite.com/product"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.backButtonStep}
                    onPress={() => setActiveStep(2)}
                  >
                    <Ionicons name="arrow-back" size={20} color="#6B7280" />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Text style={styles.submitButtonText}>Create Campaign</Text>
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {/* Summary Card */}
          {estimatedViews > 0 && activeStep === 3 && (
            <Animated.View entering={FadeInDown.delay(400)} style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Campaign Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Budget</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(parseFloat(form.budget) || 0, form.currency)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimated Views</Text>
                <Text style={styles.summaryValue}>{estimatedViews.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Platforms</Text>
                <Text style={styles.summaryValue}>{form.platforms.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Categories</Text>
                <Text style={styles.summaryValue}>{form.categories.length}</Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    marginTop: 89,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
   
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  walletCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  walletGradient: {
    padding: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  walletLoader: {
    marginVertical: 20,
  },
  walletBalances: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  balanceDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  walletError: {
    color: '#FECACA',
    fontSize: 14,
    textAlign: 'center',
    padding: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  stepDotActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepTextActive: {
    color: '#FFF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#FF6B35',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  urlInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  currencyContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  currencyOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  currencyOptionActive: {
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  currencyTextActive: {
    color: '#6366F1',
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8,
  },
  budgetInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  estimateBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  estimateLabel: {
    fontSize: 12,
    color: '#FF6B35',
    marginBottom: 4,
  },
  estimateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  estimateRate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  platformButton: {
    width: '48%',
    margin: '1%',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  platformButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#FF6B35',
  },
  platformButtonText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  platformButtonTextActive: {
    color: '#FF6B35',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  backButtonStep: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#FF6B35',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#4B5563',
  },
  categoryChipTextActive: {
    color: '#FF6B35',
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});