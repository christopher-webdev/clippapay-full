// app/(dashboard)/advertiser/create-campaign.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ────────────────────────────────────────────────
//  Use process.env — Expo automatically injects EXPO_PUBLIC_* variables
// ────────────────────────────────────────────────
const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  console.warn(
    'EXPO_PUBLIC_API_URL is not defined. ' +
    'Make sure it exists in your app.json / app.config.js or .env file.'
  );
}

type FormData = {
  title: string;
  description: string;
  script: string;
  keyPhrases: string;
  preferredLength: string;
  category: string;
  applicationDeadline: string; // YYYY-MM-DD
  aspectRatio: string;
  preferredLocation: string;
  locationDescription: string;
  backgroundStyle: string;
  moodTone: string;
  referenceLinks: string;
  thumbnail?: { uri: string; name: string; type: string };
};

const initialForm: FormData = {
  title: '',
  description: '',
  script: '',
  keyPhrases: '',
  preferredLength: '30s',
  category: '',
  applicationDeadline: '',
  aspectRatio: '9:16',
  preferredLocation: 'anywhere',
  locationDescription: '',
  backgroundStyle: '',
  moodTone: '',
  referenceLinks: '',
};

const lengthOptions = ['15s', '30s', '45s', '60s', '90s', 'any'];
const aspectOptions = ['9:16', '16:9', '1:1', '4:5', 'any'];
const locationOptions = ['indoor', 'outdoor', 'studio', 'anywhere', 'specific'];

