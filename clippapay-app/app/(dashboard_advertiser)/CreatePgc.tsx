// app/(dashboard)/CreateAssetCreationCampaign.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const API_BASE = 'https://clippapay.com/api';

// Base price and add-ons with enhanced info
const BASE_PGC_PRICE = 35000;

const ADDON_OPTIONS = [
  { 
    id: 'script', 
    label: 'Creator provides script', 
    price: 1500, 
    description: 'Creator will write the script for the video',
    instructions: 'The creator will develop a creative script based on your brief. No need to provide a script.'
  },
  { 
    id: 'whatsapp', 
    label: 'Creator posts on WhatsApp', 
    price: 5000, 
    description: 'Creator will post video on WhatsApp and provide screenshot proof',
    instructions: 'Creator will share the video on WhatsApp Status or groups. Screenshot required as proof.',
    requiresScreenshot: true
  },
  { 
    id: 'ig', 
    label: 'Creator posts on Instagram', 
    price: 10000, 
    description: 'Creator will post on Instagram (Reel/Post)',
    instructions: 'Creator will post on their Instagram account. Post URL required for verification.',
    requiresUrl: true,
    platform: 'instagram'
  },
  { 
    id: 'tiktok', 
    label: 'Creator posts on TikTok', 
    price: 10000, 
    description: 'Creator will post on TikTok',
    instructions: 'Creator will post on their TikTok account. Video URL required for verification.',
    requiresUrl: true,
    platform: 'tiktok'
  },
  { 
    id: 'outdoor', 
    label: 'Outdoor/Location shoot', 
    price: 10000, 
    description: 'Creator will shoot at an outdoor location',
    instructions: 'Creator will film at an outdoor location of their choice (park, street, beach, etc.)'
  },
];

const categoryOptions = [
  'Fashion', 'Science & Tech', 'Food', 'Travel', 'Music/Movies & Entertainment',
  'Sports', 'Education', 'Politics', 'Religion', 'Business & Investment', 'Health & Fitness',
  'News & Media', 'Agriculture', 'Other',
];

// Platform-specific instructions
const platformInstructions = {
  instagram: {
    tips: [
      'Make sure your Instagram account is public during posting',
      'Use the required hashtags in the caption',
      'Tag the brand account if provided',
      'Keep the post up for at least 30 days'
    ],
    requirements: 'Instagram post URL (e.g., https://www.instagram.com/p/XXXXX/)'
  },
  tiktok: {
    tips: [
      'Ensure your TikTok account is public',
      'Include required hashtags in description',
      'Keep video public for verification',
      'Video should be 15-60 seconds as specified'
    ],
    requirements: 'TikTok video URL (e.g., https://www.tiktok.com/@user/video/XXXXX)'
  },
  whatsapp: {
    tips: [
      'Post to WhatsApp Status or relevant groups',
      'Take a clear screenshot showing the video was posted',
      'Screenshot should include timestamp if possible'
    ],
    requirements: 'Screenshot of WhatsApp post'
  }
};

