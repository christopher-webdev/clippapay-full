// components/advertiser/ClippingCampaignDetail.tsx
// Full management page for a single clipping campaign
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://clippapay.com/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Proof {
  _id: string;
  platform: string;
  submissionUrl: string | null;
  views: number;
  verifiedViews?: number;
  rewardAmount?: number;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
}
interface Submission {
  _id: string;
  clipper: { _id: string; firstName?: string; lastName?: string; email: string };
  proofs: Proof[];
  rewardAmount: number;
  createdAt: string;
}
interface Campaign {
  _id: string;
  title: string;
  videoUrl: string;
  budget: number;
  currency: 'NGN' | 'USDT';
  costPerThousand: number;
  estimatedViews: number;
  totalSpent: number;
  totalViews: number;
  clipsCreated: number;
  platforms: string[];
  categories: string[];
  hashtags: string[];
  directions: string[];
  ctaUrl?: string;
  status: 'waiting_for_approval' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${(n || 0).toLocaleString()}` : `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const clipperName = (c: Submission['clipper']) =>
  c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : c.email;

const getToken = () => localStorage.getItem('token');

const PROOF_STATUS = {
  pending:  { label: 'Pending',  textColor: 'text-amber-600',   bg: 'bg-amber-50'   },
  approved: { label: 'Approved', textColor: 'text-emerald-600', bg: 'bg-emerald-50' },
  rejected: { label: 'Rejected', textColor: 'text-red-500',     bg: 'bg-red-50'     },
};

const CAMPAIGN_STATUS = {
  waiting_for_approval: { label: 'Pending Approval', textColor: 'text-amber-600',   bg: 'bg-amber-50'   },
  active:               { label: 'Active',           textColor: 'text-emerald-600', bg: 'bg-emerald-50' },
  completed:            { label: 'Completed',         textColor: 'text-gray-500',    bg: 'bg-gray-100'   },
  cancelled:            { label: 'Cancelled',         textColor: 'text-red-500',     bg: 'bg-red-50'     },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClippingCampaignDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [campaign, setCampaign]       = useState<Campaign | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [cancelling, setCancelling]   = useState(false);
  const [activeTab, setActiveTab]     = useState<'overview' | 'clippers'>('overview');
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = getToken();
      if (!token) { navigate('/login'); return; }
      const headers = { Authorization: `Bearer ${token}` };

      const [campRes, subRes] = await Promise.all([
        axios.get<Campaign>(`${API_BASE}/campaigns/clipping/${id}`, { headers }),
        axios.get<Submission[]>(`${API_BASE}/campaigns/clipping/${id}/submissions`, { headers })
          .catch(() => ({ data: [] as Submission[] })),
      ]);

      setCampaign(campRes.data);
      setSubmissions(subRes.data || []);
    } catch (err) {
      console.error('load detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!campaign) return;
    setCancelling(true);
    try {
      const token = getToken();
      await axios.post(
        `${API_BASE}/campaigns/clipping/${id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCancelConfirm(false);
      await load(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not cancel campaign.');
    } finally {
      setCancelling(false);
    }
  };

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

  const pct       = campaign.estimatedViews > 0 ? Math.min(100, Math.round(((campaign.totalViews || 0) / campaign.estimatedViews) * 100)) : 0;
  const spentPct  = campaign.budget > 0 ? Math.min(100, Math.round(((campaign.totalSpent || 0) / campaign.budget) * 100)) : 0;
  const remaining = campaign.budget - (campaign.totalSpent || 0);
  const campCfg   = CAMPAIGN_STATUS[campaign.status] || CAMPAIGN_STATUS.active;

  const allProofs      = submissions.flatMap((s) => s.proofs);
  const approvedProofs = allProofs.filter((p) => p.status === 'approved');
  const pendingProofs  = allProofs.filter((p) => p.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cancel confirmation modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-bold text-gray-900 mb-2">Cancel Campaign?</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              This will cancel the campaign and refund{' '}
              <strong className="text-gray-700">{fmtMoney(remaining, campaign.currency)}</strong> to your wallet. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Keep Campaign
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60 flex items-center justify-center"
              >
                {cancelling ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-orange-500 px-5 pt-8 pb-4 rounded-b-3xl">
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
            <span className={`inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 ${campCfg.bg} ${campCfg.textColor}`}>
              {campCfg.label}
            </span>
          </div>
          {(campaign.status === 'active' || campaign.status === 'waiting_for_approval') && (
            <button
              onClick={() => setCancelConfirm(true)}
              className="w-9 h-9 rounded-full bg-red-400/30 flex items-center justify-center hover:bg-red-400/50 transition-colors shrink-0"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* KPI row */}
        <div className="bg-white/20 rounded-2xl p-3 flex divide-x divide-white/30">
          {[
            { label: 'Budget',   val: fmtMoney(campaign.budget, campaign.currency)          },
            { label: 'Spent',    val: fmtMoney(campaign.totalSpent || 0, campaign.currency) },
            { label: 'Views',    val: (campaign.totalViews || 0).toLocaleString()            },
            { label: 'Clippers', val: String(campaign.clipsCreated || 0)                    },
          ].map(({ label, val }) => (
            <div key={label} className="flex-1 flex flex-col items-center px-1">
              <span className="text-sm font-extrabold text-white">{val}</span>
              <span className="text-[10px] text-white/80 mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 flex">
        {([['overview', 'Overview'], ['clippers', `Clippers (${submissions.length})`]] as const).map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setActiveTab(val)}
            className={`flex-1 py-3.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === val ? 'border-orange-500 text-orange-500 font-bold' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-w-3xl mx-auto space-y-3">
        {activeTab === 'overview' ? (
          <OverviewTab
            campaign={campaign}
            pct={pct}
            spentPct={spentPct}
            remaining={remaining}
            approvedProofsCount={approvedProofs.length}
            pendingProofsCount={pendingProofs.length}
          />
        ) : (
          <ClippersTab submissions={submissions} currency={campaign.currency} />
        )}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ campaign, pct, spentPct, remaining, approvedProofsCount, pendingProofsCount }: {
  campaign: Campaign; pct: number; spentPct: number; remaining: number;
  approvedProofsCount: number; pendingProofsCount: number;
}) {
  return (
    <>
      {/* Progress */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Campaign Progress</p>
        <ProgressBar label="Budget Used" pct={spentPct} color="bg-red-400"
          sub={`${fmtMoney(campaign.totalSpent || 0, campaign.currency)} of ${fmtMoney(campaign.budget, campaign.currency)}`} />
        <ProgressBar label="Views Delivered" pct={pct} color="bg-emerald-400"
          sub={`${(campaign.totalViews || 0).toLocaleString()} of ${campaign.estimatedViews.toLocaleString()} target`} />
      </div>

      {/* Proof summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Proof Summary</p>
        <div className="flex divide-x divide-gray-100">
          <ProofSumCell label="Approved Proofs" val={String(approvedProofsCount)} color="text-emerald-500" />
          <ProofSumCell label="Pending Review"  val={String(pendingProofsCount)}  color="text-amber-500"   />
          <ProofSumCell label="Remaining Budget" val={fmtMoney(remaining, campaign.currency)} color="text-gray-500" />
        </div>
      </div>

      {/* Campaign info */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Campaign Info</p>

        <a
          href={campaign.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-orange-50 rounded-xl p-3 mb-4 hover:bg-orange-100 transition-colors group"
        >
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
            <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-orange-600 font-semibold text-sm">Source Video</p>
            <p className="text-gray-400 text-xs truncate mt-0.5">{campaign.videoUrl}</p>
          </div>
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <InfoRow label="Rate"         val={`${fmtMoney(campaign.costPerThousand, campaign.currency)} per 1,000 views`} />
        <InfoRow label="Target Views" val={campaign.estimatedViews.toLocaleString()} />
        <InfoRow label="Created"      val={new Date(campaign.createdAt).toLocaleDateString()} />

        {campaign.platforms.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-2">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {campaign.platforms.map((p) => (
                <span key={p} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full capitalize">{p}</span>
              ))}
            </div>
          </div>
        )}

        {campaign.hashtags.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-2">Hashtags</p>
            <div className="flex flex-wrap gap-2">
              {campaign.hashtags.map((h, i) => (
                <span key={i} className="bg-blue-50 text-blue-500 text-xs px-3 py-1 rounded-full">#{h}</span>
              ))}
            </div>
          </div>
        )}

        {campaign.directions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-2">Directions</p>
            <ul className="space-y-1.5">
              {campaign.directions.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  <span className="text-sm text-gray-600 leading-snug">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Clippers Tab ─────────────────────────────────────────────────────────────
function ClippersTab({ submissions, currency }: { submissions: Submission[]; currency: 'NGN' | 'USDT' }) {
  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <svg className="w-14 h-14 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-base font-bold text-gray-700">No clippers yet</h3>
        <p className="text-sm text-gray-400 text-center max-w-xs leading-relaxed">Clippers will appear here once they join and submit their proofs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((sub) => {
        const approved     = sub.proofs.filter((p) => p.status === 'approved');
        const pending      = sub.proofs.filter((p) => p.status === 'pending');
        const totalVerified = approved.reduce((s, p) => s + (p.verifiedViews || 0), 0);
        const initials     = clipperName(sub.clipper).slice(0, 2).toUpperCase();

        return (
          <div key={sub._id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            {/* Clipper header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{clipperName(sub.clipper)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Joined {new Date(sub.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-500 font-extrabold text-sm">{fmtMoney(sub.rewardAmount || 0, currency)}</p>
                <p className="text-[10px] text-gray-400">earned</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex bg-gray-50 rounded-xl p-2.5 mb-3 divide-x divide-gray-200">
              {[
                { label: 'Proofs',   val: String(sub.proofs.length), color: 'text-gray-900' },
                { label: 'Pending',  val: String(pending.length),    color: 'text-amber-500' },
                { label: 'Approved', val: String(approved.length),   color: 'text-emerald-500' },
                { label: 'Views',    val: totalVerified.toLocaleString(), color: 'text-gray-900' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex-1 flex flex-col items-center">
                  <span className={`text-sm font-bold ${color}`}>{val}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">{label}</span>
                </div>
              ))}
            </div>

            {/* Proof list */}
            {sub.proofs.map((proof) => {
              const pCfg = PROOF_STATUS[proof.status] || PROOF_STATUS.pending;
              return (
                <div key={proof._id} className="flex items-center gap-3 py-2 border-t border-gray-100">
                  <span className="bg-orange-50 text-orange-500 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize shrink-0">
                    {proof.platform}
                  </span>
                  <div className="flex-1 min-w-0">
                    {proof.submissionUrl ? (
                      <a
                        href={proof.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 text-xs hover:underline truncate block"
                      >
                        {proof.submissionUrl}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Screenshot proof</span>
                    )}
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {(proof.views || 0).toLocaleString()} submitted views
                      {proof.verifiedViews ? ` · ${proof.verifiedViews.toLocaleString()} verified` : ''}
                    </p>
                  </div>
                  <span className={`${pCfg.bg} ${pCfg.textColor} text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0`}>
                    {pCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function ProgressBar({ label, pct, color, sub }: { label: string; pct: number; color: string; sub: string }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="font-bold text-gray-900">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function ProofSumCell({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <div className="flex-1 flex flex-col items-center px-2">
      <span className={`text-lg font-extrabold ${color}`}>{val}</span>
      <span className="text-[11px] text-gray-400 mt-0.5 text-center">{label}</span>
    </div>
  );
}

function InfoRow({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-50">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{val}</span>
    </div>
  );
}