export default function CreateCampaignScreen() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const pickThumbnail = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photo library to upload a thumbnail.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.82,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setForm((prev) => ({
        ...prev,
        thumbnail: {
          uri: asset.uri,
          name: asset.fileName || `campaign-thumb-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        },
      }));
      setPreviewUri(asset.uri);
    }
  }, []);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      // Prefer SecureStore (more secure on native)
      let token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        // Fallback for web / testing
        token = await AsyncStorage.getItem('userToken');
      }
      return token;
    } catch (err) {
      console.warn('Failed to read auth token:', err);
      return null;
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!form.title.trim() || !form.description.trim() || !form.category.trim()) {
      Alert.alert('Required fields', 'Title, description and category are required.');
      return;
    }

    if (!form.applicationDeadline) {
      Alert.alert('Deadline required', 'Please enter an application deadline.');
      return;
    }

    // Simple date format & future check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.applicationDeadline)) {
      Alert.alert('Invalid format', 'Please use YYYY-MM-DD format for the deadline.');
      return;
    }

    const deadlineDate = new Date(form.applicationDeadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      Alert.alert('Invalid deadline', 'Deadline must be a future date.');
      return;
    }

    setLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Not logged in', 'Please log in to create a campaign.');
        router.replace('/(auth)/login');
        return;
      }

      const fd = new FormData() as any; // Type assertion needed for RN FormData

      // Text fields
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('script', form.script.trim());
      fd.append(
        'keyPhrases',
        JSON.stringify(
          form.keyPhrases
            .split('\n')
            .map((p) => p.trim())
            .filter(Boolean)
        )
      );
      fd.append('preferredLength', form.preferredLength);
      fd.append('category', form.category.trim());
      fd.append('applicationDeadline', deadlineDate.toISOString());

      // Creative direction
      fd.append('aspectRatio', form.aspectRatio);
      fd.append('preferredLocation', form.preferredLocation);
      fd.append('locationDescription', form.locationDescription.trim());
      fd.append('backgroundStyle', form.backgroundStyle.trim());
      fd.append('moodTone', form.moodTone.trim());
      fd.append(
        'referenceLinks',
        JSON.stringify(
          form.referenceLinks
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
        )
      );

      // Thumbnail
      if (form.thumbnail) {
        fd.append('thumbnail', {
          uri: Platform.OS === 'ios' ? form.thumbnail.uri.replace('file://', '') : form.thumbnail.uri,
          name: form.thumbnail.name,
          type: form.thumbnail.type,
        });
      }

      const response = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // IMPORTANT: Do NOT manually set Content-Type — fetch handles multipart/form-data boundary
        },
        body: fd,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create campaign');
      }

      Alert.alert('Success', 'Campaign created! It is now in draft status.\nYou can activate it from your campaigns list.');
      //router.back(); // or: 
      router.push('/(dashboard_advertiser)/Campaigns')

    } catch (err: any) {
      console.error('Campaign creation failed:', err);
      Alert.alert(
        'Error',
        err.message?.includes('deadline')
          ? 'Please check the deadline format (YYYY-MM-DD)'
          : err.message || 'Could not create the campaign. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.title}>Create UGC Campaign</Text>
          </View>

          {/* Thumbnail Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campaign Thumbnail</Text>
            <Text style={styles.sectionHelp}>Attractive preview image (recommended 4:3 ratio)</Text>

            <TouchableOpacity style={styles.thumbnailContainer} onPress={pickThumbnail}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.thumbnailPreview} />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Ionicons name="image-outline" size={48} color="#aaa" />
                  <Text style={styles.placeholderText}>Tap to upload thumbnail</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <TextInput
              style={styles.input}
              placeholder="Campaign Title *"
              value={form.title}
              onChangeText={(v) => setForm({ ...form, title: v })}
              maxLength={180}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description – what the video should achieve *"
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
              multiline
              numberOfLines={5}
              maxLength={2000}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Full script or main talking points"
              value={form.script}
              onChangeText={(v) => setForm({ ...form, script: v })}
              multiline
              numberOfLines={8}
              maxLength={6000}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Key phrases that MUST be said (one per line)"
              value={form.keyPhrases}
              onChangeText={(v) => setForm({ ...form, keyPhrases: v })}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Preferred Video Length</Text>
            <View style={styles.optionRow}>
              {lengthOptions.map((len) => (
                <TouchableOpacity
                  key={len}
                  style={[
                    styles.optionChip,
                    form.preferredLength === len && styles.optionChipActive,
                  ]}
                  onPress={() => setForm({ ...form, preferredLength: len })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      form.preferredLength === len && { color: '#fff' },
                    ]}
                  >
                    {len}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Category (Beauty, Tech, Food, Fashion...)"
              value={form.category}
              onChangeText={(v) => setForm({ ...form, category: v })}
            />
          </View>

          {/* Deadline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Application Deadline *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={form.applicationDeadline}
              onChangeText={(v) => setForm({ ...form, applicationDeadline: v })}
              keyboardType="default"
            />
            <Text style={styles.helpText}>
              Applications will close automatically after this date
            </Text>
          </View>

          {/* Creative Direction */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Creative Direction</Text>

            <Text style={styles.label}>Aspect Ratio</Text>
            <View style={styles.optionRow}>
              {aspectOptions.map((ratio) => (
                <TouchableOpacity
                  key={ratio}
                  style={[
                    styles.optionChip,
                    form.aspectRatio === ratio && styles.optionChipActive,
                  ]}
                  onPress={() => setForm({ ...form, aspectRatio: ratio })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      form.aspectRatio === ratio && { color: '#fff' },
                    ]}
                  >
                    {ratio}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Preferred Location</Text>
            <View style={styles.optionRowWrap}>
              {locationOptions.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[
                    styles.optionChip,
                    form.preferredLocation === loc && styles.optionChipActive,
                  ]}
                  onPress={() => setForm({ ...form, preferredLocation: loc })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      form.preferredLocation === loc && { color: '#fff' },
                    ]}
                  >
                    {loc.charAt(0).toUpperCase() + loc.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.preferredLocation === 'specific' && (
              <TextInput
                style={styles.input}
                placeholder="Describe the desired location (e.g. modern kitchen, busy market...)"
                value={form.locationDescription}
                onChangeText={(v) => setForm({ ...form, locationDescription: v })}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Background style (minimal, colorful, natural light...)"
              value={form.backgroundStyle}
              onChangeText={(v) => setForm({ ...form, backgroundStyle: v })}
            />

            <TextInput
              style={styles.input}
              placeholder="Mood / Tone (fun & energetic, calm & professional...)"
              value={form.moodTone}
              onChangeText={(v) => setForm({ ...form, moodTone: v })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reference links (YouTube, mood boards...) – one per line"
              value={form.referenceLinks}
              onChangeText={(v) => setForm({ ...form, referenceLinks: v })}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.gradient}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Create Campaign</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────
// Styles (unchanged from your version)
// ────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  section: {
    marginBottom: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionHelp: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  thumbnailContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  thumbnailPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 10,
  },
  optionRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  optionChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  helpText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: -8,
    marginBottom: 20,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  gradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});