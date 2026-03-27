// app/(dashboard_advertiser)/review-submission/[campaignId].tsx
//
// FIXES in this version:
//  1. Revision count now reads from Application.revisionCount (source of truth)
//     not Campaign.videoSubmissions[].revisionCount (never updated on revision)
//  2. Dispute feature added — either party can raise a dispute, admin is notified
//  3. After 3 revisions, Request Revision hidden; must Approve or Dispute
//  4. Auto-payment still runs if advertiser does nothing (handled by expirationChecker)
//  5. Full null-guard on applicationId — if the Application document was deleted
//     from the DB, the populated field comes back null. Every access is now safe.
//
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator,
  Alert, StyleSheet, TextInput, Dimensions, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

const fmtDate = (d?: string) =>
  !d ? '—' : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const fmtDateShort = (d?: string) =>
  !d ? '—' : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

type ApplicationRef = {
  _id: string;
  proposedRateNGN?: number;
  proposedRateUSDT?: number;
  paymentCurrency?: 'NGN' | 'USDT';
  paymentAmount?: number;
  revisionCount: number;
  status?: string;
  disputeRaised?: boolean;
} | null; // ← explicitly typed as nullable

type VideoSubmission = {
  _id: string;
  applicationId: ApplicationRef;
  clipperId: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
    rating: number;
  } | null; // ← also nullable if user deleted
  videoUrl: string;
  thumbnailUrl: string;
  submissionDate: string;
  status: 'pending_review' | 'approved' | 'revision_requested';
  revisionCount: number;
  feedback: Array<{ message: string; createdAt: string }>;
  approvedAt?: string;
};

type CampaignData = {
  _id: string;
  title: string;
  description: string;
  script?: string;
  category: string;
  status: string;
  paymentAmount?: number;
  paymentCurrency?: 'NGN' | 'USDT';
  videoSubmissions: VideoSubmission[];
  selectedClipper?: {
    _id: string; firstName: string; lastName: string;
    profileImage: string | null; rating: number;
  } | null;
  finalVideo?: { url: string; thumbnailUrl?: string; approvedAt: string };
};

const SUB_STATUS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending_review:    { label: 'Awaiting Review', color: '#4F46E5', bg: '#EEF2FF', icon: 'time-outline'             },
  approved:          { label: 'Approved ✓',      color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle-outline' },
  revision_requested:{ label: 'Revision Sent',   color: '#D97706', bg: '#FFFBEB', icon: 'refresh-outline'          },
};

// ─── Safe accessor helpers ────────────────────────────────────────────────────
// These prevent crashes when applicationId or clipperId is null in any submission.

/** Safely read revisionCount from the Application ref. Falls back to the
 *  Campaign subdoc value, then 0. Never throws on null. */
const safeRevisionCount = (sub: VideoSubmission): number =>
  sub.applicationId?.revisionCount ?? sub.revisionCount ?? 0;

/** Safely read applicationId._id. Returns null if applicationId is null. */
const safeAppId = (sub: VideoSubmission | null | undefined): string | null =>
  sub?.applicationId?._id ?? null;

/** Safely read payment info from the Application ref. */
const safePayment = (sub: VideoSubmission | null | undefined) => ({
  currency: sub?.applicationId?.paymentCurrency ?? null,
  amount:   sub?.applicationId?.paymentAmount   ?? null,
  symbol:   sub?.applicationId?.paymentCurrency === 'NGN' ? '₦' : '$',
});

/** Returns true if ANY submission has a disputed application or flag. */
const isAnyDisputed = (subs: VideoSubmission[]): boolean =>
  subs.some(s => s.applicationId?.status === 'disputed' || s.applicationId?.disputeRaised);

