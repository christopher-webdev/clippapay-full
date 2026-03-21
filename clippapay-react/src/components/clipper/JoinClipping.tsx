// components/clipper/JoinClipping.tsx
// Browse available clipping campaigns, filter, search, join & view details
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://clippapay.com/api';
const getToken = () => localStorage.getItem('token');

interface ClippingCampaign {
  _id: string;
  title: string;
  videoUrl: string;
  budget: number;
  currency: 'NGN' | 'USDT';
  platforms: string[];
  categories: string[];
  hashtags: string[];
  directions: string[];
  ctaUrl?: string;
  estimatedViews: number;
  totalSpent: number;
  totalViews: number;
  clipsCreated: number;
  costPerThousand: number;
  clipperCpm: number;
  status: string;
  createdAt: string;
  advertiser: { firstName?: string; lastName?: string; company?: string };
  hasJoined: boolean;
  remainingBudget: number;
  completionPct: number;
}
interface Stats {
  totalCampaigns: number;
  totalBudget: number;
  totalBudgetNGN: number;
  totalBudgetUSDT: number;
}

const PLATFORM_OPTIONS = [
  { id: 'tiktok',    label: 'TikTok'      },
  { id: 'instagram', label: 'Instagram'   },
  { id: 'youtube',   label: 'YouTube'     },
  { id: 'facebook',  label: 'Facebook'    },
  { id: 'snapchat',  label: 'Snapchat'    },
  { id: 'twitter',   label: 'X / Twitter' },
  { id: 'whatsapp',  label: 'WhatsApp'    },
] as const;

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Newest'   },
  { value: 'budget_high', label: 'Budget ↑' },
  { value: 'budget_low',  label: 'Budget ↓' },
  { value: 'cpm_high',    label: 'Pay ↑'    },
] as const;

