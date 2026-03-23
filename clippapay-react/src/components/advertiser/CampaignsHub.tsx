// components/advertiser/CampaignsHub.tsx
// Central hub — lets the advertiser choose between UGC and Clipping campaigns.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://clippapay.com/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HubStats {
  ugc:      { total: number; active: number };
  clipping: { total: number; active: number; totalViews: number; totalSpent: number; currency: string };
}

const getToken = () => localStorage.getItem('token');

// ─── Component ────────────────────────────────────────────────────────────────
export default function CampaignsHub() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<HubStats>({
    ugc:      { total: 0, active: 0 },
    clipping: { total: 0, active: 0, totalViews: 0, totalSpent: 0, currency: 'NGN' },
  });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { navigate('/login'); return; }
      const headers = { Authorization: `Bearer ${token}` };

      const [ugcRes, clipRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/campaigns/my`, { headers }),
        axios.get(`${API_BASE}/campaigns/clipping?limit=200`, { headers }),
      ]);

      if (ugcRes.status === 'fulfilled') {
        const list = ugcRes.value.data.campaigns || [];
        setStats((s) => ({
          ...s,
          ugc: { total: list.length, active: list.filter((c: any) => c.status === 'active').length },
        }));
      }

      if (clipRes.status === 'fulfilled') {
        const list = clipRes.value.data.campaigns || [];
        const totalSpent = list.reduce((a: number, c: any) => a + (c.totalSpent || 0), 0);
        const totalViews = list.reduce((a: number, c: any) => a + (c.totalViews || 0), 0);
        setStats((s) => ({
          ...s,
          clipping: {
            total:  list.length,
            active: list.filter((c: any) => c.status === 'active').length,
            totalSpent,
            totalViews,
            currency: list[0]?.currency || 'NGN',
          },
        }));
      }
    } catch (err) {
      console.error('hub stats:', err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-indigo-500 px-6 pt-8 pb-6 rounded-b-3xl">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">My Campaigns</h1>
        <p className="text-indigo-100 text-sm mt-1 mb-5">Manage your UGC and Clipping campaigns</p>

        {/* Summary pills */}
        <div className="bg-white/20 rounded-2xl p-4 flex divide-x divide-white/30">
          <PillStat val={stats.ugc.total + stats.clipping.total} label="Total" />
          <PillStat val={stats.ugc.active + stats.clipping.active} label="Active" />
          <PillStat val={stats.clipping.totalViews.toLocaleString()} label="Clip Views" />
        </div>
      </div>

      <div className="p-5 space-y-4 max-w-3xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mt-2">Choose Campaign Type</p>

            {/* ── UGC Card ── */}
            <TypeCard
              gradient="from-indigo-500 to-indigo-700"
              iconBg="bg-white/20"
              icon={
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              title="UGC Campaigns"
              subtitle="Commission creators to make original video content for your brand"
              stats={[
                { label: 'Total',  value: String(stats.ugc.total)  },
                { label: 'Active', value: String(stats.ugc.active) },
              ]}
              primaryLabel="View UGC Campaigns"
              secondaryLabel="Create UGC"
              onPrimary={() => navigate('campaigns')}
              onSecondary={() => navigate('campaigns/new')}
              accentColor="#6366F1"
            />

            {/* ── Clipping Card ── */}
            <TypeCard
              gradient="from-orange-500 to-orange-400"
              iconBg="bg-white/20"
              icon={
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.259a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
              title="Clipping Campaigns"
              subtitle="Have clippers share and distribute your existing videos across social platforms"
              stats={[
                { label: 'Total',  value: String(stats.clipping.total) },
                { label: 'Active', value: String(stats.clipping.active) },
                { label: 'Views',  value: stats.clipping.totalViews.toLocaleString() },
                { label: 'Spent',  value: `₦${(stats.clipping.totalSpent / 1000).toFixed(0)}K` },
              ]}
              primaryLabel="View Clipping Campaigns"
              secondaryLabel="Create Clipping"
              onPrimary={() => navigate('/dashboard/advertiser/clipping-campaigns')}
              onSecondary={() => navigate('/dashboard/advertiser/clipping-campaigns/new')}
              accentColor="#F97316"
            />

            {/* ── Quick actions ── */}
            <p className="text-xs font-bold text-gray-400 tracking-widest uppercase pt-1">Quick Actions</p>
            <div className="grid grid-cols-3 gap-3">
              <QuickBtn
                color="indigo"
                label="New UGC"
                onClick={() => navigate('campaigns/new')}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              />
              <QuickBtn
                color="orange"
                label="New Clipping"
                onClick={() => navigate('/dashboard/advertiser/clipping-campaigns/new')}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                }
              />
              <QuickBtn
                color="emerald"
                label="Wallet"
                onClick={() => navigate('/dashboard/advertiser/wallet')}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── TypeCard ─────────────────────────────────────────────────────────────────
function TypeCard({
  gradient, icon, iconBg, title, subtitle, stats, primaryLabel, secondaryLabel, onPrimary, onSecondary, accentColor,
}: {
  gradient: string; icon: React.ReactNode; iconBg: string; title: string; subtitle: string;
  stats: { label: string; value: string }[];
  primaryLabel: string; secondaryLabel: string;
  onPrimary: () => void; onSecondary: () => void;
  accentColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* Gradient header */}
      <div className={`bg-gradient-to-r ${gradient} p-5 flex items-center gap-4`}>
        <div className={`${iconBg} w-13 h-13 rounded-full flex items-center justify-center w-12 h-12 shrink-0`}>
          {icon}
        </div>
        <div>
          <h3 className="text-white font-extrabold text-lg leading-tight">{title}</h3>
          <p className="text-white/80 text-xs mt-1 leading-snug">{subtitle}</p>
        </div>
      </div>

      <div className="p-4">
        {/* Stats row */}
        {stats.length > 0 && (
          <div className="flex bg-gray-50 rounded-xl p-3 mb-4 divide-x divide-gray-200">
            {stats.map((s) => (
              <div key={s.label} className="flex-1 flex flex-col items-center">
                <span className="text-base font-extrabold text-gray-900">{s.value}</span>
                <span className="text-[10px] text-gray-400 mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onPrimary}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            {primaryLabel}
          </button>
          <button
            onClick={onSecondary}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors hover:bg-gray-50"
            style={{ borderColor: accentColor, color: accentColor }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PillStat ─────────────────────────────────────────────────────────────────
function PillStat({ val, label }: { val: string | number; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center px-2">
      <span className="text-lg font-extrabold text-white">{val}</span>
      <span className="text-[10px] text-white/75 mt-0.5">{label}</span>
    </div>
  );
}

// ─── QuickBtn ─────────────────────────────────────────────────────────────────
const colorMap: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  indigo:  { bg: 'bg-white', text: 'text-indigo-600',  border: 'border-indigo-100',  iconBg: 'bg-indigo-50'  },
  orange:  { bg: 'bg-white', text: 'text-orange-500',  border: 'border-orange-100',  iconBg: 'bg-orange-50'  },
  emerald: { bg: 'bg-white', text: 'text-emerald-600', border: 'border-emerald-100', iconBg: 'bg-emerald-50' },
};
function QuickBtn({ color, label, icon, onClick }: { color: string; label: string; icon: React.ReactNode; onClick: () => void }) {
  const c = colorMap[color] || colorMap.indigo;
  return (
    <button
      onClick={onClick}
      className={`${c.bg} ${c.border} border-2 rounded-2xl py-3 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className={`${c.iconBg} ${c.text} rounded-full p-2.5`}>{icon}</div>
      <span className={`${c.text} text-xs font-bold`}>{label}</span>
    </button>
  );
}