export default function ReviewSubmissionScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router         = useRouter();
  const videoRef       = useRef<Video>(null);

  const [campaign, setCampaign]     = useState<CampaignData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<VideoSubmission | null>(null);

  // Video player
  const [videoModal, setVideoModal] = useState(false);
  const [videoUrl, setVideoUrl]     = useState<string | null>(null);

  // Revision
  const [revModal, setRevModal]     = useState(false);
  const [feedback, setFeedback]     = useState('');
  const [sendingRev, setSendingRev] = useState(false);

  // Approve
  const [approveModal, setApproveModal] = useState(false);
  const [approving, setApproving]       = useState(false);

  // Dispute
  const [disputeModal, setDisputeModal]     = useState(false);
  const [disputeReason, setDisputeReason]   = useState('');
  const [raisingDispute, setRaisingDispute] = useState(false);

  // Result modal
  const [doneModal, setDoneModal] = useState(false);
  const [doneMsg, setDoneMsg]     = useState('');
  const [doneType, setDoneType]   = useState<'approve' | 'revision' | 'dispute'>('approve');

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.replace('/(auth)/login'); return; }
      const res  = await fetch(`${API_URL}/campaigns/${campaignId}/with-submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setCampaign(data.campaign);
      const pending = data.campaign.videoSubmissions?.find(
        (s: VideoSubmission) => s.status === 'pending_review'
      );
      if (pending) setSelected(pending);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load campaign');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (campaignId) load(); }, [campaignId]);

  // ── Video ───────────────────────────────────────────────────────────────────
  const openVideo = (url: string) => {
    const full = toUrl(url);
    if (full) { setVideoUrl(full); setVideoModal(true); }
  };
  const closeVideo = async () => {
    try { await videoRef.current?.pauseAsync(); await videoRef.current?.unloadAsync(); } catch (_) {}
    setVideoModal(false); setVideoUrl(null);
  };

  // ── Revision ────────────────────────────────────────────────────────────────
  const handleRevision = async () => {
    if (!feedback.trim()) { Alert.alert('Required', 'Please describe what needs to change.'); return; }
    if (!selected) return;
    const appId = safeAppId(selected);
    if (!appId) { Alert.alert('Error', 'Application reference is missing. Please reload.'); return; }

    setSendingRev(true);
    try {
      const token = await getToken();
      const res   = await fetch(`${API_URL}/applications/${appId}/revision`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setRevModal(false); setFeedback('');
      setDoneType('revision');
      setDoneMsg('Revision request sent! The creator has been notified with your feedback and has 48 hours to resubmit.');
      setDoneModal(true);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send revision');
    } finally { setSendingRev(false); }
  };

  // ── Approve ─────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selected) return;
    const appId = safeAppId(selected);
    if (!appId) { Alert.alert('Error', 'Application reference is missing. Please reload.'); return; }

    setApproving(true);
    try {
      const token = await getToken();
      const res   = await fetch(`${API_URL}/applications/${appId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const pay   = safePayment(selected);
      const amt   = pay.amount ? `${pay.symbol}${pay.amount.toLocaleString()} ${pay.currency}` : 'the agreed amount';
      setApproveModal(false);
      setDoneType('approve');
      setDoneMsg(`Payment of ${amt} has been released to the creator. Your campaign is now complete!`);
      setDoneModal(true);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Approval failed');
    } finally { setApproving(false); }
  };

  // ── Dispute ─────────────────────────────────────────────────────────────────
  const handleDispute = async () => {
    if (!disputeReason.trim()) { Alert.alert('Required', 'Please describe the issue.'); return; }
    const appId = safeAppId(pendingSub);
    if (!appId) { Alert.alert('Error', 'Application reference is missing. Please reload.'); return; }

    setRaisingDispute(true);
    try {
      const token = await getToken();
      const res   = await fetch(`${API_URL}/applications/${appId}/dispute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setDisputeModal(false); setDisputeReason('');
      setDoneType('dispute');
      setDoneMsg('Your dispute has been raised. Our admin team will review within 24-48 hours and contact both you and the creator to resolve it. Escrow is frozen until resolved.');
      setDoneModal(true);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to raise dispute');
    } finally { setRaisingDispute(false); }
  };

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={{ color: '#9CA3AF', marginTop: 10 }}>Loading submission…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView style={S.safe}>
        <View style={S.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={S.errTxt}>Campaign not found</Text>
          <TouchableOpacity style={S.goBack} onPress={() => router.back()}>
            <Text style={{ color: '#FFF', fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pendingSub  = campaign.videoSubmissions?.find(s => s.status === 'pending_review') ?? null;
  const isCompleted = !!campaign.finalVideo || campaign.status === 'completed';
  const isDisputed  = isAnyDisputed(campaign.videoSubmissions ?? []);

  // SAFE: use helper — never crashes if applicationId is null
  const realRevisionCount = safeRevisionCount(pendingSub ?? { revisionCount: 0 } as VideoSubmission);
  const revisionsLeft     = Math.max(0, 3 - realRevisionCount);

  // Payment display — safe even if applicationId is null
  const pay       = safePayment(selected);
  const payAmt    = pay.amount    ?? campaign.paymentAmount;
  const payCur    = pay.currency  ?? campaign.paymentCurrency;
  const paySymbol = payCur === 'NGN' ? '₦' : '$';

  const clipper     = campaign.selectedClipper ?? selected?.clipperId ?? null;
  const clipperName = clipper ? `${clipper.firstName} ${clipper.lastName}` : 'Creator';

  return (
    <SafeAreaView style={S.safe}>

      {/* ── Header ── */}
      <LinearGradient colors={['#312E81','#4338CA','#4F46E5']} style={S.header}>
        <TouchableOpacity style={S.hdrBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={S.hdrTitle} numberOfLines={1}>{campaign.title}</Text>
          <Text style={S.hdrSub}>{campaign.category} · Review Submission</Text>
        </View>
        {isCompleted ? (
          <View style={S.completedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#6EE7B7" />
            <Text style={S.completedBadgeTxt}>Done</Text>
          </View>
        ) : isDisputed ? (
          <View style={S.disputedBadge}>
            <Ionicons name="warning" size={14} color="#FCA5A5" />
            <Text style={S.disputedBadgeTxt}>Disputed</Text>
          </View>
        ) : (
          <View style={S.pendingBadge}>
            <Ionicons name="eye-outline" size={14} color="#FCD34D" />
            <Text style={S.pendingBadgeTxt}>Review</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Completed banner ── */}
        {isCompleted && campaign.finalVideo && (
          <View style={S.completedBanner}>
            <View style={S.completedBannerIcon}>
              <Ionicons name="trophy" size={28} color="#FCD34D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.completedBannerTitle}>Campaign Completed!</Text>
              <Text style={S.completedBannerSub}>Approved {fmtDateShort(campaign.finalVideo.approvedAt)}</Text>
            </View>
            <TouchableOpacity style={S.watchFinalBtn} onPress={() => openVideo(campaign.finalVideo!.url)}>
              <Ionicons name="play-circle" size={18} color="#4F46E5" />
              <Text style={S.watchFinalTxt}>Watch</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Disputed banner ── */}
        {isDisputed && (
          <View style={S.disputedBanner}>
            <Ionicons name="warning" size={22} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={S.disputedBannerTitle}>Dispute In Progress</Text>
              <Text style={S.disputedBannerSub}>Our admin team will contact both parties within 24-48 hours. Escrow is frozen.</Text>
            </View>
          </View>
        )}

        {/* ── Creator card ── */}
        {clipper && (
          <View style={S.creatorCard}>
            <View style={S.creatorAvatar}>
              {toUrl(clipper.profileImage) ? (
                <Image source={{ uri: toUrl(clipper.profileImage)! }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : (
                <Text style={S.creatorInitials}>{clipper.firstName?.[0]}{clipper.lastName?.[0]}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.creatorName}>{clipperName}</Text>
              <View style={S.ratingRow}>
                <Ionicons name="star" size={13} color="#FBBF24" />
                <Text style={S.ratingTxt}>{(clipper.rating || 0).toFixed(1)} rating</Text>
              </View>
            </View>
            {payAmt && (
              <View style={S.payPill}>
                <Text style={S.payPillLbl}>Escrow</Text>
                <Text style={S.payPillAmt}>{paySymbol}{payAmt?.toLocaleString()}</Text>
                <Text style={S.payPillCur}>{payCur}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Campaign brief ── */}
        <View style={S.briefCard}>
          <Text style={S.briefTitle}>Campaign Brief</Text>
          <Text style={S.briefDesc} numberOfLines={4}>{campaign.description}</Text>
          {campaign.script && (
            <View style={S.scriptBox}>
              <Text style={S.scriptLbl}>Script</Text>
              <Text style={S.scriptTxt} numberOfLines={5}>{campaign.script}</Text>
            </View>
          )}
        </View>

        {/* ── Submissions ── */}
        {!campaign.videoSubmissions?.length ? (
          <View style={S.emptyBox}>
            <MaterialCommunityIcons name="video-off-outline" size={56} color="#D1D5DB" />
            <Text style={S.emptyTitle}>No videos submitted yet</Text>
            <Text style={S.emptySub}>The creator hasn't uploaded their video yet. You'll be notified when they submit.</Text>
          </View>
        ) : (
          <>
            <Text style={S.subsSectionTitle}>
              {campaign.videoSubmissions.length} Submission{campaign.videoSubmissions.length > 1 ? 's' : ''}
            </Text>

            {campaign.videoSubmissions.map((sub, idx) => {
              const cfg        = SUB_STATUS[sub.status] || SUB_STATUS.pending_review;
              const isSelected = selected?._id === sub._id;
              const vidThumb   = toUrl(sub.thumbnailUrl);
              const isPending  = sub.status === 'pending_review';
              // Safe: use helper — never crashes if applicationId is null
              const subRevCount = safeRevisionCount(sub);

              return (
                <TouchableOpacity
                  key={sub._id}
                  style={[S.subCard, isSelected && S.subCardSelected, sub.status === 'approved' && S.subCardApproved]}
                  onPress={() => setSelected(sub)}
                  activeOpacity={0.88}
                >
                  <View style={S.subCardHdr}>
                    <View style={S.subNum}>
                      <Text style={S.subNumTxt}>{campaign.videoSubmissions.length - idx}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.subDate}>{fmtDate(sub.submissionDate)}</Text>
                      {subRevCount > 0 && (
                        <Text style={S.subRevCount}>Revision #{subRevCount}</Text>
                      )}
                    </View>
                    <View style={[S.statusPill, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                      <Text style={[S.statusPillTxt, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>

                  {/* Video */}
                  <TouchableOpacity style={S.videoBox} onPress={() => openVideo(sub.videoUrl)} activeOpacity={0.85}>
                    {vidThumb ? (
                      <Image source={{ uri: vidThumb }} style={S.videoThumb} resizeMode="cover" />
                    ) : (
                      <View style={S.videoThumbEmpty}>
                        <Ionicons name="videocam" size={36} color="rgba(255,255,255,0.4)" />
                      </View>
                    )}
                    <LinearGradient colors={['transparent','rgba(0,0,0,0.55)']} style={S.videoOverlay}>
                      <View style={S.playCircle}>
                        <Ionicons name="play" size={22} color="#FFF" />
                      </View>
                      <Text style={S.videoTapTxt}>Tap to watch</Text>
                    </LinearGradient>
                    {isPending && (
                      <View style={S.newBadge}><Text style={S.newBadgeTxt}>NEW</Text></View>
                    )}
                  </TouchableOpacity>

                  {/* Feedback history */}
                  {sub.feedback?.length > 0 && (
                    <View style={S.feedbackHistory}>
                      <Text style={S.feedbackHistoryTitle}>Revision Feedback Sent</Text>
                      {sub.feedback.map((fb, i) => (
                        <View key={i} style={S.feedbackItem}>
                          <View style={S.feedbackDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={S.feedbackMsg}>{fb.message}</Text>
                            <Text style={S.feedbackDate}>{fmtDateShort(fb.createdAt)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Escrow line — safe even if applicationId is null */}
                  {sub.applicationId?.paymentAmount && (
                    <View style={S.payLine}>
                      <Ionicons name="lock-closed-outline" size={14} color="#059669" />
                      <Text style={S.payLineTxt}>
                        {sub.applicationId.paymentCurrency === 'NGN' ? '₦' : '$'}{sub.applicationId.paymentAmount.toLocaleString()} {sub.applicationId.paymentCurrency} held in escrow
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── Decision panel ── */}
        {pendingSub && !isCompleted && !isDisputed && (
          <View style={S.actionsWrap}>
            <View style={S.actionsHdr}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#4F46E5" />
              <Text style={S.actionsTitle}>Your Decision</Text>
              <View style={[S.revLeftChip, revisionsLeft === 0 && S.revLeftChipEmpty]}>
                <Text style={[S.revLeftTxt, revisionsLeft === 0 && S.revLeftTxtEmpty]}>
                  {revisionsLeft}/3 revisions left
                </Text>
              </View>
            </View>

            <Text style={S.actionsDesc}>
              {revisionsLeft === 0
                ? "You've used all 3 revisions. You must now approve the video, or raise a dispute if there's a serious issue."
                : 'Watch the video above first. Payment is only released when you approve.'}
            </Text>

            {revisionsLeft === 0 && (
              <View style={S.maxRevWarning}>
                <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
                <Text style={S.maxRevWarningTxt}>
                  Maximum revisions reached. If you don't act within 120 hours, payment is automatically released to the creator.
                </Text>
              </View>
            )}

            {/* Show a warning if applicationId is missing (deleted from DB) */}
            {!pendingSub.applicationId && (
              <View style={S.maxRevWarning}>
                <Ionicons name="warning-outline" size={16} color="#EF4444" />
                <Text style={[S.maxRevWarningTxt, { color: '#B91C1C' }]}>
                  The application record for this submission is no longer available. Please contact support.
                </Text>
              </View>
            )}

            <View style={S.actionBtns}>
              {/* Request Revision — only visible if revisions remain AND applicationId exists */}
              {revisionsLeft > 0 && pendingSub.applicationId && (
                <TouchableOpacity
                  style={S.revBtn}
                  onPress={() => { setSelected(pendingSub); setRevModal(true); }}
                >
                  <Ionicons name="refresh-circle-outline" size={20} color="#D97706" />
                  <Text style={S.revBtnTxt}>Request Revision ({revisionsLeft} left)</Text>
                </TouchableOpacity>
              )}

              {/* Approve & Pay — only if applicationId exists */}
              {pendingSub.applicationId && (
                <TouchableOpacity
                  style={S.approveBtn}
                  onPress={() => { setSelected(pendingSub); setApproveModal(true); }}
                >
                  <LinearGradient colors={['#059669','#047857']} style={S.approveBtnGrad}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={S.approveBtnTxt}>Approve & Pay</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <View style={S.disputeDivider}>
                <View style={S.disputeDividerLine} />
                <Text style={S.disputeDividerTxt}>{"or if there's a serious issue"}</Text>
                <View style={S.disputeDividerLine} />
              </View>

              <TouchableOpacity
                style={S.disputeBtn}
                onPress={() => setDisputeModal(true)}
              >
                <Ionicons name="warning-outline" size={18} color="#EF4444" />
                <Text style={S.disputeBtnTxt}>Raise a Dispute</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* ══════════ Video player modal ══════════ */}
      <Modal visible={videoModal} transparent animationType="fade" onRequestClose={closeVideo}>
        <View style={M.videoBg}>
          <TouchableOpacity style={M.videoClose} onPress={closeVideo}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {videoUrl && (
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={{ width, height: height * 0.65 }}
              useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay
              onError={() => { Alert.alert('Error', 'Could not load video'); closeVideo(); }}
            />
          )}
        </View>
      </Modal>

      {/* ══════════ Revision bottom sheet ══════════ */}
      <Modal visible={revModal} transparent animationType="slide" onRequestClose={() => setRevModal(false)}>
        <View style={M.sheetOverlay}>
          <View style={M.sheet}>
            <View style={M.handle} />
            <View style={M.sheetHdr}>
              <View style={M.sheetIconWrap}>
                <Ionicons name="refresh-circle" size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={M.sheetTitle}>Request Revision</Text>
                <Text style={M.sheetSub}>{revisionsLeft} of 3 revisions remaining after this</Text>
              </View>
              <TouchableOpacity style={M.sheetClose} onPress={() => { setRevModal(false); setFeedback(''); }}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View style={M.tipBox}>
                <Ionicons name="bulb-outline" size={16} color="#D97706" />
                <Text style={M.tipTxt}>Be specific and constructive. The creator will see exactly what you write here and has to resubmit.</Text>
              </View>

              <Text style={M.fieldLbl}>What needs to change? <Text style={{ color: '#EF4444' }}>*</Text></Text>
              <TextInput
                style={[M.textarea, feedback.trim() ? M.textareaFilled : {}]}
                value={feedback}
                onChangeText={setFeedback}
                placeholder="e.g. The energy feels flat — can you reshoot with more enthusiasm? Also please mention the discount code at the 0:15 mark..."
                placeholderTextColor="#9CA3AF"
                multiline numberOfLines={6}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={{ textAlign: 'right', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                {feedback.length} chars
              </Text>

              <View style={M.sheetActions}>
                <TouchableOpacity style={M.cancelBtn} onPress={() => { setRevModal(false); setFeedback(''); }}>
                  <Text style={M.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[M.sendBtn, (!feedback.trim() || sendingRev) && { opacity: 0.5 }]}
                  onPress={handleRevision}
                  disabled={!feedback.trim() || sendingRev}
                >
                  {sendingRev ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <><Ionicons name="send" size={16} color="#FFF" /><Text style={M.sendTxt}>Send Revision</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════ Approve confirmation ══════════ */}
      <Modal visible={approveModal} transparent animationType="fade" onRequestClose={() => setApproveModal(false)}>
        <View style={M.centeredOverlay}>
          <View style={M.confirmCard}>
            <LinearGradient colors={['#ECFDF5','#D1FAE5']} style={M.confirmTop}>
              <View style={M.confirmIconCircle}>
                <Ionicons name="checkmark-circle" size={48} color="#059669" />
              </View>
            </LinearGradient>
            <View style={{ padding: 24 }}>
              <Text style={M.confirmTitle}>Approve This Video?</Text>
              <Text style={M.confirmDesc}>
                This is permanent. Payment will be immediately released to {clipperName}.
              </Text>
              {payAmt && (
                <View style={M.confirmPayBox}>
                  <Text style={M.confirmPayLbl}>Amount to release</Text>
                  <Text style={M.confirmPayAmt}>{paySymbol}{payAmt.toLocaleString()}</Text>
                  <Text style={M.confirmPayCur}>{payCur}</Text>
                </View>
              )}
              <View style={M.confirmBtns}>
                <TouchableOpacity style={M.confirmCancel} onPress={() => setApproveModal(false)}>
                  <Text style={M.confirmCancelTxt}>Not yet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[M.confirmApprove, approving && { opacity: 0.6 }]}
                  onPress={handleApprove} disabled={approving}
                >
                  {approving ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <><Ionicons name="checkmark-circle" size={18} color="#FFF" /><Text style={M.confirmApproveTxt}>Yes, Approve & Pay</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ Dispute bottom sheet ══════════ */}
      <Modal visible={disputeModal} transparent animationType="slide" onRequestClose={() => setDisputeModal(false)}>
        <View style={M.sheetOverlay}>
          <View style={M.sheet}>
            <View style={M.handle} />
            <View style={M.sheetHdr}>
              <View style={[M.sheetIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="warning" size={22} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={M.sheetTitle}>Raise a Dispute</Text>
                <Text style={M.sheetSub}>Admin team reviews within 24-48 hours</Text>
              </View>
              <TouchableOpacity style={M.sheetClose} onPress={() => { setDisputeModal(false); setDisputeReason(''); }}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View style={[M.tipBox, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="information-circle-outline" size={16} color="#EF4444" />
                <Text style={[M.tipTxt, { color: '#B91C1C' }]}>
                  Disputes are handled by our admin team. Escrow is frozen until resolved. Both you and the creator will be contacted.
                </Text>
              </View>

              <Text style={M.fieldLbl}>Describe the issue <Text style={{ color: '#EF4444' }}>*</Text></Text>
              <TextInput
                style={[M.textarea, disputeReason.trim() && { borderColor: '#EF4444' }]}
                value={disputeReason}
                onChangeText={setDisputeReason}
                placeholder="e.g. The creator submitted a completely different product than briefed, despite 3 revision requests with clear instructions..."
                placeholderTextColor="#9CA3AF"
                multiline numberOfLines={5}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={{ textAlign: 'right', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                {disputeReason.length} chars
              </Text>

              <View style={M.sheetActions}>
                <TouchableOpacity style={M.cancelBtn} onPress={() => { setDisputeModal(false); setDisputeReason(''); }}>
                  <Text style={M.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[M.sendBtn, { backgroundColor: '#EF4444' }, (!disputeReason.trim() || raisingDispute) && { opacity: 0.5 }]}
                  onPress={handleDispute}
                  disabled={!disputeReason.trim() || raisingDispute}
                >
                  {raisingDispute ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <><Ionicons name="warning" size={16} color="#FFF" /><Text style={M.sendTxt}>Submit Dispute</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════ Done / result modal ══════════ */}
      <Modal visible={doneModal} transparent animationType="fade" onRequestClose={() => setDoneModal(false)}>
        <View style={M.centeredOverlay}>
          <View style={M.doneCard}>
            {doneType === 'approve' ? (
              <LinearGradient colors={['#059669','#047857']} style={M.doneIcon}>
                <Ionicons name="trophy" size={36} color="#FCD34D" />
              </LinearGradient>
            ) : doneType === 'dispute' ? (
              <LinearGradient colors={['#EF4444','#DC2626']} style={M.doneIcon}>
                <Ionicons name="shield-checkmark" size={36} color="#FFF" />
              </LinearGradient>
            ) : (
              <LinearGradient colors={['#F97316','#EA580C']} style={M.doneIcon}>
                <Ionicons name="refresh" size={36} color="#FFF" />
              </LinearGradient>
            )}

            <Text style={M.doneTitle}>
              {doneType === 'approve' ? '🎉 Campaign Complete!' :
               doneType === 'dispute' ? '⚠️ Dispute Raised' :
               '✉️ Revision Sent'}
            </Text>
            <Text style={M.doneTxt}>{doneMsg}</Text>

            <TouchableOpacity
              style={M.doneBtn}
              onPress={() => {
                setDoneModal(false);
                if (doneType === 'approve') {
                  router.replace('/(dashboard_advertiser)/Campaigns' as any);
                }
              }}
            >
              <Text style={M.doneBtnTxt}>
                {doneType === 'approve' ? 'Back to Campaigns' : 'Got it'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Screen styles ─────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#F5F5F7' },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errTxt:  { fontSize: 16, color: '#EF4444', marginTop: 12, marginBottom: 16 },
  goBack:  { backgroundColor: '#4F46E5', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },

  header:  { paddingTop: 10, marginTop: -30, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  hdrBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  hdrTitle:{ fontSize: 16, fontWeight: '700', color: '#FFF' },
  hdrSub:  { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  completedBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  completedBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#6EE7B7' },
  pendingBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(253,224,71,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pendingBadgeTxt:   { fontSize: 11, fontWeight: '700', color: '#FCD34D' },
  disputedBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  disputedBadgeTxt:  { fontSize: 11, fontWeight: '700', color: '#FCA5A5' },

  completedBanner:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#6EE7B7', borderRadius: 16, padding: 14, marginBottom: 12, gap: 12 },
  completedBannerIcon:  { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  completedBannerTitle: { fontSize: 15, fontWeight: '700', color: '#065F46' },
  completedBannerSub:   { fontSize: 12, color: '#6EE7B7', marginTop: 2 },
  watchFinalBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  watchFinalTxt:        { fontSize: 13, fontWeight: '700', color: '#4F46E5' },

  disputedBanner:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 16, padding: 14, marginBottom: 12, gap: 12 },
  disputedBannerTitle: { fontSize: 14, fontWeight: '700', color: '#B91C1C', marginBottom: 3 },
  disputedBannerSub:   { fontSize: 12, color: '#EF4444', lineHeight: 17 },

  creatorCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 12, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  creatorAvatar:   { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  creatorInitials: { fontSize: 16, fontWeight: '800', color: '#4F46E5' },
  creatorName:     { fontSize: 15, fontWeight: '700', color: '#111827' },
  ratingRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingTxt:       { fontSize: 12, color: '#9CA3AF' },
  payPill:         { alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#6EE7B7' },
  payPillLbl:      { fontSize: 10, color: '#6EE7B7', fontWeight: '600', marginBottom: 1 },
  payPillAmt:      { fontSize: 16, fontWeight: '800', color: '#059669' },
  payPillCur:      { fontSize: 10, color: '#059669', fontWeight: '600' },

  briefCard:  { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  briefTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  briefDesc:  { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  scriptBox:  { backgroundColor: '#F5F3FF', borderRadius: 10, padding: 12, marginTop: 12 },
  scriptLbl:  { fontSize: 11, fontWeight: '700', color: '#7C3AED', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  scriptTxt:  { fontSize: 13, color: '#5B21B6', lineHeight: 19 },

  subsSectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  subCard:          { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  subCardSelected:  { borderColor: '#4F46E5' },
  subCardApproved:  { borderColor: '#6EE7B7' },
  subCardHdr:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  subNum:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  subNumTxt:    { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  subDate:      { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  subRevCount:  { fontSize: 11, color: '#F97316', fontWeight: '600', marginTop: 1 },
  statusPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  statusPillTxt:{ fontSize: 11, fontWeight: '700' },
  videoBox:       { marginHorizontal: 14, marginBottom: 14, height: 196, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0F172A' },
  videoThumb:     { width: '100%', height: '100%', position: 'absolute' },
  videoThumbEmpty:{ width: '100%', height: '100%', backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  videoOverlay:   { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 18, gap: 6 },
  playCircle:     { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)' },
  videoTapTxt:    { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  newBadge:       { position: 'absolute', top: 10, left: 10, backgroundColor: '#4F46E5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  newBadgeTxt:    { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  feedbackHistory:      { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  feedbackHistoryTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  feedbackItem:         { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  feedbackDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F97316', marginTop: 5 },
  feedbackMsg:          { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
  feedbackDate:         { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  payLine:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', marginHorizontal: 14, marginBottom: 14, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  payLineTxt: { fontSize: 13, fontWeight: '600', color: '#065F46' },

  emptyBox:   { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  emptySub:   { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 20 },

  actionsWrap:      { backgroundColor: '#FFF', borderRadius: 18, padding: 18, marginTop: 4 },
  actionsHdr:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  actionsTitle:     { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  revLeftChip:      { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  revLeftChipEmpty: { backgroundColor: '#FEF2F2' },
  revLeftTxt:       { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  revLeftTxtEmpty:  { color: '#EF4444' },
  actionsDesc:      { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 12 },
  maxRevWarning:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginBottom: 14 },
  maxRevWarningTxt: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  actionBtns:       { gap: 10 },
  revBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A', borderRadius: 14, paddingVertical: 14 },
  revBtnTxt:        { fontSize: 14, fontWeight: '700', color: '#D97706' },
  approveBtn:       { borderRadius: 14, overflow: 'hidden' },
  approveBtnGrad:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  approveBtnTxt:    { fontSize: 16, fontWeight: '700', color: '#FFF' },
  disputeDivider:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  disputeDividerLine:{ flex: 1, height: 1, backgroundColor: '#F3F4F6' },
  disputeDividerTxt: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  disputeBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, paddingVertical: 12 },
  disputeBtnTxt:     { fontSize: 14, fontWeight: '600', color: '#EF4444' },
});

// ─── Modal styles ──────────────────────────────────────────────────────────────
const M = StyleSheet.create({
  videoBg:    { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoClose: { position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '90%' },
  handle:       { width: 42, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHdr:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10 },
  sheetIconWrap:{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center' },
  sheetTitle:   { fontSize: 17, fontWeight: '700', color: '#111827' },
  sheetSub:     { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  sheetClose:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  tipBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginBottom: 16 },
  tipTxt:    { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  fieldLbl:  { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  textarea:  { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, fontSize: 14, color: '#1F2937', minHeight: 130, textAlignVertical: 'top', backgroundColor: '#FAFAFA' },
  textareaFilled: { borderColor: '#F97316' },
  sheetActions:   { flexDirection: 'row', gap: 10, marginTop: 16, paddingBottom: 8 },
  cancelBtn:  { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelTxt:  { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  sendBtn:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 14 },
  sendTxt:    { fontSize: 15, fontWeight: '700', color: '#FFF' },

  centeredOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmCard:      { backgroundColor: '#FFF', borderRadius: 24, width: width - 48, overflow: 'hidden' },
  confirmTop:       { alignItems: 'center', paddingVertical: 28 },
  confirmIconCircle:{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  confirmTitle:     { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  confirmDesc:      { fontSize: 14, color: '#6B7280', lineHeight: 20, textAlign: 'center', marginBottom: 18 },
  confirmPayBox:    { backgroundColor: '#ECFDF5', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 20 },
  confirmPayLbl:    { fontSize: 12, color: '#6EE7B7', fontWeight: '600', marginBottom: 4 },
  confirmPayAmt:    { fontSize: 28, fontWeight: '800', color: '#059669' },
  confirmPayCur:    { fontSize: 13, color: '#059669', fontWeight: '600' },
  confirmBtns:      { flexDirection: 'row', gap: 10 },
  confirmCancel:    { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  confirmCancelTxt: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  confirmApprove:   { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', borderRadius: 14, paddingVertical: 15 },
  confirmApproveTxt:{ fontSize: 15, fontWeight: '700', color: '#FFF' },

  doneCard:  { backgroundColor: '#FFF', borderRadius: 24, width: width - 48, alignItems: 'center', overflow: 'hidden', paddingBottom: 24 },
  doneIcon:  { width: '100%', alignItems: 'center', paddingVertical: 28 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 4, marginBottom: 10, paddingHorizontal: 24, textAlign: 'center' },
  doneTxt:   { fontSize: 14, color: '#6B7280', lineHeight: 20, textAlign: 'center', paddingHorizontal: 24, marginBottom: 20 },
  doneBtn:   { backgroundColor: '#4F46E5', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  doneBtnTxt:{ fontSize: 15, fontWeight: '700', color: '#FFF' },
});