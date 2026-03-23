// app/(dashboard_clipper)/review-revisions/[applicationId].tsx
// NO SafeAreaView — _layout.tsx owns safe area + header height padding.
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, StyleSheet, Platform, Modal, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL  = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS  = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL || '';
const { width, height } = Dimensions.get('window');

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
  const diff = new Date(d).getTime() - Date.now();
  if (diff <= 0) return { text: 'Deadline passed', expired: true };
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24) return { text: `${hrs}h remaining`, expired: false };
  return { text: `${Math.floor(diff / 86_400_000)}d ${hrs % 24}h remaining`, expired: false };
};

const advName = (a?: any) =>
  !a ? 'Advertiser' : a.company || `${a.firstName || ''} ${a.lastName || ''}`.trim();

export default function ReviewRevisionsScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();

  const [app, setApp]               = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [videoFile, setVideoFile]       = useState<any>(null);
  const [thumbFile, setThumbFile]       = useState<any>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [note, setNote]                 = useState('');
  const [videoModal, setVideoModal]     = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) { router.replace('/(auth)/login'); return; }
      try {
        const res  = await fetch(`${API_URL}/applications/${applicationId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setApp(data.application || data);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally { setLoading(false); }
    })();
  }, [applicationId]);

  const pickVideo = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime', 'video/webm'],
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
      mediaTypes: ['images'] as any, allowsEditing: true, aspect: [16, 9], quality: 0.85,
    });
    if (!r.canceled && r.assets?.[0]) {
      setThumbFile({ uri: r.assets[0].uri, name: r.assets[0].fileName || `thumb-${Date.now()}.jpg`, type: r.assets[0].mimeType || 'image/jpeg' });
      setThumbPreview(r.assets[0].uri);
    }
  };

  const handleResubmit = async () => {
    if (!videoFile) { Alert.alert('Missing video', 'Please select your revised video.'); return; }
    setSubmitting(true);
    try {
      const token = await getToken();
      const fd    = new FormData();
      fd.append('video', { uri: Platform.OS === 'ios' ? videoFile.uri.replace('file://', '') : videoFile.uri, name: videoFile.name, type: videoFile.type } as any);
      if (thumbFile) fd.append('thumbnail', { uri: Platform.OS === 'ios' ? thumbFile.uri.replace('file://', '') : thumbFile.uri, name: thumbFile.name, type: thumbFile.type } as any);
      if (note.trim()) fd.append('note', note.trim());

      const res  = await fetch(`${API_URL}/applications/${applicationId}/submit`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Resubmission failed');

      Alert.alert('✅ Resubmitted!', 'Your revised video has been sent for review.', [
        { text: 'OK', onPress: () => router.replace('/(dashboard_clipper)/my-applications' as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally { setSubmitting(false); }
  };

  // ── Loading ──
  if (loading) return (
    <View style={S.container}>
      <View style={S.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    </View>
  );

  // ── Not found ──
  if (!app) return (
    <View style={S.container}>
      <View style={S.center}>
        <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
        <Text style={{ color: '#EF4444', marginTop: 12 }}>Application not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={S.goBackBtn}>
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const deadline      = fmtDeadline(app.submissionDeadline);
  const prevVideoUrl  = toUrl(app.currentVideoUrl);
  const prevThumbUrl  = toUrl(app.currentThumbnailUrl);
  const revisionsLeft = Math.max(0, 3 - (app.revisionCount || 0));

  return (
    <View style={S.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header — paddingTop: 16, layout already cleared the ProfileHeader */}
        <LinearGradient colors={['#F97316', '#EA580C']} style={S.header}>
          <TouchableOpacity style={S.hdrBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={S.hdrTitle}>Revision Requested</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={{ padding: 16 }}>

          {/* Campaign + revision count */}
          <View style={S.campaignRow}>
            <View style={{ flex: 1 }}>
              <Text style={S.campTitle} numberOfLines={2}>{app.campaign?.title}</Text>
              <Text style={S.campBy}>by {advName(app.campaign?.advertiser)}</Text>
            </View>
            <View style={S.revCountBadge}>
              <Text style={S.revCountNum}>{revisionsLeft}</Text>
              <Text style={S.revCountLbl}>left</Text>
            </View>
          </View>

          {/* Deadline */}
          {deadline && (
            <View style={[S.deadlinePill, deadline.expired && S.deadlinePillRed]}>
              <Ionicons name="timer-outline" size={14} color={deadline.expired ? '#EF4444' : '#F97316'} />
              <Text style={[S.deadlineTxt, deadline.expired && { color: '#EF4444' }]}>
                {deadline.text}
              </Text>
            </View>
          )}

          {/* Payment reminder */}
          {app.paymentAmount && (
            <View style={S.payBanner}>
              <Ionicons name="cash-outline" size={16} color="#059669" />
              <Text style={S.payTxt}>
                {app.paymentCurrency === 'NGN' ? '₦' : '$'}{app.paymentAmount.toLocaleString()} {app.paymentCurrency} on completion
              </Text>
            </View>
          )}

          {/* Feedback — most prominent */}
          <View style={S.feedbackCard}>
            <View style={S.feedbackHeader}>
              <Ionicons name="chatbubble-outline" size={18} color="#D97706" />
              <Text style={S.feedbackTitle}>Advertiser Feedback</Text>
              <View style={S.revBadge}>
                <Text style={S.revBadgeTxt}>Revision {app.revisionCount}/3</Text>
              </View>
            </View>
            <Text style={S.feedbackTxt}>
              {app.lastFeedback || 'No specific feedback provided. Please review the brief and resubmit.'}
            </Text>
          </View>

          {/* Previous submission */}
          {prevVideoUrl && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>Your Previous Submission</Text>
              <TouchableOpacity style={S.prevVideoBox} onPress={() => setVideoModal(true)} activeOpacity={0.85}>
                {prevThumbUrl ? (
                  <Image source={{ uri: prevThumbUrl }} style={S.prevThumb} resizeMode="cover" />
                ) : (
                  <View style={S.prevThumbEmpty}>
                    <Ionicons name="videocam" size={32} color="rgba(255,255,255,0.5)" />
                  </View>
                )}
                <View style={S.playBtnOverlay}>
                  <View style={S.playBtn}>
                    <Ionicons name="play" size={20} color="#FFF" />
                  </View>
                  <Text style={S.playBtnTxt}>Watch previous submission</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Divider */}
          <View style={S.divider}>
            <View style={S.dividerLine} />
            <Text style={S.dividerTxt}>Upload Revised Video</Text>
            <View style={S.dividerLine} />
          </View>

          {/* New video upload */}
          <View style={S.section}>
            <Text style={S.sectionTitle}>New Video File <Text style={S.req}>*</Text></Text>
            <TouchableOpacity style={[S.uploadBox, videoFile && S.uploadBoxDone]} onPress={pickVideo}>
              <Ionicons name={videoFile ? 'checkmark-circle' : 'videocam-outline'} size={30} color={videoFile ? '#059669' : '#F97316'} />
              <Text style={[S.uploadTxt, videoFile && { color: '#059669' }]}>
                {videoFile ? videoFile.name : 'Select revised video'}
              </Text>
              {videoFile?.size && <Text style={S.uploadSub}>{(videoFile.size / 1_048_576).toFixed(1)} MB</Text>}
            </TouchableOpacity>
          </View>

          {/* Submit / blocked states */}
          {deadline?.expired ? (
            <View style={S.expiredBox}>
              <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
              <Text style={S.expiredTxt}>Your submission deadline has passed. Contact the advertiser to discuss next steps.</Text>
            </View>
          ) : revisionsLeft === 0 ? (
            <View style={S.expiredBox}>
              <Ionicons name="close-circle-outline" size={28} color="#EF4444" />
              <Text style={S.expiredTxt}>Maximum revisions (3) reached. The advertiser will make a final decision.</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[S.submitBtn, (!videoFile || submitting) && { opacity: 0.5 }]}
              onPress={handleResubmit}
              disabled={!videoFile || submitting}
            >
              <LinearGradient colors={['#F97316', '#EA580C']} style={S.submitGrad}>
                {submitting ? (
                  <><ActivityIndicator color="#FFF" /><Text style={S.submitTxt}>Uploading…</Text></>
                ) : (
                  <><Ionicons name="cloud-upload-outline" size={20} color="#FFF" /><Text style={S.submitTxt}>Submit Revision</Text></>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Video player modal */}
      <Modal visible={videoModal} transparent animationType="fade" onRequestClose={() => setVideoModal(false)}>
        <View style={S.videoModalBg}>
          <TouchableOpacity style={S.videoModalClose} onPress={() => setVideoModal(false)}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {prevVideoUrl && (
            <Video
              source={{ uri: prevVideoUrl }}
              style={{ width, height: height * 0.65 }}
              useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  goBackBtn: { backgroundColor: '#7C3AED', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 16 },

  // paddingTop: 16 — layout body already cleared the ProfileHeader
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 },
  hdrBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  hdrTitle:{ fontSize: 18, fontWeight: '700', color: '#FFF' },

  campaignRow:   { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10, gap: 12 },
  campTitle:     { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  campBy:        { fontSize: 12, color: '#9CA3AF' },
  revCountBadge: { alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: '#FED7AA' },
  revCountNum:   { fontSize: 22, fontWeight: '800', color: '#F97316' },
  revCountLbl:   { fontSize: 10, color: '#F97316', fontWeight: '600' },

  deadlinePill:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF7ED', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 10, alignSelf: 'flex-start' },
  deadlinePillRed: { backgroundColor: '#FEF2F2' },
  deadlineTxt:     { fontSize: 13, fontWeight: '600', color: '#F97316' },

  payBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginBottom: 14 },
  payTxt:    { fontSize: 13, fontWeight: '600', color: '#065F46' },

  feedbackCard:   { backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A', borderRadius: 16, padding: 16, marginBottom: 16 },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  feedbackTitle:  { flex: 1, fontSize: 15, fontWeight: '700', color: '#92400E' },
  revBadge:       { backgroundColor: '#FCD34D', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  revBadgeTxt:    { fontSize: 11, fontWeight: '700', color: '#78350F' },
  feedbackTxt:    { fontSize: 14, color: '#78350F', lineHeight: 21 },

  section:      { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  req:          { color: '#EF4444' },

  prevVideoBox:    { height: 180, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  prevThumb:       { width: '100%', height: '100%', position: 'absolute' },
  prevThumbEmpty:  { width: '100%', height: '100%', backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  playBtnOverlay:  { alignItems: 'center', gap: 8 },
  playBtn:         { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  playBtnTxt:      { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerTxt:  { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },

  uploadBox:     { borderWidth: 2, borderColor: '#FED7AA', borderStyle: 'dashed', borderRadius: 14, padding: 22, alignItems: 'center', gap: 8, backgroundColor: '#FAFAFA' },
  uploadBoxDone: { borderColor: '#6EE7B7', backgroundColor: '#F0FDF4', borderStyle: 'solid' },
  uploadTxt:     { fontSize: 14, fontWeight: '600', color: '#F97316', textAlign: 'center' },
  uploadSub:     { fontSize: 12, color: '#9CA3AF' },

  submitBtn:  { borderRadius: 16, overflow: 'hidden', marginTop: 6 },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17 },
  submitTxt:  { fontSize: 17, fontWeight: '700', color: '#FFF' },

  expiredBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16 },
  expiredTxt: { flex: 1, fontSize: 14, color: '#B91C1C', lineHeight: 20 },

  videoModalBg:    { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoModalClose: { position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
});