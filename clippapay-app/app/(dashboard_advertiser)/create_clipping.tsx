// app/(dashboard)/create-clipping.tsx
// FIXED:
//  1. Per-step validation — Next button validates only the current step's fields
//  2. Inline errors shown immediately below each field (not just an Alert)
//  3. KeyboardAvoidingView + ScrollView properly configured so active input scrolls above keyboard
//  4. keyboardShouldPersistTaps="handled" on ScrollView so taps outside inputs dismiss keyboard
//  5. Success message updated: campaign goes to "waiting_for_approval" not immediately active
//  6. Min budget: ₦20,000 NGN / $10 USDT (realistic minimums)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';

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

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

// Realistic minimums
const MIN_NGN_BUDGET  = 20_000;
const MIN_USDT_BUDGET = 10;

const NGN_PER_THOUSAND_VIEWS  = 1400;
const USDT_PER_THOUSAND_VIEWS = 1.00;

const PLATFORM_OPTIONS = [
  { id: 'tiktok',     label: 'TikTok',           icon: 'logo-tiktok'     },
  { id: 'instagram',  label: 'Instagram Reels',   icon: 'logo-instagram'  },
  { id: 'youtube',    label: 'YouTube Shorts',    icon: 'logo-youtube'    },
  { id: 'facebook',   label: 'Facebook Reels',    icon: 'logo-facebook'   },
  { id: 'twitter',    label: 'X (Twitter)',       icon: 'logo-twitter'    },
] as const;

const CATEGORY_OPTIONS = [
  'Fashion & Style', 'Beauty & Makeup', 'Tech & Gadgets', 'Gaming',
  'Food & Cooking', 'Travel & Adventure', 'Fitness & Health', 'Business & Finance',
  'Education & Learning', 'Entertainment', 'Comedy', 'Sports',
  'Music & Dance', 'DIY & Crafts', 'Lifestyle', 'Motivation & Inspiration',
  'Pets & Animals', 'Parenting & Family', 'Automotive', 'Real Estate',
] as const;

