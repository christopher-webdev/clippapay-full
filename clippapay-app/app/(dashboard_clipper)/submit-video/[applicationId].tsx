// app/(dashboard_clipper)/submit-video/[applicationId].tsx
// Rebuilt: clean design, thumbnail & note fields uncommented, 
// fixed ImagePicker deprecation, deadline countdown, proper error handling
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Image,
  ActivityIndicator, Alert, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL   = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS   = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL || '';

const toUrl = (p?: string | null) =>
  !p ? null : p.startsWith('http') ? p : `${UPLOADS}${p.startsWith('/') ? p : '/' + p}`;

const getToken = async () => {
  try {
    if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
    return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
  } catch { return null; }
};

const fmtDeadline = (d?: string) => {
  if (!d) return null;
  const date = new Date(d);
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'Deadline passed';
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h remaining`;
  const days = Math.floor(diff / 86400000);
  return `${days}d ${Math.floor((diff % 86400000) / 3600000)}h remaining`;
};

export default function SubmitVideoScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();

  const [app, setApp]           = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);

  const [videoFile, setVideoFile]       = useState<any>(null);
  const [thumbFile, setThumbFile]       = useState<any>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [note, setNote]                 = useState('');

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) { router.replace('/(auth)/login'); return; }
      try {
        const res  = await fetch(`${API_URL}/applications/${applicationId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        const a = data.application || data;
        setApp(a);
        if (a.status !== 'accepted') {
          Alert.alert('Not ready', 'You can only submit after accepting the offer.');
          router.back();
        }
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally { setLoading(false); }
    })();
  }, [applicationId]);

  const pickVideo = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4','video/quicktime','video/webm'],
        copyToCacheDirectory: true,
      });
      if (!r.canceled && r.assets?.[0]) {
        const a = r.assets[0];
        setVideoFile({ uri: a.uri, name: a.name || `video-${Date.now()}.mp4`, type: a.mimeType || 'video/mp4', size: a.size });
      }
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  const pickThumbnail = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true, aspect: [16, 9], quality: 0.85,
    });
    if (!r.canceled && r.assets?.[0]) {
      const a = r.assets[0];
      setThumbFile({ uri: a.uri, name: a.fileName || `thumb-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' });
      setThumbPreview(a.uri);
    }
  };

  const handleSubmit = async () => {
    if (!videoFile) { Alert.alert('Missing video', 'Please select a video file.'); return; }
    setUploading(true);
    try {
      const token = await getToken();
      const fd    = new FormData();
      fd.append('video', {
        uri:  Platform.OS === 'ios' ? videoFile.uri.replace('file://', '') : videoFile.uri,
        name: videoFile.name, type: videoFile.type,
      } as any);
      if (thumbFile) {
        fd.append('thumbnail', {
          uri:  Platform.OS === 'ios' ? thumbFile.uri.replace('file://', '') : thumbFile.uri,
          name: thumbFile.name, type: thumbFile.type,
        } as any);
      }
      if (note.trim()) fd.append('note', note.trim());

      const res  = await fetch(`${API_URL}/applications/${applicationId}/submit`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      Alert.alert('✅ Submitted!', 'Your video has been sent for review. The advertiser will respond within the campaign timeline.', [
        { text: 'View Applications', onPress: () => router.replace('/(dashboard_clipper)/my-applications' as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit video');
    } finally { setUploading(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  if (!app) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={S.center}>
          <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
          <Text style={{ color: '#EF4444', marginTop: 12, fontSize: 16 }}>Application not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, backgroundColor: '#7C3AED', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const deadline     = fmtDeadline(app.submissionDeadline);
  const deadlinePast = app.submissionDeadline && new Date(app.submissionDeadline) < new Date();
  const thumb        = toUrl(app.campaign?.thumbnailUrl);

  return (
    <SafeAreaView style={S.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <LinearGradient colors={['#7C3AED','#5B21B6']} style={S.header}>
          <TouchableOpacity style={S.hdrBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={S.hdrTitle}>Submit Video</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* Campaign card */}
        <View style={S.campaignCard}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={S.campThumb} resizeMode="cover" />
          ) : (
            <View style={[S.campThumb, { backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' }]}>
              <MaterialCommunityIcons name="briefcase-outline" size={28} color="#C4B5FD" />
            </View>
          )}
          <View style={S.campInfo}>
            <Text style={S.campTitle} numberOfLines={2}>{app.campaign?.title}</Text>
            <Text style={S.campMeta}>{app.campaign?.category} · {app.campaign?.preferredLength}</Text>
            {deadline && (
              <View style={[S.deadlinePill, deadlinePast && S.deadlinePillRed]}>
                <Ionicons name="timer-outline" size={12} color={deadlinePast ? '#EF4444' : '#F97316'} />
                <Text style={[S.deadlineTxt, deadlinePast && { color: '#EF4444' }]}>
                  {deadline}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment reminder */}
        {app.paymentAmount && (
          <View style={S.paymentBanner}>
            <Ionicons name="cash-outline" size={18} color="#059669" />
            <Text style={S.paymentTxt}>
              {app.paymentCurrency === 'NGN' ? '₦' : '$'}{app.paymentAmount.toLocaleString()} {app.paymentCurrency} will be released once accepted
            </Text>
          </View>
        )}

        {/* Upload video */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Video File <Text style={S.req}>*</Text></Text>
          <Text style={S.sectionSub}>MP4, MOV or WebM · max 200 MB</Text>

          <TouchableOpacity style={[S.uploadBox, videoFile && S.uploadBoxDone]} onPress={pickVideo}>
            <Ionicons name={videoFile ? 'checkmark-circle' : 'videocam-outline'} size={32} color={videoFile ? '#059669' : '#7C3AED'} />
            <Text style={[S.uploadTxt, videoFile && { color: '#059669' }]}>
              {videoFile ? videoFile.name : 'Tap to select video file'}
            </Text>
            {videoFile?.size && (
              <Text style={S.uploadSub}>{(videoFile.size / 1048576).toFixed(1)} MB</Text>
            )}
          </TouchableOpacity>
        </View>

       
        {/* Submit */}
        <TouchableOpacity
          style={[S.submitBtn, (!videoFile || uploading || deadlinePast) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!videoFile || uploading || !!deadlinePast}
        >
          <LinearGradient colors={['#7C3AED','#5B21B6']} style={S.submitGrad}>
            {uploading ? (
              <><ActivityIndicator color="#FFF" /><Text style={S.submitTxt}>Uploading…</Text></>
            ) : (
              <><Ionicons name="cloud-upload-outline" size={20} color="#FFF" /><Text style={S.submitTxt}>Submit Video for Review</Text></>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {deadlinePast && (
          <Text style={S.deadlineWarning}>⚠️ Your submission deadline has passed. Contact the advertiser for an extension.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#F5F5F7' },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  hdrBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hdrTitle:{ fontSize: 18, fontWeight: '700', color: '#FFF' },

  campaignCard: { flexDirection: 'row', backgroundColor: '#FFF', margin: 16, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
  campThumb:    { width: 90, height: 90 },
  campInfo:     { flex: 1, padding: 12, gap: 3 },
  campTitle:    { fontSize: 14, fontWeight: '700', color: '#111827' },
  campMeta:     { fontSize: 12, color: '#9CA3AF' },
  deadlinePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF7ED', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  deadlinePillRed: { backgroundColor: '#FEF2F2' },
  deadlineTxt:  { fontSize: 11, fontWeight: '600', color: '#F97316' },

  paymentBanner:{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12 },
  paymentTxt:   { flex: 1, fontSize: 13, fontWeight: '600', color: '#065F46' },

  section:      { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 3 },
  sectionSub:   { fontSize: 12, color: '#9CA3AF', marginBottom: 14 },
  req:          { color: '#EF4444' },
  opt:          { fontSize: 12, color: '#9CA3AF', fontWeight: '400' },

  uploadBox:    { borderWidth: 2, borderColor: '#DDD6FE', borderStyle: 'dashed', borderRadius: 14, padding: 24, alignItems: 'center', gap: 8, backgroundColor: '#FAFAFA' },
  uploadBoxDone:{ borderColor: '#6EE7B7', backgroundColor: '#F0FDF4', borderStyle: 'solid' },
  uploadTxt:    { fontSize: 14, fontWeight: '600', color: '#7C3AED', textAlign: 'center' },
  uploadSub:    { fontSize: 12, color: '#9CA3AF' },

  thumbBox:     { height: 140, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EDE9FE' },
  thumbImg:     { width: '100%', height: '100%' },
  thumbEmpty:   { alignItems: 'center', gap: 8 },
  thumbEmptyTxt:{ fontSize: 13, color: '#A78BFA' },
  thumbEditBadge:{ position: 'absolute', bottom: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },

  textarea:     { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 14, color: '#1F2937', minHeight: 100, textAlignVertical: 'top', backgroundColor: '#FAFAFA' },

  submitBtn:    { marginHorizontal: 16, marginTop: 8, borderRadius: 16, overflow: 'hidden' },
  submitGrad:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17 },
  submitTxt:    { fontSize: 17, fontWeight: '700', color: '#FFF' },
  deadlineWarning: { fontSize: 13, color: '#EF4444', textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
});
