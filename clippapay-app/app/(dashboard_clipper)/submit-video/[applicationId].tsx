// app/(dashboard)/clipper/submit-video/[applicationId].tsx
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
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_BASE_URL = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL;

// Add the missing toFullUrl function
const toFullUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${UPLOADS_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export default function SubmitVideoScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();

  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Submission fields
  const [videoFile, setVideoFile] = useState<any>(null);
  const [thumbnailFile, setThumbnailFile] = useState<any>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${API_URL}/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');

      const appData = data.application || data;
      setApplication(appData);

      // Safety check
      if (appData.status !== 'accepted') {
        Alert.alert('Not ready', 'You can only submit after accepting the offer.');
        router.back();
      }

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load job details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) fetchApplication();
  }, [applicationId]);

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need access to your media library.');
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime', 'video/webm', 'video/mpeg'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setVideoFile({
          uri: asset.uri,
          name: asset.name || `video-${Date.now()}.mp4`,
          type: asset.mimeType || 'video/mp4',
          size: asset.size,
        });
        Alert.alert('Video selected', asset.name || 'Video ready to upload');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick video: ' + err.message);
    }
  };

  const pickThumbnail = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setThumbnailFile({
          uri: asset.uri,
          name: asset.fileName || `thumb-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        });
        setThumbnailPreview(asset.uri);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick thumbnail: ' + err.message);
    }
  };

  const handleSubmit = async () => {
    if (!videoFile) {
      Alert.alert('Missing video', 'Please select a video file to submit.');
      return;
    }

    setUploading(true);

    try {
      const token = await SecureStore.getItemAsync('userToken');

      const formData = new FormData();

      // Video file
      formData.append('video', {
        uri: Platform.OS === 'ios' ? videoFile.uri.replace('file://', '') : videoFile.uri,
        name: videoFile.name,
        type: videoFile.type,
      } as any);

      // Optional thumbnail
      if (thumbnailFile) {
        formData.append('thumbnail', {
          uri: Platform.OS === 'ios' ? thumbnailFile.uri.replace('file://', '') : thumbnailFile.uri,
          name: thumbnailFile.name,
          type: thumbnailFile.type,
        } as any);
      }

      // Optional note
      if (note.trim()) {
        formData.append('note', note.trim());
      }

      console.log('Submitting to:', `${API_URL}/applications/${applicationId}/submit`);
      
      const res = await fetch(`${API_URL}/applications/${applicationId}/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set Content-Type — fetch sets multipart boundary automatically
        },
        body: formData,
      });

      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned invalid response');
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Submission failed');
      }

      Alert.alert(
        'Success',
        'Video submitted successfully! The advertiser will review it soon.',
        [{ text: 'OK', onPress: () => router.push('/(dashboard_clipper)/my-applications') }]
      );

    } catch (err: any) {
      console.error('Submit error:', err);
      Alert.alert('Error', err.message || 'Failed to submit video');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#6366f1" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!application) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Application not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Video</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Campaign Info */}
        <View style={styles.campaignCard}>
          <Image
            source={{ uri: toFullUrl(application?.campaign?.thumbnailUrl) || 'https://via.placeholder.com/400' }}
            style={styles.campaignThumb}
          />
          <View style={styles.campaignInfo}>
            <Text style={styles.campaignTitle}>{application?.campaign?.title}</Text>
            <Text style={styles.campaignMeta}>
              {application?.campaign?.category} • {application?.campaign?.preferredLength}
            </Text>
            <Text style={styles.deadline}>
              Submit by: {new Date(application?.submissionDeadline).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Upload Video */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Upload Video</Text>
          <Text style={styles.sectionHelp}>MP4, MOV or WebM – max 200MB recommended</Text>

          <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
            <Ionicons name="videocam" size={32} color="#6366f1" />
            <Text style={styles.uploadText}>
              {videoFile ? 'Change Video' : 'Select Video File'}
            </Text>
          </TouchableOpacity>

          {videoFile && (
            <View style={styles.fileInfo}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.fileName} numberOfLines={1}>
                {videoFile.name}
              </Text>
              {videoFile.size && (
                <Text style={styles.fileSize}>
                  {Math.round(videoFile.size / (1024 * 1024))} MB
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Optional Thumbnail */}
        {/* <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Thumbnail (optional)</Text>
          <Text style={styles.sectionHelp}>Recommended 16:9 ratio</Text>

          <TouchableOpacity style={styles.thumbnailButton} onPress={pickThumbnail}>
            {thumbnailPreview ? (
              <Image source={{ uri: thumbnailPreview }} style={styles.thumbPreview} />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Ionicons name="image-outline" size={32} color="#94a3b8" />
                <Text style={styles.thumbText}>Tap to select thumbnail</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {thumbnailFile && (
            <Text style={styles.fileName} numberOfLines={1}>
              Selected: {thumbnailFile.name}
            </Text>
          )}
        </View> */}

        {/* Note */}
        {/* <View style={styles.noteSection}>
          <Text style={styles.sectionTitle}>Submission Note (optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Any context, revisions needed, or special instructions..."
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View> */}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, (uploading || !videoFile) && styles.disabled]}
          onPress={handleSubmit}
          disabled={uploading || !videoFile}
        >
          {uploading ? (
            <View style={styles.gradient}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <LinearGradient
              colors={['#6366f1', '#4f46e5']}
              style={styles.gradient}
            >
              <Text style={styles.submitText}>Submit Video for Review</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  campaignCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  campaignThumb: { width: 120, height: 120 },
  campaignInfo: { flex: 1, padding: 16 },
  campaignTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  campaignMeta: { fontSize: 14, color: '#64748b' },
  deadline: { fontSize: 13, color: '#ef4444', marginTop: 8, fontWeight: '500' },
  uploadSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#1e293b' },
  sectionHelp: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  uploadText: { marginTop: 12, fontSize: 16, color: '#6366f1', fontWeight: '600' },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  fileName: { 
    flex: 1, 
    fontSize: 14, 
    color: '#166534', 
    marginLeft: 8,
    marginRight: 8,
  },
  fileSize: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  thumbnailButton: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbPreview: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center' },
  thumbText: { marginTop: 8, color: '#94a3b8', fontSize: 14 },
  noteSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#f8fafc',
  },
  submitButton: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  disabled: { opacity: 0.5 },
  gradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  errorText: { fontSize: 18, color: '#ef4444', marginBottom: 20 },
  backBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});