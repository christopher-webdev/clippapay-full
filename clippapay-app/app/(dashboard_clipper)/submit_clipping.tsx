// app/(dashboard_clipper)/submit_clipping.tsx
//
// FIXES applied:
//  1. Campaign type now includes clipperCpm (40% rate) — shown in info pill & update estimate
//  2. Rejected proofs: Update Views button is always shown (rejection is just feedback,
//     not a block). Rejected proofs get a distinct red "Resubmit / Update" banner.
//  3. Estimated earnings in update modal uses clipperCpm (40%) not costPerThousand (100%)
//  4. Info pill on campaign card shows clipper earning rate, not advertiser rate
//
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Modal, Platform, Linking, RefreshControl, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS  = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL || '';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Proof {
  _id: string;
  platform: string;
  submissionUrl: string | null;
  views: number;
  proofVideo?: string | null;
  proofImage?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  verifiedViews?: number;
  rewardAmount?: number;
  createdAt: string;
  updatedAt: string;
}
interface Submission {
  _id: string;
  campaign: string | { _id: string };
  clipper: string;
  proofs: Proof[];
  rewardAmount: number;
}
interface Campaign {
  _id: string;
  title: string;
  videoUrl: string;
  platforms: string[];
  directions: string[];
  hashtags: string[];
  ctaUrl?: string;
  currency: 'NGN' | 'USDT';
  costPerThousand: number;  // advertiser rate — DO NOT show to clipper
  clipperCpm?: number;      // 40% of costPerThousand — what clipper earns
  estimatedViews: number;
  status: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PLATFORM_OPTIONS = [
  { id: 'tiktok',    label: 'TikTok',      icon: 'logo-tiktok',    needsUrl: true  },
  { id: 'instagram', label: 'Instagram',   icon: 'logo-instagram', needsUrl: true  },
  { id: 'youtube',   label: 'YouTube',     icon: 'logo-youtube',   needsUrl: true  },
  { id: 'facebook',  label: 'Facebook',    icon: 'logo-facebook',  needsUrl: true  },
  { id: 'snapchat',  label: 'Snapchat',    icon: 'logo-snapchat',  needsUrl: true  },
  { id: 'twitter',   label: 'X / Twitter', icon: 'logo-twitter',   needsUrl: true  },
  { id: 'whatsapp',  label: 'WhatsApp',    icon: 'logo-whatsapp',  needsUrl: false },
] as const;
const PMAP = Object.fromEntries(PLATFORM_OPTIONS.map((p) => [p.id, p]));

const STATUS_CONFIG = {
  pending:  { label: 'Pending Review', color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline'             },
  approved: { label: 'Approved ✓',     color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle-outline'  },
  rejected: { label: 'Rejected',       color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline'     },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney     = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n.toLocaleString()}` : `$${n.toFixed(4)}`;
const platformInfo = (pid: string) => PMAP[pid.toLowerCase()] ?? { label: pid, icon: 'globe-outline', needsUrl: true };

// Clipper earns 40% — use clipperCpm from API if available, else derive it
const getClipperCpm = (campaign: Campaign) =>
  campaign.clipperCpm ?? campaign.costPerThousand * 0.40;

// ─── Component ────────────────────────────────────────────────────────────────
export default function SubmitClippingScreen() {
  const router = useRouter();
  const { campaignId, campaignTitle } = useLocalSearchParams<{ campaignId: string; campaignTitle: string }>();

  const [campaign, setCampaign]     = useState<Campaign | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Submit-proof modal
  const [submitModal, setSubmitModal] = useState(false);
  const [selPlatform, setSelPlatform] = useState('');
  const [postUrl, setPostUrl]         = useState('');
  const [viewCount, setViewCount]     = useState('');
  const [proofImage, setProofImage]   = useState<{ uri: string; name: string; type: string } | null>(null);
  const [proofVideo, setProofVideo]   = useState<{ uri: string; name: string; type: string } | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  // Update-views modal
  const [updateModal, setUpdateModal]     = useState(false);
  const [updatingProof, setUpdatingProof] = useState<Proof | null>(null);
  const [newViews, setNewViews]           = useState('');
  const [newUrl, setNewUrl]               = useState('');
  const [newImage, setNewImage]           = useState<{ uri: string; name: string; type: string } | null>(null);
  const [updating, setUpdating]           = useState(false);

  const getToken = async () => {
    if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
    return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.push('/login'); return; }
      const headers = { Authorization: `Bearer ${token}` };

      const [campRes, subRes] = await Promise.all([
        axios.get<Campaign>(`${API_BASE}/clipping/${campaignId}`, { headers }),
        axios.get<Submission[]>(`${API_BASE}/clipping/my/submissions`, { headers }),
      ]);

      setCampaign(campRes.data);
      const mySub = subRes.data.find((s: any) => {
        const id = typeof s.campaign === 'object' ? s.campaign._id : s.campaign;
        return String(id) === String(campaignId);
      });
      setSubmission(mySub || null);
    } catch (err) {
      console.error('load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  // ── Pick image / video ────────────────────────────────────────────────────
  const pickImage = async (setter: (v: any) => void) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setter({ uri: a.uri, name: a.fileName || 'proof.jpg', type: a.mimeType || 'image/jpeg' });
    }
  };

  const pickVideo = async (setter: (v: any) => void) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setter({ uri: a.uri, name: a.fileName || 'proof.mp4', type: a.mimeType || 'video/mp4' });
    }
  };

  // ── Submit proof ──────────────────────────────────────────────────────────
  const handleSubmitProof = async () => {
    if (!selPlatform) return Alert.alert('Select a platform first.');
    const pInfo = platformInfo(selPlatform);
    if (pInfo.needsUrl && !postUrl.trim())
      return Alert.alert('Post URL required', 'Please enter the link to your post.');
    if (!pInfo.needsUrl && !proofImage && !proofVideo)
      return Alert.alert('Proof required', 'Please attach a screenshot or video for WhatsApp.');

    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;
      const form = new FormData();
      form.append('platform', selPlatform);
      if (postUrl.trim()) form.append('submissionUrl', postUrl.trim());
      if (viewCount.trim()) form.append('views', viewCount.trim());
      if (proofImage) form.append('proofImage', { uri: proofImage.uri, name: proofImage.name, type: proofImage.type } as any);
      if (proofVideo) form.append('proofVideo', { uri: proofVideo.uri, name: proofVideo.name, type: proofVideo.type } as any);

      await axios.post(`${API_BASE}/clipping/${campaignId}/submit-proof`, form, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      setSubmitModal(false);
      resetSubmitForm();
      await load(true);
      Alert.alert('✅ Submitted!', 'Your proof has been submitted. Admin will verify and credit your wallet shortly.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not submit proof.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetSubmitForm = () => {
    setSelPlatform(''); setPostUrl(''); setViewCount('');
    setProofImage(null); setProofVideo(null);
  };

  // ── Update views ──────────────────────────────────────────────────────────
  const openUpdateModal = (proof: Proof) => {
    setUpdatingProof(proof);
    setNewViews(String(proof.views || ''));
    setNewUrl(proof.submissionUrl || '');
    setNewImage(null);
    setUpdateModal(true);
  };

  const handleUpdateViews = async () => {
    if (!updatingProof || !submission) return;
    const n = Number(newViews);
    if (!newViews || isNaN(n) || n <= 0)
      return Alert.alert('Enter a valid view count.');
    // For rejected proofs, allow any count (re-submission); for others must exceed verified
    if (updatingProof.status !== 'rejected' && n <= (updatingProof.verifiedViews || 0))
      return Alert.alert('Views must be higher than your last verified count.');

    setUpdating(true);
    try {
      const token = await getToken();
      if (!token) return;
      const form = new FormData();
      form.append('views', String(n));
      if (newUrl.trim()) form.append('submissionUrl', newUrl.trim());
      if (newImage) form.append('proofImage', { uri: newImage.uri, name: newImage.name, type: newImage.type } as any);

      await axios.patch(
        `${API_BASE}/clipping/submissions/${submission._id}/proofs/${updatingProof._id}/update-views`,
        form,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      setUpdateModal(false);
      await load(true);
      Alert.alert('📊 Updated!', 'Proof updated and re-submitted for admin review. You\'ll be credited once approved.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not update proof.');
    } finally {
      setUpdating(false);
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────
  const submittedPlatforms = new Set((submission?.proofs || []).map((p) => p.platform.toLowerCase()));
  const availablePlatforms = (campaign?.platforms || []).filter(
    (pid) => !submittedPlatforms.has(pid.toLowerCase())
  );
  const approvedProofs     = (submission?.proofs || []).filter((p) => p.status === 'approved');
  const totalVerifiedViews = approvedProofs.reduce((s, p) => s + (p.verifiedViews || 0), 0);
  const totalEarned        = approvedProofs.reduce((s, p) => s + (p.rewardAmount || 0), 0);
  const pendingProofsCount = (submission?.proofs || []).filter((p) => p.status === 'pending').length;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7' }}>
        <Text style={{ color: '#6B7280' }}>Campaign not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#FF6B35', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const clipperCpm = getClipperCpm(campaign);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      {/* ── Header ── */}
      <LinearGradient colors={['#f25015', '#e23c00', '#FF6B35']} style={S.gradHdr}>
        <View style={S.navRow}>
          <TouchableOpacity style={S.navBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={S.navTitle} numberOfLines={1}>{campaign.title}</Text>
            <Text style={S.navSub}>Clipping Campaign</Text>
          </View>
          <TouchableOpacity style={S.navBtn} onPress={() => load(false)}>
            <Ionicons name="refresh-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Earnings summary */}
        <View style={S.earningsRow}>
          <View style={S.earnCell}>
            <Text style={S.earnVal}>{fmtMoney(totalEarned, campaign.currency)}</Text>
            <Text style={S.earnLbl}>Total Earned</Text>
          </View>
          <View style={S.earnDivider} />
          <View style={S.earnCell}>
            <Text style={S.earnVal}>{totalVerifiedViews.toLocaleString()}</Text>
            <Text style={S.earnLbl}>Verified Views</Text>
          </View>
          <View style={S.earnDivider} />
          <View style={S.earnCell}>
            <Text style={S.earnVal}>{pendingProofsCount}</Text>
            <Text style={S.earnLbl}>Pending Review</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#FF6B35" />
        }
      >
        {/* Campaign info */}
        <View style={S.card}>
          <Text style={S.cardLabel}>SOURCE VIDEO</Text>
          <TouchableOpacity style={S.videoBtn}
            onPress={() => Linking.openURL(campaign.videoUrl).catch(() => Alert.alert('Error', 'Could not open video.'))}>
            <View style={S.videoIcon}>
              <MaterialCommunityIcons name="play" size={22} color="#FF6B35" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.videoBtnTitle}>Watch Source Video</Text>
              <Text style={S.videoBtnSub} numberOfLines={1}>{campaign.videoUrl}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* FIX: show clipper earning rate (40%), not advertiser rate */}
          <View style={S.infoRow}>
            <InfoPill icon="trending-up" label={`You earn ${fmtMoney(clipperCpm, campaign.currency)} per 1K views`} green />
            <InfoPill icon="eye-outline" label={`${(campaign.estimatedViews / 1000).toFixed(0)}K target`} />
          </View>
        </View>

        {/* Directions */}
        {campaign.directions?.length > 0 && (
          <View style={S.card}>
            <Text style={S.cardLabel}>EDITING DIRECTIONS</Text>
            {campaign.directions.map((d, i) => (
              <View key={i} style={S.bulletRow}>
                <View style={S.bulletDot} />
                <Text style={S.bulletTxt}>{d}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Hashtags */}
        {campaign.hashtags?.length > 0 && (
          <View style={S.card}>
            <Text style={S.cardLabel}>REQUIRED HASHTAGS</Text>
            <View style={S.chipRow}>
              {campaign.hashtags.map((tag, i) => (
                <View key={i} style={S.tagChip}>
                  <Text style={S.tagChipTxt}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Submit new proof CTA */}
        {availablePlatforms.length > 0 && (
          <TouchableOpacity style={S.submitCta} onPress={() => { resetSubmitForm(); setSubmitModal(true); }}>
            <View style={S.submitCtaIcon}>
              <Ionicons name="add-circle-outline" size={26} color="#FF6B35" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.submitCtaTitle}>Submit a New Proof</Text>
              <Text style={S.submitCtaSub}>
                {availablePlatforms.length} platform{availablePlatforms.length > 1 ? 's' : ''} available
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF6B35" />
          </TouchableOpacity>
        )}

        {/* Existing proofs */}
        {(submission?.proofs || []).length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={S.sectionHdr}>Your Submissions</Text>
            {submission!.proofs.map((proof) => (
              <ProofCard
                key={proof._id}
                proof={proof}
                currency={campaign.currency}
                clipperCpm={clipperCpm}
                onUpdate={() => openUpdateModal(proof)}
              />
            ))}
          </View>
        )}

        {(submission?.proofs || []).length === 0 && (
          <View style={S.noProofsBox}>
            <MaterialCommunityIcons name="cloud-upload-outline" size={52} color="#D1D5DB" />
            <Text style={S.noProofsTitle}>No proofs yet</Text>
            <Text style={S.noProofsSub}>
              Post the video on your platforms and come back here to submit your proof link.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Submit Proof Modal ── */}
      <Modal animationType="slide" transparent visible={submitModal} onRequestClose={() => setSubmitModal(false)}>
        <View style={S.overlay}>
          <View style={S.sheet}>
            <View style={S.handle} />
            <View style={S.mHdr}>
              <TouchableOpacity style={S.mClose} onPress={() => setSubmitModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
              <Text style={S.mHdrTxt}>Submit Proof</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={S.fieldLabel}>Select Platform *</Text>
              <View style={S.chipRow}>
                {availablePlatforms.map((pid) => {
                  const p = platformInfo(pid);
                  const on = selPlatform === pid;
                  return (
                    <TouchableOpacity key={pid} style={[S.pChip, on && S.pChipOn]} onPress={() => setSelPlatform(pid)}>
                      <Ionicons name={p.icon as any} size={16} color={on ? '#FF6B35' : '#6B7280'} />
                      <Text style={[S.pChipTxt, on && { color: '#FF6B35', fontWeight: '700' }]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selPlatform && (
                <>
                  {platformInfo(selPlatform).needsUrl && (
                    <>
                      <Text style={[S.fieldLabel, { marginTop: 16 }]}>Post URL *</Text>
                      <TextInput
                        style={S.input} placeholder="https://..." placeholderTextColor="#9CA3AF"
                        value={postUrl} onChangeText={setPostUrl} autoCapitalize="none" keyboardType="url"
                      />
                    </>
                  )}

                  <Text style={[S.fieldLabel, { marginTop: 16 }]}>
                    Current View Count {platformInfo(selPlatform).needsUrl ? '(optional)' : '*'}
                  </Text>
                  <TextInput
                    style={S.input} placeholder="e.g. 1500" placeholderTextColor="#9CA3AF"
                    value={viewCount} onChangeText={setViewCount} keyboardType="numeric"
                  />

                  <Text style={[S.fieldLabel, { marginTop: 16 }]}>
                    {platformInfo(selPlatform).needsUrl
                      ? 'Screenshot (optional but helps approval speed)'
                      : 'Screenshot / Video Proof *'}
                  </Text>
                  <View style={S.uploadRow}>
                    <TouchableOpacity style={S.uploadBtn} onPress={() => pickImage(setProofImage)}>
                      <Ionicons name="image-outline" size={22} color="#FF6B35" />
                      <Text style={S.uploadBtnTxt}>{proofImage ? '✓ Image attached' : 'Pick Screenshot'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={S.uploadBtn} onPress={() => pickVideo(setProofVideo)}>
                      <Ionicons name="videocam-outline" size={22} color="#FF6B35" />
                      <Text style={S.uploadBtnTxt}>{proofVideo ? '✓ Video attached' : 'Pick Video'}</Text>
                    </TouchableOpacity>
                  </View>

                  {proofImage && (
                    <View style={S.previewRow}>
                      <Image source={{ uri: proofImage.uri }} style={S.previewThumb} resizeMode="cover" />
                      <Text style={S.previewName} numberOfLines={1}>{proofImage.name}</Text>
                      <TouchableOpacity onPress={() => setProofImage(null)}>
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {proofVideo && (
                    <View style={S.previewRow}>
                      <Ionicons name="film-outline" size={32} color="#6B7280" />
                      <Text style={S.previewName} numberOfLines={1}>{proofVideo.name}</Text>
                      <TouchableOpacity onPress={() => setProofVideo(null)}>
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={S.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
                    <Text style={S.infoBoxTxt}>
                      After admin approves your proof, earnings are credited to your wallet instantly.
                      You can update view counts later as they grow for additional rewards.
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={{ padding: 18, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
              <TouchableOpacity
                style={[S.bigBtn, (!selPlatform || submitting) && { opacity: 0.55 }]}
                onPress={handleSubmitProof} disabled={!selPlatform || submitting}
              >
                {submitting ? <ActivityIndicator color="#FFF" /> : (
                  <><Text style={S.bigBtnTxt}>Submit Proof</Text><Ionicons name="cloud-upload-outline" size={18} color="#FFF" /></>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Update Views Modal ── */}
      <Modal animationType="slide" transparent visible={updateModal} onRequestClose={() => setUpdateModal(false)}>
        <View style={S.overlay}>
          <View style={[S.sheet, { maxHeight: '82%' }]}>
            <View style={S.handle} />
            <View style={S.mHdr}>
              <TouchableOpacity style={S.mClose} onPress={() => setUpdateModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
              <Text style={S.mHdrTxt}>
                {updatingProof?.status === 'rejected' ? 'Resubmit Proof' : 'Update View Count'}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            {updatingProof && (
              <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                {/* Rejection notice banner */}
                {updatingProof.status === 'rejected' && (
                  <View style={S.rejectedBanner}>
                    <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={S.rejectedBannerTitle}>Proof was rejected</Text>
                      {updatingProof.adminNote ? (
                        <Text style={S.rejectedBannerNote}>Admin: "{updatingProof.adminNote}"</Text>
                      ) : null}
                      <Text style={S.rejectedBannerHint}>
                        Fix the issue above, update your view count & proof, then resubmit.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Current status box */}
                <View style={S.updateInfoBox}>
                  <Row label="Platform" val={updatingProof.platform} />
                  <Row label="Last Verified Views" val={(updatingProof.verifiedViews || 0).toLocaleString()} valGreen />
                  <Row
                    label="Earned So Far"
                    val={campaign ? fmtMoney(updatingProof.rewardAmount || 0, campaign.currency) : '—'}
                    valOrange
                    last
                  />
                </View>

                {/* New view count */}
                <Text style={S.fieldLabel}>
                  {updatingProof.status === 'rejected' ? 'Your Current View Count *' : 'New View Count *'}
                </Text>
                <TextInput
                  style={S.input}
                  placeholder={
                    updatingProof.status === 'rejected'
                      ? 'Enter your current view count'
                      : `Must be > ${(updatingProof.verifiedViews || 0).toLocaleString()}`
                  }
                  placeholderTextColor="#9CA3AF"
                  value={newViews}
                  onChangeText={setNewViews}
                  keyboardType="numeric"
                  autoFocus
                />

                {/* Optional URL update */}
                <>
                  <Text style={[S.fieldLabel, { marginTop: 16 }]}>
                    {updatingProof.status === 'rejected' ? 'Post URL *' : 'Post URL (optional update)'}
                  </Text>
                  <TextInput
                    style={S.input}
                    placeholder="https://..."
                    placeholderTextColor="#9CA3AF"
                    value={newUrl}
                    onChangeText={setNewUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </>

                {/* New screenshot */}
                <Text style={[S.fieldLabel, { marginTop: 16 }]}>
                  {updatingProof.status === 'rejected'
                    ? 'New Screenshot / Proof *'
                    : 'New Screenshot (recommended)'}
                </Text>
                <TouchableOpacity
                  style={[S.uploadBtn, { width: '100%', justifyContent: 'center' }]}
                  onPress={() => pickImage(setNewImage)}
                >
                  <Ionicons name="image-outline" size={22} color="#FF6B35" />
                  <Text style={S.uploadBtnTxt}>{newImage ? '✓ Screenshot attached' : 'Attach Screenshot'}</Text>
                </TouchableOpacity>
                {newImage && (
                  <View style={[S.previewRow, { marginTop: 10 }]}>
                    <Image source={{ uri: newImage.uri }} style={S.previewThumb} resizeMode="cover" />
                    <Text style={S.previewName} numberOfLines={1}>{newImage.name}</Text>
                    <TouchableOpacity onPress={() => setNewImage(null)}>
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* FIX: Estimated earnings uses clipperCpm (40%) not costPerThousand */}
                {newViews && !isNaN(Number(newViews)) && campaign && (
                  <View style={S.estimateBox}>
                    <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>
                      {updatingProof.status === 'rejected'
                        ? 'Estimated Earnings on Approval'
                        : 'Estimated Additional Earnings'}
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#10B981', marginTop: 4 }}>
                      {fmtMoney(
                        Math.max(
                          0,
                          updatingProof.status === 'rejected'
                            // Rejected: estimate based on total views (re-review from 0)
                            ? (Number(newViews) * clipperCpm) / 1000
                            // Approved/pending: incremental only
                            : ((Number(newViews) - (updatingProof.verifiedViews || 0)) * clipperCpm) / 1000
                        ),
                        campaign.currency
                      )}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      At your rate of {fmtMoney(clipperCpm, campaign.currency)} per 1,000 views (your 40% share)
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={{ padding: 18, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
              <TouchableOpacity
                style={[S.bigBtn, updating && { opacity: 0.55 },
                  updatingProof?.status === 'rejected' && { backgroundColor: '#EF4444' }]}
                onPress={handleUpdateViews} disabled={updating}
              >
                {updating ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Text style={S.bigBtnTxt}>
                      {updatingProof?.status === 'rejected' ? 'Resubmit for Review' : 'Update View Count'}
                    </Text>
                    <Ionicons
                      name={updatingProof?.status === 'rejected' ? 'refresh-circle-outline' : 'trending-up-outline'}
                      size={18} color="#FFF"
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── ProofCard ────────────────────────────────────────────────────────────────
// FIX: Update button shown for ALL statuses (rejected proofs can be resubmitted)
function ProofCard({
  proof, currency, clipperCpm, onUpdate,
}: {
  proof: Proof; currency: 'NGN' | 'USDT'; clipperCpm: number; onUpdate: () => void;
}) {
  const cfg   = STATUS_CONFIG[proof.status] || STATUS_CONFIG.pending;
  const pInfo = platformInfo(proof.platform);

  return (
    <View style={S.proofCard}>
      {/* Platform + status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={S.proofIconWrap}>
          <Ionicons name={pInfo.icon as any} size={20} color="#FF6B35" />
        </View>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: '#1F2937', marginLeft: 10 }}>
          {pInfo.label}
        </Text>
        <View style={[S.statusBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
          <Text style={[S.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={S.proofStats}>
        <ProofStat label="Submitted Views"  val={(proof.views || 0).toLocaleString()} />
        <ProofStat label="Verified Views"   val={(proof.verifiedViews || 0).toLocaleString()} highlight={!!proof.verifiedViews} />
        <ProofStat label="Earned"           val={currency ? `${currency === 'NGN' ? '₦' : '$'}${(proof.rewardAmount || 0).toLocaleString()}` : '—'} highlight={!!proof.rewardAmount} />
      </View>

      {/* URL */}
      {proof.submissionUrl && (
        <TouchableOpacity style={S.proofUrlRow}
          onPress={() => Linking.openURL(proof.submissionUrl!).catch(() => {})}>
          <Ionicons name="link-outline" size={14} color="#6B7280" />
          <Text style={S.proofUrl} numberOfLines={1}>{proof.submissionUrl}</Text>
          <Ionicons name="open-outline" size={14} color="#9CA3AF" />
        </TouchableOpacity>
      )}

      {/* Admin note — always shown when present */}
      {proof.adminNote ? (
        <View style={[S.adminNote, proof.status === 'rejected' && S.adminNoteRejected]}>
          <Ionicons
            name={proof.status === 'rejected' ? 'alert-circle-outline' : 'chatbubble-outline'}
            size={14}
            color={proof.status === 'rejected' ? '#DC2626' : '#6B7280'}
          />
          <Text style={[S.adminNoteTxt, proof.status === 'rejected' && { color: '#DC2626' }]}>
            {proof.status === 'rejected' ? `Rejection reason: ${proof.adminNote}` : proof.adminNote}
          </Text>
        </View>
      ) : null}

      {/* FIX: Update/Resubmit button always shown — rejection doesn't block updates */}
      {proof.status === 'rejected' ? (
        <TouchableOpacity style={S.resubmitBtn} onPress={onUpdate}>
          <Ionicons name="refresh-circle-outline" size={16} color="#FFF" />
          <Text style={S.resubmitBtnTxt}>Fix & Resubmit</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={S.updateBtn} onPress={onUpdate}>
          <Ionicons name="trending-up-outline" size={16} color="#FF6B35" />
          <Text style={S.updateBtnTxt}>
            {proof.status === 'pending' ? 'Update Views' : 'Update Views'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function ProofStat({ label, val, highlight = false }: { label: string; val: string; highlight?: boolean }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: highlight ? '#10B981' : '#1F2937', marginTop: 2 }}>{val}</Text>
    </View>
  );
}

function InfoPill({ icon, label, green = false }: { icon: string; label: string; green?: boolean }) {
  return (
    <View style={[S.infoPill, green && { backgroundColor: '#ECFDF5' }]}>
      <Ionicons name={icon as any} size={14} color={green ? '#10B981' : '#FF6B35'} />
      <Text style={[S.infoPillTxt, green && { color: '#059669', fontWeight: '600' }]}>{label}</Text>
    </View>
  );
}

function Row({
  label, val, valGreen = false, valOrange = false, last = false,
}: { label: string; val: string; valGreen?: boolean; valOrange?: boolean; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: last ? 0 : 8 }}>
      <Text style={{ fontSize: 13, color: '#6B7280' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: valGreen ? '#10B981' : valOrange ? '#FF6B35' : '#1F2937' }}>
        {val}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  gradHdr:      { paddingTop: 6, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  navRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 16 },
  navBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  navTitle:     { fontSize: 16, fontWeight: '700', color: '#FFF' },
  navSub:       { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  earningsRow:  { flexDirection: 'row', marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 14 },
  earnCell:     { flex: 1, alignItems: 'center' },
  earnVal:      { fontSize: 16, fontWeight: '800', color: '#FFF' },
  earnLbl:      { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  earnDivider:  { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },

  card:         { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardLabel:    { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12 },
  videoBtn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2E9', borderRadius: 12, padding: 14, marginBottom: 12 },
  videoIcon:    { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: '#FF6B35', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  videoBtnTitle:{ fontSize: 14, fontWeight: '700', color: '#FF6B35' },
  videoBtnSub:  { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  infoRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  infoPill:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  infoPillTxt:  { fontSize: 12, color: '#4B5563' },
  bulletRow:    { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' },
  bulletDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B35', marginTop: 7, marginRight: 10 },
  bulletTxt:    { flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 20 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip:      { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tagChipTxt:   { fontSize: 13, color: '#3B82F6', fontWeight: '500' },
  sectionHdr:   { fontSize: 13, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5, marginBottom: 10 },

  submitCta:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#FF6B35', borderStyle: 'dashed', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, elevation: 1 },
  submitCtaIcon:{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2E9', justifyContent: 'center', alignItems: 'center' },
  submitCtaTitle:{ fontSize: 15, fontWeight: '700', color: '#FF6B35' },
  submitCtaSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  noProofsBox:  { alignItems: 'center', paddingVertical: 40, gap: 10 },
  noProofsTitle:{ fontSize: 16, fontWeight: '600', color: '#374151' },
  noProofsSub:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },

  proofCard:    { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  proofIconWrap:{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF2E9', justifyContent: 'center', alignItems: 'center' },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 },
  statusTxt:    { fontSize: 11, fontWeight: '600' },
  proofStats:   { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 12 },
  proofUrlRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10, gap: 6, marginBottom: 8 },
  proofUrl:     { flex: 1, fontSize: 12, color: '#6B7280' },
  adminNote:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF7ED', borderRadius: 8, padding: 10, gap: 6, marginBottom: 8 },
  adminNoteRejected: { backgroundColor: '#FEF2F2' },
  adminNoteTxt: { flex: 1, fontSize: 12, color: '#92400E' },

  // FIX: separate styles for update (orange) and resubmit (red) buttons
  updateBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2E9', borderRadius: 10, paddingVertical: 10, gap: 6, marginTop: 4 },
  updateBtnTxt: { fontSize: 14, fontWeight: '600', color: '#FF6B35' },
  resubmitBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', borderRadius: 10, paddingVertical: 10, gap: 6, marginTop: 4 },
  resubmitBtnTxt:{ fontSize: 14, fontWeight: '600', color: '#FFF' },

  // Modal
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '94%' },
  handle:          { width: 42, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2 },
  mHdr:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  mHdrTxt:         { fontSize: 17, fontWeight: '700', color: '#111827' },
  mClose:          { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  fieldLabel:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input:           { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F2937', backgroundColor: '#FAFAFA' },
  pChip:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  pChipOn:         { backgroundColor: '#FEF2E9', borderWidth: 1.5, borderColor: '#FF6B35' },
  pChipTxt:        { fontSize: 13, color: '#6B7280' },
  uploadRow:       { flexDirection: 'row', gap: 10 },
  uploadBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2E9', borderRadius: 12, paddingVertical: 12, gap: 8, borderWidth: 1, borderColor: '#FDBA74', borderStyle: 'dashed' },
  uploadBtnTxt:    { fontSize: 13, color: '#FF6B35', fontWeight: '500' },
  previewRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, marginTop: 8, gap: 10 },
  previewThumb:    { width: 50, height: 50, borderRadius: 8 },
  previewName:     { flex: 1, fontSize: 12, color: '#4B5563' },
  infoBox:         { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, gap: 10, marginTop: 16, marginBottom: 8 },
  infoBoxTxt:      { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  updateInfoBox:   { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16 },
  estimateBox:     { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 8, alignItems: 'center' },
  bigBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B35', borderRadius: 14, paddingVertical: 15, gap: 10 },
  bigBtnTxt:       { fontSize: 16, fontWeight: '700', color: '#FFF' },
  rejectedBanner:  { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, padding: 14, marginBottom: 16 },
  rejectedBannerTitle: { fontSize: 13, fontWeight: '700', color: '#DC2626', marginBottom: 4 },
  rejectedBannerNote:  { fontSize: 12, color: '#B91C1C', marginBottom: 4, fontStyle: 'italic' },
  rejectedBannerHint:  { fontSize: 12, color: '#6B7280' },
});
