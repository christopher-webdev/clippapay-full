// app/(dashboard)/create_clipping.tsx

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
  FlatList,
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

// Pricing: ₦1.2 per view (adjust as needed)
const NAIRA_PER_VIEW = 1.2;

const platformOptions = [
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'YouTube Shorts', value: 'youtube' },
  { label: 'Facebook Reels', value: 'facebook' },
  { label: 'X (Twitter)', value: 'x' },
  { label: 'WhatsApp Status', value: 'whatsapp' },
];

const categoryOptions = [
  'Fashion', 'Science & Tech', 'Gaming', 'Food', 'Travel', 'TV/Movies & Entertainment',
  'Sports', 'Education', 'Politics', 'Religion', 'Business & Investment', 'Health & Fitness',
  'Lifestyle', 'News & Media', 'Real Estate', 'Pets & Animals', 'Agriculture',
  'Music', 'Comedy', 'DIY & Crafts', 'Other',
];

export default function CreateClippingCampaign() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    videoFile: null, // the main long video to be clipped
    budget: '',
    platforms: [],
    hashtags: '',
    directions: '',
    categories: [],
    cta_url: '',
  });

  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);

  // Estimated views based on budget
  const budgetNum = parseInt(form.budget, 10) || 0;
  const estimatedViews = Math.floor(budgetNum / NAIRA_PER_VIEW);

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

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const togglePlatform = (value) => {
    setForm((prev) => {
      const platforms = prev.platforms.includes(value)
        ? prev.platforms.filter((p) => p !== value)
        : [...prev.platforms, value];
      return { ...prev, platforms };
    });
  };

  const toggleCategory = (cat) => {
    setForm((prev) => {
      const categories = prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat];
      return { ...prev, categories };
    });
  };

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*'],
        multiple: false,
      });

      if (result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        updateForm('videoFile', {
          uri: video.uri,
          name: video.name,
          type: video.mimeType,
        });
      }
    } catch (err) {
      console.error('Video picker error:', err);
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (!form.title.trim()) return setError('Please enter a campaign title.');
    if (!form.videoFile) return setError('Please upload a video to be clipped.');
    if (budgetNum < 1000) return setError('Minimum budget is ₦1,000.');
    if (budgetNum > walletBalance) return setError('Budget exceeds your wallet balance.');
    if (estimatedViews < 100) return setError('Budget should generate at least 100 views.');
    if (form.platforms.length === 0) return setError('Select at least one platform.');

    setLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('kind', 'clipping'); // or whatever your backend expects
      fd.append('budget', budgetNum.toString());
      fd.append('viewGoal', estimatedViews.toString());
      fd.append('cpv', NAIRA_PER_VIEW.toString());

      // Video file
      fd.append('video', {
        uri: form.videoFile.uri,
        name: form.videoFile.name,
        type: form.videoFile.type,
      });

      // Platforms
      fd.append('platforms', JSON.stringify(form.platforms));

      // Guidelines
      fd.append('hashtags', JSON.stringify(form.hashtags.split(',').map(s => s.trim()).filter(Boolean)));
      fd.append('directions', JSON.stringify(form.directions.split('\n').map(s => s.trim()).filter(Boolean)));
      fd.append('categories', JSON.stringify(form.categories));
      if (form.cta_url) fd.append('cta_url', form.cta_url);

      await axios.post(`${API_BASE}/campaigns/clipping`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage('Clipping campaign created successfully!');
      setTimeout(() => router.back(), 2000);
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.error || 'Failed to create clipping campaign.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
            colors={['#34D3991A', '#D6CF8D80', '#d8d8d8b2']}
            style={styles.gradient}
          >
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Campaign Explanation */}
      <View style={styles.explanationContainer}>
        <Text style={styles.explanationTitle}>Clipping Campaign</Text>
        <Text style={styles.explanationText}>
          Upload your video and let creators turn it into short, viral clips for TikTok, Instagram Reels, YouTube Shorts, and more.{'\n\n'}
          • Creators edit, post, and promote your content{'\n'}
          • You only pay for real views generated{'\n'}
          • Great way to get massive organic reach from your existing videos
        </Text>
      </View>

      {/* Title */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Campaign Title *</Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={(v) => updateForm('title', v)}
          placeholder="e.g. Short Clips for New Sneaker Launch"
        />
      </View>

      {/* Video Upload */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Upload Your Video *</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
          <Ionicons name="videocam-outline" size={32} color="#4F46E5" />
          <Text style={styles.uploadText}>
            {form.videoFile ? form.videoFile.name : 'Tap to select video'}
          </Text>
          <Text style={styles.uploadSubText}>MP4 recommended • Max 500MB</Text>
        </TouchableOpacity>

        {form.videoFile && (
          <Text style={styles.fileSelected}>Selected: {form.videoFile.name}</Text>
        )}
      </View>

      {/* Budget */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Your Budget (₦) *</Text>
        <TextInput
          style={styles.input}
          value={form.budget}
          onChangeText={(v) => updateForm('budget', v.replace(/[^0-9]/g, ''))}
          placeholder="Minimum ₦1,000"
          keyboardType="numeric"
        />
        <Text style={styles.helperText}>
          Estimated views: {estimatedViews.toLocaleString()} (₦{budgetNum.toLocaleString()} total cost)
        </Text>
        {walletLoading ? (
          <Text style={styles.helperText}>Loading wallet...</Text>
        ) : (
          <Text style={styles.helperText}>
            Wallet balance: ₦{walletBalance.toLocaleString()}
          </Text>
        )}
      </View>

      {/* Platforms */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Platforms to Post On</Text>
        <View style={styles.platformsContainer}>
          {platformOptions.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.platformItem,
                form.platforms.includes(p.value) && styles.platformItemSelected,
              ]}
              onPress={() => togglePlatform(p.value)}
            >
              <Text style={styles.platformText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Hashtags */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Hashtags (comma-separated)</Text>
        <TextInput
          style={styles.input}
          value={form.hashtags}
          onChangeText={(v) => updateForm('hashtags', v)}
          placeholder="#sneakerhead, #fashion, #viral"
        />
        <Text style={styles.helperText}>Helps clips get discovered</Text>
      </View>

      {/* Directions */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Editing Directions</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={form.directions}
          onChangeText={(v) => updateForm('directions', v)}
          placeholder="e.g.:\nMake 15-30 second clips\nUse trending audio\nAdd text overlays\nFocus on product close-ups"
          multiline
          numberOfLines={5}
        />
      </View>

      {/* Categories */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Categories</Text>
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

      {/* CTA URL */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Call-to-Action Link (optional)</Text>
        <TextInput
          style={styles.input}
          value={form.cta_url}
          onChangeText={(v) => updateForm('cta_url', v)}
          placeholder="https://your-site.com/shop"
          keyboardType="url"
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitText}>Create Clipping Campaign</Text>
        )}
      </TouchableOpacity>

      {message && <Text style={styles.successMessage}>{message}</Text>}
      {error && <Text style={styles.errorMessage}>{error}</Text>}

      <View style={{ height: 100 }} />
    </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 120,
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

  platformsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },

  platformItem: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },

  platformItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },

  platformText: {
    fontSize: 14,
    color: '#374151',
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

  fileSelected: {
    fontSize: 14,
    color: '#16A34A',
    marginTop: 8,
    fontWeight: '500',
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