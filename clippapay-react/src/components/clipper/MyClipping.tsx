// components/clipper/MyClipping.tsx
// Clipper's personal clipping hub — with search + filter
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://clippapay.com/api';
const getToken = () => localStorage.getItem('token');

interface Proof {
  _id: string;
  platform: string;
  status: 'pending' | 'approved' | 'rejected';
  views: number;
  verifiedViews: number;
  rewardAmount: number;
}
interface Submission {
  _id: string;
  campaign: {
    _id: string;
    title: string;
    status: string;
    currency: 'NGN' | 'USDT';
    costPerThousand: number;
    clipperCpm: number;
    platforms: string[];
  };
  proofs: Proof[];
  totalVerifiedViews: number;
  totalEarned: number;
  pendingProofs: number;
  createdAt: string;
}

type CampaignStatusFilter = 'all' | 'active' | 'completed' | 'cancelled';
type ProofStatusFilter    = 'all' | 'pending' | 'approved' | 'rejected';

const fmtMoney = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n.toLocaleString()}` : `$${n.toFixed(4)}`;

const STATUS_CONFIG = {
  pending:  { color: 'text-amber-500',   bg: 'bg-amber-50',   dot: 'bg-amber-400'   },
  approved: { color: 'text-emerald-500', bg: 'bg-emerald-50', dot: 'bg-emerald-400' },
  rejected: { color: 'text-red-500',     bg: 'bg-red-50',     dot: 'bg-red-400'     },
};

const CAMPAIGN_STATUS_OPTS: { label: string; val: CampaignStatusFilter }[] = [
  { label: 'All',       val: 'all'       },
  { label: 'Active',    val: 'active'    },
  { label: 'Completed', val: 'completed' },
  { label: 'Cancelled', val: 'cancelled' },
];
const PROOF_STATUS_OPTS: { label: string; val: ProofStatusFilter }[] = [
  { label: 'All',      val: 'all'      },
  { label: 'Pending',  val: 'pending'  },
  { label: 'Approved', val: 'approved' },
  { label: 'Rejected', val: 'rejected' },
];

export default function MyClipping() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search,               setSearch]               = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<CampaignStatusFilter>('all');
  const [proofStatusFilter,    setProofStatusFilter]    = useState<ProofStatusFilter>('all');
  const [showFilters,          setShowFilters]          = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const token = getToken();
      if (!token) { navigate('/login'); return; }
      const { data } = await axios.get<Submission[]>(`${API_BASE}/clipping/my/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((sub) => {
      if (q) {
        const inTitle    = sub.campaign.title.toLowerCase().includes(q);
        const inPlatform = sub.proofs.some(p => p.platform?.toLowerCase().includes(q));
        if (!inTitle && !inPlatform) return false;
      }
      if (campaignStatusFilter !== 'all' && sub.campaign.status !== campaignStatusFilter) return false;
      if (proofStatusFilter !== 'all') {
        if (!sub.proofs.some(p => p.status === proofStatusFilter)) return false;
      }
      return true;
    });
  }, [submissions, search, campaignStatusFilter, proofStatusFilter]);

  const hasActiveFilters = !!search || campaignStatusFilter !== 'all' || proofStatusFilter !== 'all';

  const clearFilters = () => { setSearch(''); setCampaignStatusFilter('all'); setProofStatusFilter('all'); };

  // Totals off full list
  const totalEarned        = submissions.reduce((s, sub) => s + sub.totalEarned, 0);
  const totalVerifiedViews = submissions.reduce((s, sub) => s + sub.totalVerifiedViews, 0);
  const totalPending       = submissions.reduce((s, sub) => s + sub.pendingProofs, 0);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-orange-500 px-5 pt-8 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/35 transition-colors">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white">My Clipping Campaigns</h1>
          </div>
          <button onClick={() => navigate('../join-clipping')}
            className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/35 transition-colors">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <div className="bg-white/20 rounded-2xl p-4 flex divide-x divide-white/30">
          {[
            { val: fmtMoney(totalEarned, 'NGN'), label: 'Total Earned' },
            { val: totalVerifiedViews.toLocaleString(), label: 'Verified Views' },
            { val: String(totalPending), label: 'Pending Reviews' },
          ].map(({ val, label }) => (
            <div key={label} className="flex-1 flex flex-col items-center px-2">
              <span className="text-base font-extrabold text-white">{val}</span>
              <span className="text-[10px] text-white/80 mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search + Filter bar ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          {/* Search input */}
          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or platform…"
              className="flex-1 bg-transparent text-sm text-gray-900 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
              hasActiveFilters
                ? 'bg-orange-50 border-orange-400 text-orange-500'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            {hasActiveFilters && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </button>
        </div>

        {/* ── Expandable filter panel ── */}
        {showFilters && (
          <div className="max-w-3xl mx-auto mt-3 space-y-3">
            {/* Campaign status row */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Campaign Status</p>
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_STATUS_OPTS.map(({ label, val }) => (
                  <button
                    key={val}
                    onClick={() => setCampaignStatusFilter(val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      campaignStatusFilter === val
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Proof status row */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Proof Status</p>
              <div className="flex flex-wrap gap-2">
                {PROOF_STATUS_OPTS.map(({ label, val }) => (
                  <button
                    key={val}
                    onClick={() => setProofStatusFilter(val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      proofStatusFilter === val
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-full transition-colors">
                ✕ Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-xs text-gray-400 font-medium px-5 pt-3 max-w-3xl mx-auto">
          Showing {filtered.length} of {submissions.length} campaigns
        </p>
      )}

      {/* ── List ── */}
      <div className="p-4 max-w-3xl mx-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <svg className="w-14 h-14 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d={
                submissions.length === 0
                  ? "M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              } />
            </svg>
            <h3 className="text-base font-bold text-gray-700">
              {submissions.length === 0 ? 'No Clipping Campaigns Yet' : 'No results found'}
            </h3>
            <p className="text-sm text-gray-400 text-center max-w-xs leading-relaxed">
              {submissions.length === 0
                ? 'Join a clipping campaign to start earning from your content.'
                : 'Try adjusting your search or filters.'}
            </p>
            {submissions.length === 0 ? (
              <button onClick={() => navigate('../join-clipping')}
                className="mt-1 flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors">
                Browse Campaigns
              </button>
            ) : (
              <button onClick={clearFilters}
                className="mt-1 bg-gray-100 text-gray-600 px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filtered.map((sub) => (
            <SubmissionCard
              key={sub._id}
              sub={sub}
              onSubmitProof={() => navigate(`../submit-clipping/${sub.campaign._id}`, { state: { campaignTitle: sub.campaign.title } })}
            />
          ))
        )}

        {!loading && submissions.length > 0 && (
          <button onClick={() => load(true)} disabled={refreshing}
            className="w-full py-3 text-sm text-orange-500 font-semibold hover:bg-orange-50 rounded-xl transition-colors disabled:opacity-50">
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SubmissionCard (unchanged layout, no filter logic here) ─────────────────
function SubmissionCard({ sub, onSubmitProof }: { sub: Submission; onSubmitProof: () => void }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      {/* Title row */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{sub.campaign.title}</h3>
          <p className="text-xs text-emerald-500 font-semibold mt-1">
            {fmtMoney(sub.campaign.clipperCpm ?? sub.campaign.costPerThousand * 0.4, sub.campaign.currency)} per 1K views
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
          sub.campaign.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
        }`}>
          {sub.campaign.status === 'active' ? 'Active' : sub.campaign.status}
        </span>
      </div>

      {/* Earnings strip */}
      <div className="flex bg-gray-50 rounded-xl p-3 mb-3 divide-x divide-gray-200">
        <div className="flex-1 flex flex-col items-center">
          <span className="text-sm font-extrabold text-gray-900">{fmtMoney(sub.totalEarned, sub.campaign.currency)}</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Earned</span>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <span className="text-sm font-extrabold text-gray-900">{sub.totalVerifiedViews.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Verified Views</span>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <span className={`text-sm font-extrabold ${sub.pendingProofs > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
            {sub.pendingProofs}
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5">Pending</span>
        </div>
      </div>

      {/* Proof chips */}
      {sub.proofs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {sub.proofs.map((proof) => {
            const cfg = STATUS_CONFIG[proof.status] || STATUS_CONFIG.pending;
            return (
              <span key={proof._id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {proof.platform}
              </span>
            );
          })}
        </div>
      )}

      {/* Action */}
      <button onClick={onSubmitProof}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-orange-600 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {sub.proofs.length > 0 ? 'Manage Proofs' : 'Submit Proof'}
      </button>
    </div>
  );
}