export default function CreateAssetCreationCampaign() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    budget: '',
    hashtags: '',
    directions: '',
    categories: [],
    brief: '',
    deliverables: '',
    captionTemplate: '',
    approvalCriteria: '',
    assets: [],
    cta_url: '',
    addons: [],
    script: '',
    
    // NEW: Platform-specific fields
    instagramHandle: '',
    tiktokHandle: '',
    brandTag: '', // @username to tag
    postingInstructions: {
      instagram: '',
      tiktok: '',
      whatsapp: ''
    }
  });

  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const getToken = async () => {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('userToken');
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

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

  const selectedAddons = useMemo(() => {
    return ADDON_OPTIONS.filter(option => form.addons.includes(option.id));
  }, [form.addons]);

  const totalPrice = useMemo(() => {
    let total = BASE_PGC_PRICE;
    selectedAddons.forEach(addon => {
      total += addon.price;
    });
    return total;
  }, [selectedAddons]);

  // Check if any posting addons are selected
  const hasPostingAddons = useMemo(() => {
    return form.addons.some(addon => ['whatsapp', 'ig', 'tiktok'].includes(addon));
  }, [form.addons]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (cat) => {
    setForm((prev) => {
      const categories = prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat];
      return { ...prev, categories };
    });
  };

  const toggleAddon = (addonId) => {
    setForm((prev) => {
      const addons = prev.addons.includes(addonId)
        ? prev.addons.filter((id) => id !== addonId)
        : [...prev.addons, addonId];
      return { ...prev, addons };
    });
  };

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
        updateForm('assets', [...form.assets, ...newAssets]);
      }
    } catch (err) {
      console.error('Asset picker error:', err);
      Alert.alert('Error', 'Failed to select assets');
    }
  };

  const removeAsset = (index) => {
    const newAssets = form.assets.filter((_, i) => i !== index);
    updateForm('assets', newAssets);
  };

  const validateForm = () => {
    if (!form.title) return 'Please provide a campaign title.';
    if (totalPrice > walletBalance) return `Total price (₦${totalPrice.toLocaleString()}) exceeds wallet balance (₦${walletBalance.toLocaleString()}).`;
    if (!form.brief) return 'Please provide a creative brief.';
    
    // Script validation
    if (!form.addons.includes('script') && !form.script.trim()) {
      return 'Please provide a script for the creator to follow.';
    }

    // Platform handle validation if posting addons selected
    if (form.addons.includes('ig') && !form.instagramHandle) {
      return 'Please provide your Instagram handle (e.g., @brandname) for tagging';
    }
    
    if (form.addons.includes('tiktok') && !form.tiktokHandle) {
      return 'Please provide your TikTok handle (e.g., @brandname) for tagging';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const fd = new FormData();
      
      // Basic campaign info
      fd.append('title', form.title);
      fd.append('budget', totalPrice.toString());
      fd.append('kind', 'pgc');
      fd.append('desiredVideos', '1');

      // Addons
      fd.append('addons', JSON.stringify(form.addons));
      if (form.script) fd.append('script', form.script);

      // Platform handles for tagging
      if (form.instagramHandle) {
        fd.append('instagramHandle', form.instagramHandle);
      }
      if (form.tiktokHandle) {
        fd.append('tiktokHandle', form.tiktokHandle);
      }
      if (form.brandTag) {
        fd.append('brandTag', form.brandTag);
      }

      // Custom posting instructions
      if (form.postingInstructions.instagram) {
        fd.append('postingInstructions[instagram]', form.postingInstructions.instagram);
      }
      if (form.postingInstructions.tiktok) {
        fd.append('postingInstructions[tiktok]', form.postingInstructions.tiktok);
      }
      if (form.postingInstructions.whatsapp) {
        fd.append('postingInstructions[whatsapp]', form.postingInstructions.whatsapp);
      }

      // Guidelines
      fd.append('hashtags', JSON.stringify(
        form.hashtags.split(',').map(s => s.trim()).filter(Boolean)
      ));
      fd.append('directions', JSON.stringify(
        form.directions.split('\n').map(s => s.trim()).filter(Boolean)
      ));
      fd.append('categories', JSON.stringify(form.categories));
      if (form.cta_url) fd.append('cta_url', form.cta_url);

      // PGC meta
      fd.append('brief', form.brief);
      fd.append('deliverables', JSON.stringify(
        form.deliverables.split(/\n|,/).map(s => s.trim()).filter(Boolean)
      ));
      fd.append('captionTemplate', form.captionTemplate);
      fd.append('approvalCriteria', form.approvalCriteria);

      // Assets
      setUploadingAssets(true);
      form.assets.forEach((asset) => {
        fd.append('assets', {
          uri: asset.uri,
          name: asset.name,
          type: asset.type,
        });
      });

      const response = await axios.post(`${API_BASE}/campaigns/pgc`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage('Campaign created successfully!');
      
      // Show success alert with next steps
      Alert.alert(
        'Success! 🎉',
        'Your campaign has been created and is now live. Creators can now apply.',
        [
          {
            text: 'View Campaign',
            onPress: () => router.push(`/(dashboard_advertiser)/campaigns/${response.data.campaign._id}`)
          },
          {
            text: 'OK',
            onPress: () => router.push('/(dashboard_advertiser)/campaigns')
          }
        ]
      );

    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.error || 'Failed to create campaign. Please try again.');
    } finally {
      setUploadingAssets(false);
      setLoading(false);
    }
  };

  const isScriptAddonSelected = form.addons.includes('script');

  return (
    <LinearGradient
      colors={['#34D3991A', '#D6CF8D80', '#d8d8d8b2']}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Campaign Explanation */}
        <View style={styles.explanationContainer}>
          <Text style={styles.explanationTitle}>What is Asset Creation Campaign?</Text>
          <Text style={styles.explanationText}>
            This campaign lets you order a custom video from our talented creators. They will create a high-quality video exactly according to your instructions and send it to you for review and approval.
            {'\n\n'}
            How it works:
            • Choose your add-ons to customize your video
            • Provide your creative brief, directions, and examples
            • Creator makes video matching your vision
            • Review and approve the final video
            {'\n\n'}
            Perfect for product demos, brand stories, ads, tutorials, social content, and more!
          </Text>
        </View>

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Campaign Title *</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(v) => updateForm('title', v)}
            placeholder="e.g. Product Demo Video for New Collection"
          />
          <Text style={styles.helperText}>Give your campaign a clear, descriptive name</Text>
        </View>

        {/* Pricing Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Video Customization Options</Text>
          <View style={styles.pricingContainer}>
            <View style={styles.basePriceContainer}>
              <Text style={styles.basePriceLabel}>Base Video:</Text>
              <Text style={styles.basePriceValue}>₦{BASE_PGC_PRICE.toLocaleString()}</Text>
            </View>
            
            <Text style={styles.addonsLabel}>Add-ons (Optional):</Text>
            {ADDON_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.addonItem,
                  form.addons.includes(option.id) && styles.addonItemSelected,
                ]}
                onPress={() => toggleAddon(option.id)}
              >
                <View style={styles.addonLeft}>
                  <View style={[
                    styles.addonCheckbox,
                    form.addons.includes(option.id) && styles.addonCheckboxSelected,
                  ]}>
                    {form.addons.includes(option.id) && (
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    )}
                  </View>
                  <View style={styles.addonTextContainer}>
                    <Text style={styles.addonLabel}>{option.label}</Text>
                    <Text style={styles.addonDescription}>{option.description}</Text>
                    {form.addons.includes(option.id) && (
                      <Text style={styles.addonInstructions}>{option.instructions}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.addonPrice}>+ ₦{option.price.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
            
            {/* Total Price Display */}
            <View style={styles.totalPriceContainer}>
              <Text style={styles.totalLabel}>Total Price:</Text>
              <Text style={styles.totalValue}>₦{totalPrice.toLocaleString()}</Text>
            </View>
            
            {walletLoading ? (
              <Text style={styles.helperText}>Loading wallet balance...</Text>
            ) : (
              <Text style={[
                styles.helperText,
                totalPrice > walletBalance && styles.insufficientBalance,
              ]}>
                Available in wallet: ₦{walletBalance.toLocaleString()}
                {totalPrice > walletBalance && ' (Insufficient balance)'}
              </Text>
            )}
          </View>
        </View>

        {/* Platform-specific fields for posting addons */}
        {hasPostingAddons && (
          <View style={styles.platformSection}>
            <Text style={styles.sectionTitle}>Posting Requirements</Text>
            
            {form.addons.includes('ig') && (
              <View style={styles.platformCard}>
                <View style={styles.platformHeader}>
                  <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                  <Text style={styles.platformTitle}>Instagram Post</Text>
                </View>
                
                <View style={styles.platformInputGroup}>
                  <Text style={styles.platformLabel}>Your Instagram Handle *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.instagramHandle}
                    onChangeText={(v) => updateForm('instagramHandle', v)}
                    placeholder="@yourbrand"
                    autoCapitalize="none"
                  />
                  <Text style={styles.helperText}>
                    Creator will tag this handle in the post
                  </Text>
                </View>

                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsTitle}>📱 Instagram Tips:</Text>
                  {platformInstructions.instagram.tips.map((tip, idx) => (
                    <Text key={idx} style={styles.tipText}>• {tip}</Text>
                  ))}
                </View>
              </View>
            )}

            {form.addons.includes('tiktok') && (
              <View style={styles.platformCard}>
                <View style={styles.platformHeader}>
                  <Ionicons name="logo-tiktok" size={24} color="#000000" />
                  <Text style={styles.platformTitle}>TikTok Post</Text>
                </View>
                
                <View style={styles.platformInputGroup}>
                  <Text style={styles.platformLabel}>Your TikTok Handle *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.tiktokHandle}
                    onChangeText={(v) => updateForm('tiktokHandle', v)}
                    placeholder="@yourbrand"
                    autoCapitalize="none"
                  />
                  <Text style={styles.helperText}>
                    Creator will tag this handle in the video
                  </Text>
                </View>

                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsTitle}>🎵 TikTok Tips:</Text>
                  {platformInstructions.tiktok.tips.map((tip, idx) => (
                    <Text key={idx} style={styles.tipText}>• {tip}</Text>
                  ))}
                </View>
              </View>
            )}

            {form.addons.includes('whatsapp') && (
              <View style={styles.platformCard}>
                <View style={styles.platformHeader}>
                  <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                  <Text style={styles.platformTitle}>WhatsApp Post</Text>
                </View>
                
                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsTitle}>💬 WhatsApp Tips:</Text>
                  {platformInstructions.whatsapp.tips.map((tip, idx) => (
                    <Text key={idx} style={styles.tipText}>• {tip}</Text>
                  ))}
                </View>
              </View>
            )}

            {/* Brand tag field (optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Brand Tag (Optional)</Text>
              <TextInput
                style={styles.input}
                value={form.brandTag}
                onChangeText={(v) => updateForm('brandTag', v)}
                placeholder="@brandname"
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>
                If you want creators to tag a specific account (e.g., your Instagram/TikTok handle)
              </Text>
            </View>
          </View>
        )}

        {/* Script Input (Only if creator doesn't provide script) */}
        {!isScriptAddonSelected && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Script for Creator *</Text>
            <Text style={styles.helperText}>Since you didn't select "Creator provides script", please provide the exact script for the creator to follow:</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={form.script}
              onChangeText={(v) => updateForm('script', v)}
              placeholder="Write the exact words the creator should say in the video..."
              multiline
              numberOfLines={8}
            />
          </View>
        )}

        {/* Brief */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Creative Brief *</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={form.brief}
            onChangeText={(v) => updateForm('brief', v)}
            placeholder="Tell creators what the video should communicate, target audience, mood, key messages..."
            multiline
            numberOfLines={6}
          />
        </View>

        {/* Directions */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Creative Directions</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={form.directions}
            onChangeText={(v) => updateForm('directions', v)}
            placeholder="One instruction per line, e.g.:\nUse bright lighting\nShow product from multiple angles\nInclude smiling person using the item"
            multiline
            numberOfLines={5}
          />
          <Text style={styles.helperText}>Detailed instructions help creators make exactly what you want</Text>
        </View>

        {/* Categories */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Categories (select all that apply)</Text>
          <View style={styles.categoriesContainer}>
            {categoryOptions.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.categoryItem,
                  form.categories.includes(item) && styles.categoryItemSelected,
                ]}
                onPress={() => toggleCategory(item)}
              >
                <View style={[
                  styles.checkbox,
                  form.categories.includes(item) && styles.checkboxSelected,
                ]}>
                  {form.categories.includes(item) && (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  )}
                </View>
                <Text style={styles.categoryText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Deliverables */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Deliverables (format & specs)</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={form.deliverables}
            onChangeText={(v) => updateForm('deliverables', v)}
            placeholder="e.g.:\nVertical video 1080x1920\n15-30 seconds long\nInclude logo at the end\nHigh-quality audio"
            multiline
            numberOfLines={4}
          />
          <Text style={styles.helperText}>Specify length, resolution, orientation, etc.</Text>
        </View>

        {/* Hashtags */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hashtags (comma-separated)</Text>
          <TextInput
            style={styles.input}
            value={form.hashtags}
            onChangeText={(v) => updateForm('hashtags', v)}
            placeholder="#productdemo, #brandstory, #nigerianfashion"
          />
          <Text style={styles.helperText}>Required hashtags for posts (if applicable)</Text>
        </View>

        {/* Caption Template */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Caption Template (Optional)</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={form.captionTemplate}
            onChangeText={(v) => updateForm('captionTemplate', v)}
            placeholder="Provide a template for the caption creators should use..."
            multiline
            numberOfLines={4}
          />
          <Text style={styles.helperText}>Especially helpful for posting add-ons</Text>
        </View>

        {/* Approval Criteria */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Approval Criteria</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={form.approvalCriteria}
            onChangeText={(v) => updateForm('approvalCriteria', v)}
            placeholder="Videos must:\n- Match brand colors\n- Have clear audio\n- No watermarks\n- Be original content"
            multiline
            numberOfLines={5}
          />
          <Text style={styles.helperText}>What must be true for you to approve a video?</Text>
        </View>

        {/* CTA URL */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Call-to-Action Link (optional)</Text>
          <TextInput
            style={styles.input}
            value={form.cta_url}
            onChangeText={(v) => updateForm('cta_url', v)}
            placeholder="https://yourwebsite.com/shop-now"
            keyboardType="url"
            autoCapitalize="none"
          />
          <Text style={styles.helperText}>Link viewers will be directed to (include in caption)</Text>
        </View>

        {/* Reference Assets */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reference Assets (optional but very helpful)</Text>
          <Text style={styles.assetHelpText}>
            Upload images, videos, company logos, product photos, mood boards, style references, packaging designs, or any visual examples that show your desired look and feel.{'\n\n'}
            **You can upload multiple files** — the more references you provide, the better creators can understand your vision and include similar elements in the videos they create for you.
          </Text>

          <TouchableOpacity style={styles.uploadButton} onPress={pickAssets}>
            <Ionicons name="cloud-upload-outline" size={28} color="#4F46E5" />
            <Text style={styles.uploadText}>Upload Images, Videos, Logos, PDFs</Text>
            <Text style={styles.uploadSubText}>Tap to select multiple files</Text>
          </TouchableOpacity>

          {form.assets.length > 0 && (
            <View style={styles.assetListContainer}>
              <Text style={styles.assetCount}>
                {form.assets.length} file{form.assets.length !== 1 ? 's' : ''} selected
              </Text>
              {form.assets.map((asset, index) => (
                <View key={index} style={styles.assetItem}>
                  <MaterialIcons name="attachment" size={20} color="#6B7280" />
                  <Text style={styles.assetName} numberOfLines={1}>{asset.name}</Text>
                  <TouchableOpacity onPress={() => removeAsset(index)}>
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (loading || uploadingAssets) && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading || uploadingAssets}
        >
          {loading || uploadingAssets ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>Create Campaign - ₦{totalPrice.toLocaleString()}</Text>
          )}
        </TouchableOpacity>

        {message && <Text style={styles.successMessage}>{message}</Text>}
        {error && <Text style={styles.errorMessage}>{error}</Text>}

        <View style={{ height: 120 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 105,
  },
  explanationContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  insufficientBalance: {
    color: '#EF4444',
    fontWeight: '600',
  },
  pricingContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  basePriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  basePriceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  basePriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  addonsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  addonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  addonItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  addonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addonCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addonCheckboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  addonTextContainer: {
    flex: 1,
  },
  addonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  addonDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  addonInstructions: {
    fontSize: 11,
    color: '#4F46E5',
    marginTop: 4,
    fontStyle: 'italic',
  },
  addonPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 12,
  },
  totalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
  },
  platformSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  platformCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  platformTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  platformInputGroup: {
    marginBottom: 12,
  },
  platformLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  tipsContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 3,
    lineHeight: 18,
  },
  assetHelpText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  categoryItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryText: {
    fontSize: 14,
    color: '#374151',
  },
  uploadButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 32,
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  uploadSubText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  assetListContainer: {
    marginTop: 12,
  },
  assetCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 8,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  assetName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  successMessage: {
    color: '#16A34A',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  errorMessage: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
});