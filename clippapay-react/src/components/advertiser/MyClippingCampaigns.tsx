// components/advertiser/MyClippingCampaigns.tsx
// Advertiser's list of all their clipping campaigns with stats & quick actions
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://clippapay.com/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClippingCampaign {
  _id: string;
  title: string;
  budget: number;
  currency: 'NGN' | 'USDT';
  costPerThousand: number;
  estimatedViews: number;
  totalSpent: number;
  totalViews: number;
  clipsCreated: number;
  platforms: string[];
  categories: string[];
  status: 'waiting_for_approval' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n.toLocaleString()}` : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const getToken = () => localStorage.getItem('token');

const STATUS_CFG = {
  waiting_for_approval: { label: 'Pending Approval', textColor: 'text-amber-600',   bg: 'bg-amber-50',   dot: 'bg-amber-500'  },
  active:               { label: 'Active',           textColor: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500'},
  completed:            { label: 'Completed',         textColor: 'text-gray-500',    bg: 'bg-gray-100',   dot: 'bg-gray-400'   },
  cancelled:            { label: 'Cancelled',         textColor: 'text-red-500',     bg: 'bg-red-50',     dot: 'bg-red-500'    },
} as const;

const FILTER_TABS = [
  { value: '',                     label: 'All'      },
  { value: 'active',               label: 'Active'   },
  { value: 'waiting_for_approval', label: 'Pending'  },
  { value: 'completed',            label: 'Done'     },
  { value: 'cancelled',            label: 'Cancelled'},
] as const;

// ─── Component ────────────────────────────────────────────────────────────────
export default function MyClippingCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns]   = useState<ClippingCampaign[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [summary, setSummary] = useState({ total: 0, totalSpent: 0, totalViews: 0, active: 0 });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const token = getToken();
      if (!token) { navigate('/login'); return; }

      const { data } = await axios.get(
        `${API_BASE}/campaigns/clipping?limit=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const all: ClippingCampaign[] = data.campaigns || [];
      const list = statusFilter ? all.filter((c) => c.status === statusFilter) : all;
      setCampaigns(list);

      setSummary({
        total:      all.length,
        active:     all.filter((c) => c.status === 'active').length,
        totalSpent: all.reduce((s, c) => s + (c.totalSpent || 0), 0),
        totalViews: all.reduce((s, c) => s + (c.totalViews || 0), 0),
      });
    } catch (err) {
      console.error('load clipping campaigns:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, navigate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient header */}
      <div className="bg-orange-500 px-5 pt-8 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/35 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white">My Clipping Campaigns</h1>
          </div>
          <button
            onClick={() => navigate('new')}
            className="w-9 h-9 rounded-full bg-white/30 flex items-center justify-center hover:bg-white/40 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Summary chips */}
        <div className="bg-white/20 rounded-2xl p-3 flex divide-x divide-white/30">
          {[
            { label: 'Total',       val: String(summary.total) },
            { label: 'Active',      val: String(summary.active) },
            { label: 'Total Spent', val: `₦${(summary.totalSpent / 1000).toFixed(0)}K` },
            { label: 'Total Views', val: `${(summary.totalViews / 1000).toFixed(0)}K` },
          ].map(({ label, val }) => (
            <div key={label} className="flex-1 flex flex-col items-center px-1">
              <span className="text-base font-extrabold text-white">{val}</span>
              <span className="text-[10px] text-white/80 mt-0.5">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === t.value
                  ? 'bg-orange-500 text-white font-bold'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-4 max-w-3xl mx-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState statusFilter={statusFilter} onCreateClick={() => navigate('new')} />
        ) : (
          campaigns.map((c) => (
            <CampaignCard
              key={c._id}
              campaign={c}
              onClick={() => navigate(c._id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── CampaignCard ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign: c, onClick }: { campaign: ClippingCampaign; onClick: () => void }) {
  const cfg = STATUS_CFG[c.status] || STATUS_CFG.active;
  const pct      = c.estimatedViews > 0 ? Math.min(100, Math.round(((c.totalViews || 0) / c.estimatedViews) * 100)) : 0;
  const spentPct = c.budget > 0 ? Math.min(100, Math.round(((c.totalSpent || 0) / c.budget) * 100)) : 0;
  const remaining = c.budget - (c.totalSpent || 0);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{c.title}</h3>
          <p className="text-xs text-gray-400 mt-1">{new Date(c.createdAt).toLocaleDateString()}</p>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${cfg.bg} ${cfg.textColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Stats 2×2 */}
      <div className="grid grid-cols-2 bg-gray-50 rounded-xl p-2 mb-3 gap-px">
        <StatCell label="Budget"      value={fmtMoney(c.budget, c.currency)} />
        <StatCell label="Spent"       value={fmtMoney(c.totalSpent || 0, c.currency)} accent />
        <StatCell label="Total Views" value={(c.totalViews || 0).toLocaleString()} />
        <StatCell label="Clippers"    value={String(c.clipsCreated || 0)} />
      </div>

      {/* Budget bar */}
      <div className="mb-2.5">
        <div className="flex justify-between text-[11px] text-gray-500 mb-1">
          <span>Budget Used</span>
          <span className="font-semibold text-gray-700">{spentPct}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${spentPct}%` }} />
        </div>
      </div>

      {/* Views bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-gray-500 mb-1">
          <span>Views Delivered</span>
          <span className="font-semibold text-gray-700">{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Platforms */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {c.platforms.slice(0, 5).map((p) => (
          <span key={p} className="bg-gray-100 text-gray-500 text-[11px] px-2.5 py-0.5 rounded-full capitalize">{p}</span>
        ))}
        {c.platforms.length > 5 && (
          <span className="bg-gray-100 text-gray-500 text-[11px] px-2.5 py-0.5 rounded-full">+{c.platforms.length - 5}</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
        <span className="text-xs text-gray-500">{fmtMoney(remaining, c.currency)} remaining</span>
        <span className="flex items-center gap-1 text-orange-500 text-xs font-semibold">
          Manage
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function StatCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col px-3 py-2">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className={`text-sm font-bold mt-0.5 ${accent ? 'text-red-500' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function EmptyState({ statusFilter, onCreateClick }: { statusFilter: string; onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center py-16 gap-3">
      <svg className="w-16 h-16 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.259a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <h3 className="text-base font-bold text-gray-700">No clipping campaigns yet</h3>
      <p className="text-sm text-gray-400 text-center max-w-xs leading-relaxed">
        {statusFilter
          ? 'No campaigns match this filter.'
          : 'Create your first clipping campaign and have creators spread your video across social media.'}
      </p>
      {!statusFilter && (
        <button
          onClick={onCreateClick}
          className="mt-2 flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Campaign
        </button>
      )}
    </div>
  );
}