const fmtMoney = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n.toLocaleString()}` : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const fmtCpm = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n}` : `$${n.toFixed(2)}`;
const advLabel = (a?: ClippingCampaign['advertiser']) =>
  !a ? 'Advertiser' : a.company || `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Advertiser';
const advInitials = (a?: ClippingCampaign['advertiser']) => advLabel(a).slice(0, 2).toUpperCase();

export default function JoinClipping() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns]         = useState<ClippingCampaign[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [stats, setStats]                 = useState<Stats>({ totalCampaigns: 0, totalBudget: 0, totalBudgetNGN: 0, totalBudgetUSDT: 0 });
  const [search, setSearch]               = useState('');
  const [sortBy, setSortBy]               = useState('newest');
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [tempPlatforms, setTempPlatforms] = useState<string[]>([]);
  const [filterOpen, setFilterOpen]       = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<ClippingCampaign | null>(null);
  const [joining, setJoining]             = useState(false);
  const searchTimer                       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderRef                         = useRef<HTMLDivElement | null>(null);

  const fetchCampaigns = useCallback(async (opts: {
    refresh?: boolean; newPage?: number; newSort?: string;
    newSearch?: string; newPlatforms?: string[];
  } = {}) => {
    const {
      refresh = false, newPage = page, newSort = sortBy,
      newSearch = search, newPlatforms = platformFilter,
    } = opts;

    if (refresh || newPage === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const token = getToken();
      if (!token) { navigate('/login'); return; }

      const params = new URLSearchParams({ page: String(refresh ? 1 : newPage), limit: '10', sortBy: newSort });
      if (newSearch) params.append('search', newSearch);
      if (newPlatforms.length) params.append('platforms', newPlatforms.join(','));

      const { data } = await axios.get<{ campaigns: ClippingCampaign[]; totalPages: number }>(
        `${API_BASE}/clipping/available?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (refresh || newPage === 1) { setCampaigns(data.campaigns); setPage(1); }
      else setCampaigns((prev) => [...prev, ...data.campaigns]);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('fetchCampaigns:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, sortBy, search, platformFilter, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const { data } = await axios.get<Stats>(`${API_BASE}/clipping/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(data);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchCampaigns({ refresh: true }); fetchStats(); }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages && !loadingMore && !loading) {
          const n = page + 1;
          setPage(n);
          fetchCampaigns({ newPage: n });
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [page, totalPages, loadingMore, loading, fetchCampaigns]);

  const onSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchCampaigns({ refresh: true, newSearch: val }), 500);
  };

  const applyFilter = () => {
    setPlatformFilter(tempPlatforms);
    setFilterOpen(false);
    fetchCampaigns({ refresh: true, newPlatforms: tempPlatforms });
  };
  const resetFilter = () => {
    setTempPlatforms([]); setPlatformFilter([]); setFilterOpen(false);
    fetchCampaigns({ refresh: true, newPlatforms: [] });
  };

  const handleJoin = async (c: ClippingCampaign) => {
    if (c.hasJoined) {
      navigate(`../submit-clipping/${c._id}`, { state: { campaignTitle: c.title } });
      return;
    }
    setJoining(true);
    try {
      const token = getToken();
      if (!token) return;
      await axios.post(`${API_BASE}/clipping/${c._id}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setCampaigns((prev) => prev.map((x) => x._id === c._id ? { ...x, hasJoined: true } : x));
      if (selectedCampaign?._id === c._id) setSelectedCampaign((s) => s && { ...s, hasJoined: true });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not join campaign.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 px-5 pt-8 pb-4 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/35 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white">Clipping Campaigns</h1>
          </div>
          <button
            onClick={() => { setTempPlatforms(platformFilter); setFilterOpen(true); }}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${platformFilter.length > 0 ? 'bg-white/40' : 'bg-white/25 hover:bg-white/35'}`}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {platformFilter.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-orange-500 text-[10px] font-bold rounded-full flex items-center justify-center">
                {platformFilter.length}
              </span>
            )}
          </button>
        </div>

        {/* Stats chips */}
        <div className="bg-white/20 rounded-2xl p-3 flex divide-x divide-white/30 mb-4">
          <div className="flex-1 flex flex-col items-center px-2">
            <span className="text-lg font-extrabold text-white">{stats.totalCampaigns}</span>
            <span className="text-[10px] text-white/80 mt-0.5">Active Campaigns</span>
          </div>
          <div className="flex-1 flex flex-col items-center px-2">
            <span className="text-xs text-white/80 mb-0.5">Budget Pool</span>
            {stats.totalBudgetNGN > 0 && (
              <span className="text-base font-extrabold text-white">
                ₦{stats.totalBudgetNGN >= 1_000_000 ? `${(stats.totalBudgetNGN / 1_000_000).toFixed(1)}M` : `${(stats.totalBudgetNGN / 1000).toFixed(0)}K`}
              </span>
            )}
            {stats.totalBudgetUSDT > 0 && (
              <span className="text-xs font-bold text-yellow-300">
                + ${stats.totalBudgetUSDT >= 1000 ? `${(stats.totalBudgetUSDT / 1000).toFixed(1)}K` : stats.totalBudgetUSDT.toFixed(0)} USDT
              </span>
            )}
            {stats.totalBudgetNGN === 0 && stats.totalBudgetUSDT === 0 && <span className="text-white font-bold">—</span>}
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center bg-white/20 rounded-xl px-4 mb-3">
          <svg className="w-4 h-4 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search campaigns…"
            className="flex-1 bg-transparent py-3 px-3 text-white placeholder-white/60 text-sm focus:outline-none"
          />
          {search && (
            <button onClick={() => onSearchChange('')} className="text-white/70 hover:text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => { setSortBy(o.value); fetchCampaigns({ refresh: true, newSort: o.value }); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                sortBy === o.value ? 'bg-white text-orange-500 font-bold' : 'bg-white/20 text-white'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign list */}
      <div className="p-4 max-w-3xl mx-auto space-y-3">
        {loading && page === 1 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Fetching campaigns…</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <svg className="w-16 h-16 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.259a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-base font-bold text-gray-700">No Campaigns Found</h3>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              {search || platformFilter.length ? 'Try adjusting your filters.' : 'Check back soon — new campaigns launch daily!'}
            </p>
          </div>
        ) : (
          campaigns.map((c) => (
            <CampaignCard
              key={c._id}
              campaign={c}
              onOpenDetail={() => setSelectedCampaign(c)}
              onJoin={() => handleJoin(c)}
              joining={joining && selectedCampaign?._id === c._id}
            />
          ))
        )}

        {/* Infinite scroll sentinel */}
        <div ref={loaderRef} className="flex justify-center py-4">
          {loadingMore && <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />}
        </div>
      </div>

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <DetailModal
          campaign={selectedCampaign}
          joining={joining}
          onClose={() => setSelectedCampaign(null)}
          onJoin={() => handleJoin(selectedCampaign)}
          onSubmit={() => navigate(`../submit-clipping/${selectedCampaign._id}`, { state: { campaignTitle: selectedCampaign.title } })}
        />
      )}

      {/* Filter Modal */}
      {filterOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setFilterOpen(false)}>
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-base font-bold text-gray-900">Filter by Platform</h3>
              <button onClick={resetFilter} className="text-orange-500 text-sm font-semibold">Reset</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              {PLATFORM_OPTIONS.map((p) => {
                const on = tempPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setTempPlatforms((prev) => on ? prev.filter((x) => x !== p.id) : [...prev, p.id])}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                      on ? 'bg-orange-50 border-orange-400 text-orange-600' : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={applyFilter}
              className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CampaignCard ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign: c, onOpenDetail, onJoin, joining }: {
  campaign: ClippingCampaign;
  onOpenDetail: () => void;
  onJoin: () => void;
  joining: boolean;
}) {
  const earningRate = c.clipperCpm ?? (c.costPerThousand * 0.4);
  return (
    <div
      onClick={onOpenDetail}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Advertiser row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">{advInitials(c.advertiser)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{advLabel(c.advertiser)}</p>
          <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
          c.hasJoined ? 'bg-violet-50 text-violet-600' : 'bg-emerald-50 text-emerald-600'
        }`}>
          {c.hasJoined ? 'Joined ✓' : '● Active'}
        </span>
      </div>

      <h3 className="font-bold text-gray-900 text-sm mb-3 line-clamp-2">{c.title}</h3>

      {/* Stats */}
      <div className="flex bg-gray-50 rounded-xl p-3 mb-3 divide-x divide-gray-200">
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-gray-400">Budget</span>
          <span className="text-xs font-bold text-gray-900">{fmtMoney(c.budget, c.currency)}</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-gray-400">You Earn/1K</span>
          <span className="text-xs font-bold text-emerald-500">{fmtCpm(earningRate, c.currency)}</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-gray-400">Target Views</span>
          <span className="text-xs font-bold text-gray-900">{(c.estimatedViews / 1000).toFixed(0)}K</span>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${c.completionPct}%` }} />
        </div>
        <span className="text-[11px] text-gray-400 shrink-0">{c.completionPct}% done</span>
      </div>

      {/* Platforms */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {c.platforms.slice(0, 5).map((p) => (
          <span key={p} className="bg-orange-50 text-orange-500 text-[11px] px-2.5 py-0.5 rounded-full capitalize">{p}</span>
        ))}
      </div>

      {/* Join button */}
      <button
        onClick={(e) => { e.stopPropagation(); onJoin(); }}
        disabled={joining}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 ${
          c.hasJoined
            ? 'bg-orange-50 border-2 border-orange-400 text-orange-500 hover:bg-orange-100'
            : 'bg-orange-500 text-white hover:bg-orange-600'
        }`}
      >
        {joining ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : (
          <>{c.hasJoined ? 'Submit Proof' : 'Join Campaign'}<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>
        )}
      </button>
    </div>
  );
}

// ─── DetailModal ──────────────────────────────────────────────────────────────
function DetailModal({ campaign: c, joining, onClose, onJoin, onSubmit }: {
  campaign: ClippingCampaign; joining: boolean;
  onClose: () => void; onJoin: () => void; onSubmit: () => void;
}) {
  const earningRate = c.clipperCpm ?? (c.costPerThousand * 0.4);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="text-base font-bold text-gray-900">Campaign Details</h3>
          <div className="w-8" />
        </div>

        <div className="p-5 space-y-4">
          {/* Advertiser */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold">{advInitials(c.advertiser)}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">{advLabel(c.advertiser)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Posted {new Date(c.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <h2 className="text-lg font-extrabold text-gray-900">{c.title}</h2>

          {/* Earnings banner */}
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-emerald-600">Your Earning Rate</p>
              <p className="text-xl font-extrabold text-emerald-500">{fmtCpm(earningRate, c.currency)} per 1,000 views</p>
            </div>
          </div>

          {/* Video link */}
          <a
            href={c.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-orange-50 rounded-xl p-3 hover:bg-orange-100 transition-colors"
          >
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
              <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
            <span className="text-orange-600 font-semibold text-sm flex-1">Watch Source Video</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* Stats grid */}
          <div className="grid grid-cols-2 bg-gray-50 rounded-2xl p-2 gap-px">
            {[
              ['Total Budget',        fmtMoney(c.budget, c.currency),          false],
              ['You Earn / 1K Views', fmtCpm(earningRate, c.currency),         true ],
              ['Target Views',        c.estimatedViews.toLocaleString(),        false],
              ['Remaining Budget',    fmtMoney(c.remainingBudget, c.currency),  false],
            ].map(([lbl, val, green]) => (
              <div key={lbl as string} className="flex flex-col p-3">
                <span className="text-[11px] text-gray-400">{lbl as string}</span>
                <span className={`text-sm font-bold mt-1 ${green ? 'text-emerald-500' : 'text-gray-900'}`}>{val as string}</span>
              </div>
            ))}
          </div>

          {/* Platforms */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Allowed Platforms</p>
            <div className="flex flex-wrap gap-2">
              {c.platforms.map((p) => (
                <span key={p} className="bg-orange-50 text-orange-500 text-xs px-3 py-1.5 rounded-full capitalize font-medium">{p}</span>
              ))}
            </div>
          </div>

          {/* Directions */}
          {c.directions?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Editing Directions</p>
              <ul className="space-y-2">
                {c.directions.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                    <span className="text-sm text-gray-600 leading-snug">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hashtags */}
          {c.hashtags?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Required Hashtags</p>
              <div className="flex flex-wrap gap-2">
                {c.hashtags.map((tag, i) => (
                  <span key={i} className="bg-blue-50 text-blue-500 text-xs px-3 py-1 rounded-full font-medium">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-sm font-bold text-gray-700 mb-3">How Clipping Works</p>
            {[
              'Watch the source video & clip / edit it creatively',
              'Post your clip on the allowed platforms',
              'Submit your post link + view count as proof',
              'Admin verifies & credits your wallet instantly',
              'Update views as they grow for additional pay',
            ].map((txt, i) => (
              <div key={i} className="flex items-center gap-3 mb-2.5">
                <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center shrink-0 text-orange-500 font-bold text-xs">
                  {i + 1}
                </div>
                <span className="text-sm text-gray-600">{txt}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={c.hasJoined ? onSubmit : onJoin}
            disabled={joining || c.completionPct >= 100}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-colors disabled:opacity-60 ${
              c.hasJoined
                ? 'bg-orange-50 border-2 border-orange-400 text-orange-500'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {joining ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>{c.hasJoined ? 'Go to Submission' : c.completionPct >= 100 ? 'Campaign Full' : 'Join & Start Clipping'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