export default function CreateClippingCampaign() {
  const router     = useRouter();
  const scrollRef  = useRef<ScrollView>(null);

  const [loading,       setLoading]       = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);
  const [wallet,        setWallet]        = useState<WalletData | null>(null);
  const [activeStep,    setActiveStep]    = useState(1);
  const [estimatedViews, setEstimatedViews] = useState(0);
  const [errors,        setErrors]        = useState<FormErrors>({});

  const [form, setForm] = useState<CampaignForm>({
    title: '', videoUrl: '', budget: '', currency: 'NGN',
    platforms: [], hashtags: '', directions: '', categories: [], ctaUrl: '',
  });

  // ── Token helper ─────────────────────────────────────────────────────────
  const getToken = async () => {
    if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
    return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
  };

  // ── Fetch wallet ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_BASE}/wallet`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWallet(res.data);
        setForm(prev => ({ ...prev, currency: res.data.preferredCurrency || 'NGN' }));
      } catch {
        Alert.alert('Error', 'Failed to load wallet balance');
      } finally {
        setWalletLoading(false);
      }
    })();
  }, []);

  // ── Estimated views ───────────────────────────────────────────────────────
  useEffect(() => {
    const budgetNum = parseFloat(form.budget) || 0;
    if (budgetNum > 0) {
      const rate = form.currency === 'NGN'
        ? NGN_PER_THOUSAND_VIEWS / 1000
        : USDT_PER_THOUSAND_VIEWS / 1000;
      setEstimatedViews(Math.floor(budgetNum / rate));
    } else {
      setEstimatedViews(0);
    }
  }, [form.budget, form.currency]);

  // ── Scroll to top of card when step changes ───────────────────────────────
  const goToStep = (step: number) => {
    setActiveStep(step);
    // Small delay so new content renders before scrolling
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
  };

  // ── Per-step validation ───────────────────────────────────────────────────
  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    if (step === 1) {
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
          const isValid =
            form.videoUrl.match(/\.(mp4|mov|avi|mkv|webm)$/i) ||
            form.videoUrl.includes('youtube.com') ||
            form.videoUrl.includes('youtu.be') ||
            form.videoUrl.includes('vimeo.com') ||
            form.videoUrl.includes('drive.google.com');
          if (!isValid)
            newErrors.videoUrl = 'Please enter a valid video URL (YouTube, Vimeo, Google Drive, or direct MP4)';
        } catch {
          newErrors.videoUrl = 'Please enter a valid URL starting with https://';
        }
      }
    }

    if (step === 2) {
      const budgetNum = parseFloat(form.budget);
      if (!form.budget) {
        newErrors.budget = 'Budget is required';
      } else if (isNaN(budgetNum) || budgetNum <= 0) {
        newErrors.budget = 'Please enter a valid budget amount';
      } else {
        const minBudget = form.currency === 'NGN' ? MIN_NGN_BUDGET : MIN_USDT_BUDGET;
        if (budgetNum < minBudget) {
          newErrors.budget = `Minimum budget is ${form.currency === 'NGN' ? `₦${MIN_NGN_BUDGET.toLocaleString()}` : `$${MIN_USDT_BUDGET} USDT`}`;
        } else {
          const avail = form.currency === 'NGN' ? wallet?.balance || 0 : wallet?.usdtBalance || 0;
          if (budgetNum > avail) {
            newErrors.budget = `Insufficient ${form.currency} balance (available: ${
              form.currency === 'NGN' ? `₦${avail.toLocaleString()}` : `$${avail.toFixed(2)} USDT`
            })`;
          }
        }
      }

      if (form.platforms.length === 0) {
        newErrors.platforms = 'Select at least one platform';
      }
    }

    if (step === 3) {
      if (form.categories.length === 0) {
        newErrors.categories = 'Select at least one category';
      }
    }

    setErrors(newErrors);

    // If there are errors, scroll to show them
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
      return false;
    }
    return true;
  };

  const handleNext = (nextStep: number) => {
    Keyboard.dismiss();
    if (validateStep(activeStep)) {
      goToStep(nextStep);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');

      const budgetNum = parseFloat(form.budget);
      const payload = {
        title:          form.title.trim(),
        videoUrl:       form.videoUrl.trim(),
        budget:         budgetNum,
        currency:       form.currency,
        platforms:      form.platforms,
        hashtags:       form.hashtags.split(',').map(t => t.trim()).filter(Boolean),
        directions:     form.directions.split('\n').filter(l => l.trim()),
        categories:     form.categories,
        ctaUrl:         form.ctaUrl.trim() || undefined,
        estimatedViews,
        costPerThousand: form.currency === 'NGN' ? NGN_PER_THOUSAND_VIEWS : USDT_PER_THOUSAND_VIEWS,
      };

      const { data } = await axios.post(`${API_BASE}/campaigns/clipping`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      Alert.alert(
        '🎉 Campaign Submitted!',
        'Your clipping campaign has been submitted for admin review. It will go live once approved.',
        [
          {
            text: 'View My Campaigns',
            onPress: () => router.push('/(dashboard_advertiser)/my_clipping_campaigns'),
          },
          { text: 'Close', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      const msg = error.response?.data?.errors?.[0]?.msg
        || error.response?.data?.error
        || 'Failed to create campaign. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (id: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(id)
        ? prev.platforms.filter(p => p !== id)
        : [...prev.platforms, id],
    }));
    if (errors.platforms) setErrors(prev => ({ ...prev, platforms: undefined }));
  };

  const toggleCategory = (cat: string) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
    if (errors.categories) setErrors(prev => ({ ...prev, categories: undefined }));
  };

  const formatCurrency = (n: number, cur: 'NGN' | 'USDT') =>
    cur === 'NGN'
      ? `₦${n.toLocaleString()}`
      : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#667eea', '#764ba2', '#6B46C1']} style={styles.container}>
      {/*
        KEY FIX for keyboard covering inputs:
        - behavior='padding' on iOS, 'height' on Android
        - keyboardVerticalOffset accounts for the status bar / header
        - keyboardShouldPersistTaps="handled" lets you tap outside without fighting
      */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Header */}
          <Animated.View entering={FadeInUp} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Create Clipping Campaign</Text>
              <Text style={styles.headerSubtitle}>Turn your video into viral clips</Text>
            </View>
          </Animated.View>

          {/* Wallet card */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.walletCard}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.walletGradient}>
              <View style={styles.walletHeader}>
                <MaterialCommunityIcons name="wallet" size={24} color="#FFF" />
                <Text style={styles.walletTitle}>Your Wallet</Text>
              </View>
              {walletLoading ? (
                <ActivityIndicator color="#FFF" style={{ marginVertical: 12 }} />
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
                <Text style={{ color: '#FECACA', fontSize: 14, textAlign: 'center', padding: 8 }}>
                  Failed to load wallet
                </Text>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Info banner */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.infoCard}>
            <MaterialCommunityIcons name="information" size={20} color="#6366F1" />
            <Text style={styles.infoText}>
              Creators clip your video into short-form content. You pay{' '}
              {form.currency === 'NGN' ? '₦3,000' : '$1.85 USDT'} per 1,000 views.
              Campaign goes live after admin review (usually within 5 minutes).
            </Text>
          </Animated.View>

          {/* Form card */}
          <Animated.View entering={SlideInRight.delay(300)} style={styles.formCard}>
            {/* Step indicator */}
            <View style={styles.stepIndicator}>
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <View style={[styles.stepDot, activeStep >= step && styles.stepDotActive]}>
                    <Text style={[styles.stepText, activeStep >= step && styles.stepTextActive]}>
                      {step}
                    </Text>
                  </View>
                  {step < 3 && (
                    <View style={[styles.stepLine, activeStep > step && styles.stepLineActive]} />
                  )}
                </React.Fragment>
              ))}
            </View>

            {/* ── STEP 1: Basic Info ── */}
            {activeStep === 1 && (
              <Animated.View entering={FadeInDown}>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Campaign Title <Text style={styles.required}>*</Text></Text>
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
                    returnKeyType="next"
                  />
                  {errors.title ? (
                    <View style={styles.fieldErrorRow}>
                      <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                      <Text style={styles.fieldError}>{errors.title}</Text>
                    </View>
                  ) : (
                    <Text style={styles.charCount}>{form.title.length}/100</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Video URL <Text style={styles.required}>*</Text></Text>
                  <View style={[styles.urlInputContainer, errors.videoUrl && { borderColor: '#EF4444' }]}>
                    <MaterialCommunityIcons name="link-variant" size={20} color="#9CA3AF" />
                    <TextInput
                      style={styles.urlInput}
                      value={form.videoUrl}
                      onChangeText={(text) => {
                        setForm(prev => ({ ...prev, videoUrl: text }));
                        if (errors.videoUrl) setErrors(prev => ({ ...prev, videoUrl: undefined }));
                      }}
                      placeholder="https://youtube.com/watch?v=..."
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      returnKeyType="done"
                    />
                  </View>
                  {errors.videoUrl ? (
                    <View style={styles.fieldErrorRow}>
                      <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                      <Text style={styles.fieldError}>{errors.videoUrl}</Text>
                    </View>
                  ) : (
                    <Text style={styles.helperText}>
                      Supported: YouTube, Vimeo, Google Drive, or direct MP4
                    </Text>
                  )}
                </View>

                <TouchableOpacity style={styles.nextButton} onPress={() => handleNext(2)}>
                  <Text style={styles.nextButtonText}>Next: Budget & Platforms</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── STEP 2: Budget & Platforms ── */}
            {activeStep === 2 && (
              <Animated.View entering={FadeInDown}>

                {/* Currency toggle */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Payment Currency</Text>
                  <View style={styles.currencyContainer}>
                    {(['NGN', 'USDT'] as const).map((cur) => (
                      <TouchableOpacity
                        key={cur}
                        style={[styles.currencyOption, form.currency === cur && styles.currencyOptionActive]}
                        onPress={() => {
                          setForm(prev => ({ ...prev, currency: cur, budget: '' }));
                          setErrors(prev => ({ ...prev, budget: undefined }));
                          setEstimatedViews(0);
                        }}
                      >
                        <Text style={[styles.currencyText, form.currency === cur && styles.currencyTextActive]}>
                          {cur === 'NGN' ? '₦ NGN' : '$ USDT'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Budget */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Budget <Text style={styles.required}>*</Text></Text>
                  <View style={[styles.budgetInputContainer, errors.budget && { borderColor: '#EF4444' }]}>
                    <Text style={styles.currencySymbol}>{form.currency === 'NGN' ? '₦' : '$'}</Text>
                    <TextInput
                      style={styles.budgetInput}
                      value={form.budget}
                      onChangeText={(text) => {
                        const numeric = text.replace(/[^0-9.]/g, '');
                        setForm(prev => ({ ...prev, budget: numeric }));
                        if (errors.budget) setErrors(prev => ({ ...prev, budget: undefined }));
                      }}
                      placeholder={form.currency === 'NGN' ? '20000' : '10.00'}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>
                  {errors.budget ? (
                    <View style={styles.fieldErrorRow}>
                      <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                      <Text style={styles.fieldError}>{errors.budget}</Text>
                    </View>
                  ) : (
                    <Text style={styles.helperText}>
                      Min: {form.currency === 'NGN' ? `₦${MIN_NGN_BUDGET.toLocaleString()}` : `$${MIN_USDT_BUDGET} USDT`}
                    </Text>
                  )}

                  {estimatedViews > 0 && (
                    <View style={styles.estimateBox}>
                      <Text style={styles.estimateLabel}>Estimated Views</Text>
                      <Text style={styles.estimateValue}>{estimatedViews.toLocaleString()} views</Text>
                      <Text style={styles.estimateRate}>
                        Rate: {form.currency === 'NGN' ? '₦3,000' : '$1.85 USDT'}/1K views
                      </Text>
                    </View>
                  )}
                </View>

                {/* Platforms */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Platforms <Text style={styles.required}>*</Text></Text>
                  <View style={styles.platformsGrid}>
                    {PLATFORM_OPTIONS.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.platformButton, form.platforms.includes(p.id) && styles.platformButtonActive]}
                        onPress={() => togglePlatform(p.id)}
                      >
                        <Ionicons
                          name={p.icon as any}
                          size={24}
                          color={form.platforms.includes(p.id) ? '#FF6B35' : '#6B7280'}
                        />
                        <Text style={[styles.platformButtonText, form.platforms.includes(p.id) && styles.platformButtonTextActive]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.platforms && (
                    <View style={styles.fieldErrorRow}>
                      <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                      <Text style={styles.fieldError}>{errors.platforms}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.backButtonStep} onPress={() => goToStep(1)}>
                    <Ionicons name="arrow-back" size={20} color="#6B7280" />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.nextButton} onPress={() => handleNext(3)}>
                    <Text style={styles.nextButtonText}>Next: Guidelines</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* ── STEP 3: Guidelines ── */}
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
                    returnKeyType="next"
                  />
                  <Text style={styles.helperText}>Separate hashtags with commas</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Editing Directions</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.directions}
                    onChangeText={(text) => setForm(prev => ({ ...prev, directions: text }))}
                    placeholder={'• Use trending audio\n• Add captions\n• Keep clips under 30 seconds'}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Categories <Text style={styles.required}>*</Text></Text>
                  <View style={styles.categoriesContainer}>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryChip, form.categories.includes(cat) && styles.categoryChipActive]}
                        onPress={() => toggleCategory(cat)}
                      >
                        <Text style={[styles.categoryChipText, form.categories.includes(cat) && styles.categoryChipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.categories && (
                    <View style={styles.fieldErrorRow}>
                      <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                      <Text style={styles.fieldError}>{errors.categories}</Text>
                    </View>
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
                    keyboardType="url"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.backButtonStep} onPress={() => goToStep(2)}>
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
                        <Text style={styles.submitButtonText}>Submit for Review</Text>
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {/* Campaign summary card (step 3) */}
          {estimatedViews > 0 && activeStep === 3 && (
            <Animated.View entering={FadeInDown.delay(400)} style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Campaign Summary</Text>
              {[
                ['Budget',         formatCurrency(parseFloat(form.budget) || 0, form.currency)],
                ['Estimated Views',estimatedViews.toLocaleString()],
                ['Platforms',      String(form.platforms.length)],
                ['Categories',     String(form.categories.length)],
              ].map(([lbl, val]) => (
                <View key={lbl} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{lbl}</Text>
                  <Text style={styles.summaryValue}>{val}</Text>
                </View>
              ))}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent:{ flexGrow: 1, paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTextContainer: { flex: 1 },
  headerTitle:   { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  headerSubtitle:{ fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  walletCard: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 16,
    overflow: 'hidden', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  walletGradient:  { padding: 16 },
  walletHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  walletTitle:     { fontSize: 16, fontWeight: '600', color: '#FFF', marginLeft: 8 },
  walletBalances:  { flexDirection: 'row', justifyContent: 'space-between' },
  balanceItem:     { flex: 1 },
  balanceLabel:    { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  balanceValue:    { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  balanceDivider:  { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 16 },

  infoCard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 20, marginBottom: 16, padding: 14, borderRadius: 12,
    alignItems: 'flex-start', borderWidth: 1, borderColor: '#E5E7EB',
  },
  infoText: { flex: 1, fontSize: 13, color: '#4B5563', marginLeft: 10, lineHeight: 19 },

  formCard: {
    backgroundColor: '#FFF', marginHorizontal: 20, borderRadius: 16, padding: 20,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },

  // Step indicator
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stepDot:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
  stepDotActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  stepText:      { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  stepTextActive:{ color: '#FFF' },
  stepLine:      { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  stepLineActive:{ backgroundColor: '#FF6B35' },

  // Field-level errors — prominent pill — prominent pill
  fieldErrorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 7, backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  fieldError: { fontSize: 13, color: '#DC2626', flex: 1, fontWeight: '600', lineHeight: 18 },
  required:   { color: '#EF4444' },

  inputGroup:  { marginBottom: 20 },
  label:       { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#1F2937',
  },
  inputError:  { borderColor: '#EF4444' },
  charCount:   { fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
  helperText:  { fontSize: 12, color: '#6B7280', marginTop: 5 },
  textArea:    { minHeight: 100, textAlignVertical: 'top' },

  urlInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14,
  },
  urlInput: { flex: 1, paddingVertical: 13, marginLeft: 8, fontSize: 15, color: '#1F2937' },

  currencyContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  currencyOption:    { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  currencyOptionActive: {
    backgroundColor: '#FFF', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  currencyText:       { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  currencyTextActive: { color: '#6366F1' },

  budgetInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16,
  },
  currencySymbol: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginRight: 6 },
  budgetInput:    { flex: 1, paddingVertical: 13, fontSize: 18, fontWeight: '700', color: '#1F2937' },

  estimateBox:  { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginTop: 10 },
  estimateLabel:{ fontSize: 12, color: '#3B82F6', fontWeight: '600', marginBottom: 2 },
  estimateValue:{ fontSize: 20, fontWeight: 'bold', color: '#1E3A8A' },
  estimateRate: { fontSize: 12, color: '#6B7280', marginTop: 3 },

  platformsGrid:       { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  platformButton:      { width: '48%', margin: '1%', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  platformButtonActive:{ backgroundColor: '#FFF5F0', borderColor: '#FF6B35' },
  platformButtonText:  { fontSize: 13, color: '#6B7280', marginLeft: 8 },
  platformButtonTextActive: { color: '#FF6B35', fontWeight: '600' },

  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  categoryChip:       { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, margin: 4, borderWidth: 1.5, borderColor: '#E5E7EB' },
  categoryChipActive: { backgroundColor: '#FFF5F0', borderColor: '#FF6B35' },
  categoryChipText:   { fontSize: 13, color: '#4B5563' },
  categoryChipTextActive: { color: '#FF6B35', fontWeight: '600' },

  buttonRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 12 },
  backButtonStep: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: '#F3F4F6', gap: 4 },
  backButtonText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  nextButton:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B35', paddingHorizontal: 20, paddingVertical: 13, borderRadius: 10, gap: 8 },
  nextButtonText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  submitButton:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 13, borderRadius: 10, gap: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.95)', marginHorizontal: 20, marginTop: 16,
    padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
});