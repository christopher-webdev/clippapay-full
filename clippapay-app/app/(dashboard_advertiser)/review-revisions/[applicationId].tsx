// app/(dashboard)/advertiser/review-revisions/[applicationId].tsx
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
  Linking,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Video } from 'expo-av';

const { width } = Dimensions.get('window');

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_BASE_URL = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL;

const toFullUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${UPLOADS_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export default function ReviewRevisionsScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();

  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

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

      setApplication(data.application || data);

      // Safety: only allow if it's your campaign and has submission
      if (data.application.status !== 'submitted' && data.application.status !== 'revision_requested') {
        Alert.alert('Not ready', 'No video submitted yet for review.');
        router.back();
      }

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load submission');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) fetchApplication();
  }, [applicationId]);

  const handleRequestRevision = async () => {
    if (!feedback.trim()) {
      Alert.alert('Required', 'Please provide feedback for the revision.');
      return;
    }

    if (application.revisionCount >= 3) {
      Alert.alert('Limit reached', 'Maximum 3 revisions allowed. Consider approving or disputing.');
      return;
    }

    setActionLoading('revision');

    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await fetch(`${API_URL}/applications/${applicationId}/revision`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revision request failed');

      Alert.alert('Revision Requested', 'The clipper has been notified to make changes.');
      setFeedback('');
      fetchApplication();

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to request revision');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async () => {
    Alert.alert(
      'Approve Video',
      'Are you sure you want to approve this submission? This will release payment to the clipper.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setActionLoading('approve');

            try {
              const token = await SecureStore.getItemAsync('userToken');
              const res = await fetch(`${API_URL}/applications/${applicationId}/approve`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Approval failed');

              Alert.alert('Approved!', 'Payment has been released to the clipper.');
              router.back();

            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to approve');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#6366f1" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const videoUrl = toFullUrl(application?.currentVideoUrl);
  const thumbUrl = toFullUrl(application?.currentThumbnailUrl) || videoUrl;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Submission</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Video Player / Preview */}
        <View style={styles.videoContainer}>
          {videoUrl ? (
            <>
              <Image
                source={{ uri: thumbUrl }}
                style={styles.videoThumb}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => {
                  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                    Linking.openURL(videoUrl);
                  } else {
                    Alert.alert('Video', 'Local video playback not implemented yet.\nUse external player or download.');
                  }
                }}
              >
                <Ionicons name="play-circle" size={64} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noVideo}>
              <Ionicons name="videocam-off" size={48} color="#94a3b8" />
              <Text style={styles.noVideoText}>No video submitted yet</Text>
            </View>
          )}
        </View>

        {/* Submission Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>
            Revision {application.revisionCount + 1} of 3
          </Text>

          {application.lastSubmittedAt && (
            <Text style={styles.submittedAt}>
              Submitted on {new Date(application.lastSubmittedAt).toLocaleString()}
            </Text>
          )}

          {application.lastFeedback && (
            <>
              <Text style={styles.feedbackLabel}>Your previous feedback:</Text>
              <Text style={styles.feedback}>{application.lastFeedback}</Text>
            </>
          )}
        </View>

        {/* Action Area */}
        <View style={styles.actions}>
          <View style={styles.remainingRevisions}>
            <Text style={styles.remainingText}>
              Revisions left: {3 - application.revisionCount}
            </Text>
          </View>

          <TextInput
            style={styles.feedbackInput}
            placeholder="Provide feedback for revision (required for request)..."
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={5}
          />

          <TouchableOpacity
            style={[
              styles.btnRevision,
              (application.revisionCount >= 3 || !feedback.trim() || actionLoading) && styles.disabled,
            ]}
            onPress={handleRequestRevision}
            disabled={application.revisionCount >= 3 || !feedback.trim() || !!actionLoading}
          >
            {actionLoading === 'revision' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Request Revision</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnApprove}
            onPress={handleApprove}
            disabled={!!actionLoading}
          >
            {actionLoading === 'approve' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Approve & Release Payment</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 40 },
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
  videoContainer: {
    height: 220,
    backgroundColor: '#000',
    marginBottom: 20,
    position: 'relative',
  },
  videoThumb: { width: '100%', height: '100%' },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
  },
  noVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  noVideoText: { color: '#94a3b8', marginTop: 12, fontSize: 16 },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  submittedAt: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  feedbackLabel: { fontSize: 14, fontWeight: '600', color: '#4b5563', marginTop: 12, marginBottom: 4 },
  feedback: { fontSize: 15, color: '#374151', lineHeight: 22 },
  actions: { marginHorizontal: 20 },
  remainingRevisions: {
    backgroundColor: '#fefce8',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  remainingText: { fontSize: 15, fontWeight: '600', color: '#854d0e' },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  btnRevision: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnApprove: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});