// components/clipper/SubmitClipping.tsx
// Submit and manage proofs for a clipping campaign
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://clippapay.com/api';
const getToken = () => localStorage.getItem('token');

// ─── Types ────────────────────────────────────────────────────────────────────
interface Proof {
  _id: string;
  platform: string;
  submissionUrl: string | null;
  views: number;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  verifiedViews?: number;
  rewardAmount?: number;
  createdAt: string;
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
  costPerThousand: number;
  clipperCpm?: number;
  estimatedViews: number;
  status: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PLATFORM_OPTIONS = [
  { id: 'tiktok',    label: 'TikTok',      needsUrl: true  },
  { id: 'instagram', label: 'Instagram',   needsUrl: true  },
  { id: 'youtube',   label: 'YouTube',     needsUrl: true  },
  { id: 'facebook',  label: 'Facebook',    needsUrl: true  },
  { id: 'snapchat',  label: 'Snapchat',    needsUrl: true  },
  { id: 'twitter',   label: 'X / Twitter', needsUrl: true  },
  { id: 'whatsapp',  label: 'WhatsApp',    needsUrl: false },
] as const;
const PMAP = Object.fromEntries(PLATFORM_OPTIONS.map((p) => [p.id, p]));

const STATUS_CONFIG = {
  pending:  { label: 'Pending Review', textColor: 'text-amber-500',   bg: 'bg-amber-50'   },
  approved: { label: 'Approved ✓',     textColor: 'text-emerald-500', bg: 'bg-emerald-50' },
  rejected: { label: 'Rejected',       textColor: 'text-red-500',     bg: 'bg-red-50'     },
};

const fmtMoney     = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n.toLocaleString()}` : `$${n.toFixed(4)}`;
const platformInfo = (pid: string) => PMAP[pid.toLowerCase()] ?? { label: pid, needsUrl: true };
const getClipperCpm = (c: Campaign) => c.clipperCpm ?? c.costPerThousand * 0.4;

// ─── Component ────────────────────────────────────────────────────────────────
export default function SubmitClipping() {
  const navigate    = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const location    = useLocation();
  const campaignTitle = (location.state as any)?.campaignTitle || '';

  const [campaign, setCampaign]     = useState<Campaign | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading]       = useState(true);

  // Submit modal
  const [submitOpen, setSubmitOpen]   = useState(false);
  const [selPlatform, setSelPlatform] = useState('');
  const [postUrl, setPostUrl]         = useState('');
  const [viewCount, setViewCount]     = useState('');
  const [proofFile, setProofFile]     = useState<File | null>(null);
  const [videoFile, setVideoFile]     = useState<File | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitErr, setSubmitErr]     = useState('');

  // Update modal
  const [updateOpen, setUpdateOpen]       = useState(false);
  const [updatingProof, setUpdatingProof] = useState<Proof | null>(null);
  const [newViews, setNewViews]           = useState('');
  const [newUrl, setNewUrl]               = useState('');
  const [newFile, setNewFile]             = useState<File | null>(null);
  const [updating, setUpdating]           = useState(false);
  const [updateErr, setUpdateErr]         = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = getToken();
      if (!token) { navigate('/login'); return; }
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
    }
  }, [campaignId, navigate]);

  useEffect(() => { load(); }, [load]);

  const resetSubmitForm = () => {
    setSelPlatform(''); setPostUrl(''); setViewCount('');
    setProofFile(null); setVideoFile(null); setSubmitErr('');
  };

  const handleSubmitProof = async () => {
    setSubmitErr('');
    if (!selPlatform) { setSubmitErr('Select a platform first.'); return; }
    const pInfo = platformInfo(selPlatform);
    if (pInfo.needsUrl && !postUrl.trim()) { setSubmitErr('Please enter the link to your post.'); return; }
    if (!pInfo.needsUrl && !proofFile) { setSubmitErr('Please attach a screenshot for WhatsApp.'); return; }

    setSubmitting(true);
    try {
      const token = getToken();
      if (!token) return;
      const form = new FormData();
      form.append('platform', selPlatform);
      if (postUrl.trim()) form.append('submissionUrl', postUrl.trim());
      if (viewCount.trim()) form.append('views', viewCount.trim());
      if (proofFile) form.append('proofImage', proofFile);
      if (videoFile) form.append('proofVideo', videoFile);

      await axios.post(`${API_BASE}/clipping/${campaignId}/submit-proof`, form, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      setSubmitOpen(false);
      resetSubmitForm();
      await load(true);
    } catch (err: any) {
      setSubmitErr(err.response?.data?.error || 'Could not submit proof.');
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateModal = (proof: Proof) => {
    setUpdatingProof(proof);
    setNewViews(String(proof.views || ''));
    setNewUrl(proof.submissionUrl || '');
    setNewFile(null);
    setUpdateErr('');
    setUpdateOpen(true);
  };

  const handleUpdateViews = async () => {
    setUpdateErr('');
    if (!updatingProof || !submission) return;
    const n = Number(newViews);
    if (!newViews || isNaN(n) || n <= 0) { setUpdateErr('Enter a valid view count.'); return; }
    if (updatingProof.status !== 'rejected' && n <= (updatingProof.verifiedViews || 0)) {
      setUpdateErr('Views must be higher than your last verified count.'); return;
    }

    setUpdating(true);
    try {
      const token = getToken();
      if (!token) return;
      const form = new FormData();
      form.append('views', String(n));
      if (newUrl.trim()) form.append('submissionUrl', newUrl.trim());
      if (newFile) form.append('proofImage', newFile);

      await axios.patch(
        `${API_BASE}/clipping/submissions/${submission._id}/proofs/${updatingProof._id}/update-views`,
        form,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      setUpdateOpen(false);
      await load(true);
    } catch (err: any) {
      setUpdateErr(err.response?.data?.error || 'Could not update proof.');
    } finally {
      setUpdating(false);
    }
  };

  // Derived
  const submittedPlatforms = new Set((submission?.proofs || []).map((p) => p.platform.toLowerCase()));
  const availablePlatforms = (campaign?.platforms || []).filter((p) => !submittedPlatforms.has(p.toLowerCase()));
  const approvedProofs     = (submission?.proofs || []).filter((p) => p.status === 'approved');
  const totalVerifiedViews = approvedProofs.reduce((s, p) => s + (p.verifiedViews || 0), 0);
  const totalEarned        = approvedProofs.reduce((s, p) => s + (p.rewardAmount || 0), 0);
  const pendingProofsCount = (submission?.proofs || []).filter((p) => p.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">Campaign not found.</p>
        <button onClick={() => navigate(-1)} className="text-orange-500 font-semibold text-sm">Go Back</button>
      </div>
    );
  }

  const clipperCpm = getClipperCpm(campaign);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 px-5 pt-8 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/35 transition-colors shrink-0"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-base truncate">{campaign.title}</h1>
            <p className="text-white/70 text-xs mt-0.5">Clipping Campaign</p>
          </div>
          <button
            onClick={() => load(false)}
            className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/35 transition-colors shrink-0"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Earnings summary */}
        <div className="bg-white/20 rounded-2xl p-3 flex divide-x divide-white/30">
          {[
            { val: fmtMoney(totalEarned, campaign.currency),  label: 'Total Earned'   },
            { val: totalVerifiedViews.toLocaleString(),        label: 'Verified Views' },
            { val: String(pendingProofsCount),                 label: 'Pending Review' },
          ].map(({ val, label }) => (
            <div key={label} className="flex-1 flex flex-col items-center px-1">
              <span className="text-sm font-extrabold text-white">{val}</span>
              <span className="text-[10px] text-white/80 mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-3">
        {/* Campaign info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Source Video</p>
          <a
            href={campaign.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-orange-50 rounded-xl p-3 mb-3 hover:bg-orange-100 transition-colors"
          >
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
              <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-orange-600 font-semibold text-sm">Watch Source Video</p>
              <p className="text-gray-400 text-xs truncate mt-0.5">{campaign.videoUrl}</p>
            </div>
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs px-3 py-1.5 rounded-full font-semibold">
              You earn {fmtMoney(clipperCpm, campaign.currency)} per 1K views
            </span>
            <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-full">
              {(campaign.estimatedViews / 1000).toFixed(0)}K target
            </span>
          </div>
        </div>

        {/* Directions */}
        {campaign.directions?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Editing Directions</p>
            <ul className="space-y-2">
              {campaign.directions.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  <span className="text-sm text-gray-600 leading-snug">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Hashtags */}
        {campaign.hashtags?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Required Hashtags</p>
            <div className="flex flex-wrap gap-2">
              {campaign.hashtags.map((tag, i) => (
                <span key={i} className="bg-blue-50 text-blue-500 text-xs px-3 py-1.5 rounded-full font-medium">#{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Submit new proof CTA */}
        {availablePlatforms.length > 0 && (
          <button
            onClick={() => { resetSubmitForm(); setSubmitOpen(true); }}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border-2 border-dashed border-orange-400 hover:bg-orange-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-orange-500 font-bold text-sm">Submit a New Proof</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {availablePlatforms.length} platform{availablePlatforms.length > 1 ? 's' : ''} available
              </p>
            </div>
            <svg className="w-5 h-5 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Existing proofs */}
        {(submission?.proofs || []).length > 0 ? (
          <>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-1">Your Submissions</p>
            {submission!.proofs.map((proof) => (
              <ProofCard
                key={proof._id}
                proof={proof}
                currency={campaign.currency}
                clipperCpm={clipperCpm}
                onUpdate={() => openUpdateModal(proof)}
              />
            ))}
          </>
        ) : (
          <div className="flex flex-col items-center py-12 gap-3">
            <svg className="w-14 h-14 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h3 className="text-base font-semibold text-gray-700">No proofs yet</h3>
            <p className="text-sm text-gray-400 text-center max-w-xs leading-relaxed">
              Post the video on your platforms and come back here to submit your proof link.
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════ SUBMIT PROOF MODAL ═══════════════ */}
      {submitOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setSubmitOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="text-base font-bold text-gray-900">Submit Proof</h3>
              <div className="w-8" />
            </div>

            <div className="p-5 space-y-4">
              {submitErr && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">{submitErr}</div>}

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Select Platform *</p>
                <div className="flex flex-wrap gap-2">
                  {availablePlatforms.map((pid) => {
                    const p = platformInfo(pid);
                    const on = selPlatform === pid;
                    return (
                      <button
                        key={pid}
                        onClick={() => { setSelPlatform(pid); setSubmitErr(''); }}
                        className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${on ? 'bg-orange-50 border-orange-400 text-orange-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selPlatform && (
                <>
                  {platformInfo(selPlatform).needsUrl && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Post URL *</p>
                      <input
                        type="url"
                        value={postUrl}
                        onChange={(e) => { setPostUrl(e.target.value); setSubmitErr(''); }}
                        placeholder="https://..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Current View Count {platformInfo(selPlatform).needsUrl ? '(optional)' : '*'}
                    </p>
                    <input
                      type="number"
                      value={viewCount}
                      onChange={(e) => setViewCount(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {platformInfo(selPlatform).needsUrl ? 'Screenshot (optional, speeds up approval)' : 'Screenshot / Video Proof *'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-orange-200 rounded-xl py-4 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors">
                        <svg className={`w-6 h-6 mb-1 ${proofFile ? 'text-emerald-500' : 'text-orange-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={proofFile ? 'M5 13l4 4L19 7' : 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'} />
                        </svg>
                        <span className={`text-xs font-medium ${proofFile ? 'text-emerald-600' : 'text-orange-500'}`}>{proofFile ? proofFile.name.slice(0, 12) + '…' : 'Pick Screenshot'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setProofFile(e.target.files[0]); setSubmitErr(''); } }} />
                      </label>
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-orange-200 rounded-xl py-4 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors">
                        <svg className={`w-6 h-6 mb-1 ${videoFile ? 'text-emerald-500' : 'text-orange-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={videoFile ? 'M5 13l4 4L19 7' : 'M15 10l4.553-2.069A1 1 0 0121 8.87v6.259a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'} />
                        </svg>
                        <span className={`text-xs font-medium ${videoFile ? 'text-emerald-600' : 'text-orange-500'}`}>{videoFile ? videoFile.name.slice(0, 12) + '…' : 'Pick Video'}</span>
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setVideoFile(e.target.files[0]); setSubmitErr(''); } }} />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3">
                    <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      After admin approves your proof, earnings are credited to your wallet instantly. You can update view counts later as they grow.
                    </p>
                  </div>
                </>
              )}

              <button
                onClick={handleSubmitProof}
                disabled={!selPlatform || submitting}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Submit Proof<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ UPDATE VIEWS MODAL ═══════════════ */}
      {updateOpen && updatingProof && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setUpdateOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="text-base font-bold text-gray-900">
                {updatingProof.status === 'rejected' ? 'Resubmit Proof' : 'Update View Count'}
              </h3>
              <div className="w-8" />
            </div>

            <div className="p-5 space-y-4">
              {updateErr && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">{updateErr}</div>}

              {updatingProof.status === 'rejected' && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                  <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-red-700">Proof was rejected</p>
                    {updatingProof.adminNote && <p className="text-xs text-red-600 mt-1 italic">Admin: "{updatingProof.adminNote}"</p>}
                    <p className="text-xs text-gray-500 mt-1">Fix the issue above, update your view count & proof, then resubmit.</p>
                  </div>
                </div>
              )}

              {/* Current stats */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                {[
                  ['Platform', updatingProof.platform],
                  ['Last Verified Views', (updatingProof.verifiedViews || 0).toLocaleString()],
                  ['Earned So Far', fmtMoney(updatingProof.rewardAmount || 0, campaign.currency)],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-sm text-gray-400">{label}</span>
                    <span className="text-sm font-bold text-gray-800">{val}</span>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {updatingProof.status === 'rejected' ? 'Your Current View Count *' : 'New View Count *'}
                </p>
                <input
                  type="number"
                  value={newViews}
                  onChange={(e) => { setNewViews(e.target.value); setUpdateErr(''); }}
                  placeholder={updatingProof.status === 'rejected' ? 'Enter your current view count' : `Must be > ${(updatingProof.verifiedViews || 0).toLocaleString()}`}
                  autoFocus
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {updatingProof.status === 'rejected' ? 'Post URL *' : 'Post URL (optional update)'}
                </p>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => { setNewUrl(e.target.value); setUpdateErr(''); }}
                  placeholder="https://..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {updatingProof.status === 'rejected' ? 'New Screenshot / Proof *' : 'New Screenshot (recommended)'}
                </p>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-orange-200 rounded-xl py-4 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors">
                  <svg className={`w-5 h-5 ${newFile ? 'text-emerald-500' : 'text-orange-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={newFile ? 'M5 13l4 4L19 7' : 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'} />
                  </svg>
                  <span className={`text-sm font-medium ${newFile ? 'text-emerald-600' : 'text-orange-500'}`}>
                    {newFile ? newFile.name : 'Attach Screenshot'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setNewFile(e.target.files[0]); setUpdateErr(''); } }} />
                </label>
              </div>

              {/* Estimated earnings */}
              {newViews && !isNaN(Number(newViews)) && (
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    {updatingProof.status === 'rejected' ? 'Estimated Earnings on Approval' : 'Estimated Additional Earnings'}
                  </p>
                  <p className="text-xl font-extrabold text-emerald-500">
                    {fmtMoney(
                      Math.max(0, updatingProof.status === 'rejected'
                        ? (Number(newViews) * clipperCpm) / 1000
                        : ((Number(newViews) - (updatingProof.verifiedViews || 0)) * clipperCpm) / 1000
                      ),
                      campaign.currency
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">At {fmtMoney(clipperCpm, campaign.currency)} per 1,000 views (your 40% share)</p>
                </div>
              )}

              <button
                onClick={handleUpdateViews}
                disabled={updating}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold transition-colors disabled:opacity-60 ${
                  updatingProof.status === 'rejected' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {updating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                  updatingProof.status === 'rejected' ? 'Resubmit for Review' : 'Update View Count'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ProofCard ────────────────────────────────────────────────────────────────
function ProofCard({ proof, currency, clipperCpm, onUpdate }: {
  proof: Proof; currency: 'NGN' | 'USDT'; clipperCpm: number; onUpdate: () => void;
}) {
  const cfg   = STATUS_CONFIG[proof.status] || STATUS_CONFIG.pending;
  const pInfo = platformInfo(proof.platform);
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
          <span className="text-orange-500 font-bold text-xs uppercase">{pInfo.label.slice(0, 2)}</span>
        </div>
        <span className="flex-1 font-bold text-gray-900 text-sm">{pInfo.label}</span>
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.textColor}`}>
          {cfg.label}
        </span>
      </div>

      {/* Stats */}
      <div className="flex bg-gray-50 rounded-xl p-3 mb-3 divide-x divide-gray-200">
        {[
          { label: 'Submitted Views',  val: (proof.views || 0).toLocaleString(),           green: false },
          { label: 'Verified Views',   val: (proof.verifiedViews || 0).toLocaleString(),   green: !!proof.verifiedViews },
          { label: 'Earned',           val: `${currency === 'NGN' ? '₦' : '$'}${(proof.rewardAmount || 0).toLocaleString()}`, green: !!proof.rewardAmount },
        ].map(({ label, val, green }) => (
          <div key={label} className="flex-1 flex flex-col items-center">
            <span className="text-[10px] text-gray-400">{label}</span>
            <span className={`text-sm font-bold mt-0.5 ${green ? 'text-emerald-500' : 'text-gray-900'}`}>{val}</span>
          </div>
        ))}
      </div>

      {/* URL */}
      {proof.submissionUrl && (
        <a
          href={proof.submissionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-2 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
          </svg>
          <span className="text-xs text-gray-500 truncate flex-1">{proof.submissionUrl}</span>
        </a>
      )}

      {/* Admin note */}
      {proof.adminNote && (
        <div className={`flex items-start gap-2 rounded-lg px-3 py-2 mb-2 ${proof.status === 'rejected' ? 'bg-red-50' : 'bg-orange-50'}`}>
          <svg className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${proof.status === 'rejected' ? 'text-red-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className={`text-xs leading-snug ${proof.status === 'rejected' ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
            {proof.status === 'rejected' ? `Rejection reason: ${proof.adminNote}` : proof.adminNote}
          </span>
        </div>
      )}

      {/* Action button */}
      {proof.status === 'rejected' ? (
        <button
          onClick={onUpdate}
          className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
        >
          Fix & Resubmit
        </button>
      ) : (
        <button
          onClick={onUpdate}
          className="w-full flex items-center justify-center gap-2 bg-orange-50 border border-orange-300 text-orange-500 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors"
        >
          Update Views
        </button>
      )}
    </div>
  );
}
