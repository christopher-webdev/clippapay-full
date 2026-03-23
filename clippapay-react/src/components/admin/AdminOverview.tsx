// components/admin/AdminOverview.tsx
// EXTENDED:
//  - UGC campaigns vs Clipping campaigns (separate counts + pending)
//  - NGN + USDT wallet pool totals
//  - NGN + USDT escrow breakdown
//  - Deposit / withdrawal breakdowns per currency
//  - Platform wallet (NGN + USDT)
//  - Clipping campaign financials
//  - Auto-refresh every 15 seconds

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  HiOutlineUsers, HiOutlineClipboardList, HiOutlineDocument,
  HiOutlineCash, HiOutlineExclamationCircle, HiOutlineChartBar,
  HiOutlineBadgeCheck, HiOutlinePuzzle, HiOutlineUserGroup,
  HiLockClosed, HiEye, HiOutlineVideoCamera, HiClock,
  HiTrendingUp, HiTrendingDown,
} from 'react-icons/hi';
import { MdOutlineMovieFilter } from 'react-icons/md';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface AdminStats {
  // Users
  totalClippers:              number;
  totalAdvertisers:           number;
  totalAdminWorkers:          number;
  totalSuperAdmins:           number;

  // UGC campaigns
  totalCampaigns:             number;
  totalUgcCampaigns:          number;
  activeUgcCampaigns:         number;
  pendingUgcCampaigns:        number;
  videoSubmittedCampaigns:    number;
  completedUgcCampaigns:      number;
  totalApprovedVideos:        number;
  activeCampaigns:            number;

  // Clipping campaigns
  totalClippingCampaigns:     number;
  activeClippingCampaigns:    number;
  pendingClippingCampaigns:   number;
  clippingBudgetNGN:          number;
  clippingSpentNGN:           number;
  clippingBudgetUSDT:         number;
  clippingSpentUSDT:          number;
  totalClippingViews:         number;

  // Submissions
  totalSubmissions:           number;
  activeClipperPendingApproval: number;

  // Deposits
  pendingDeposits:            number;
  approvedDepositsNGN:        number;
  approvedDepositsUSDT:       number;

  // Withdrawals
  pendingWithdrawals:         number;
  completedWithdrawalsNGN:    number;
  completedWithdrawalsUSDT:   number;

  // Wallet pool
  totalNGNBalance:            number;
  totalNGNEscrow:             number;
  totalUSDTBalance:           number;
  totalUSDTEscrow:            number;
  totalNGNInSystem:           number;
  totalUSDTInSystem:          number;

  // Platform wallet
  platformWalletBalance:      number;
  platformWalletUSDT:         number;

  // Legacy / misc
  totalRevenue:               number;
  totalEscrowLocked:          number;
  totalUSDTEscrowLocked:      number;
  totalViewsSold:             number;
  pendingSubscriptions:       number;
  totalSubscriptions:         number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtNGN  = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
const fmtUSDT = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Card component ───────────────────────────────────────────────────────────
interface CardProps {
  label:   string;
  value:   string | number;
  Icon:    React.ElementType;
  variant: string;
  sub?:    string;
}

const VARIANT_STYLES: Record<string, string> = {
  teal:      'bg-teal-50 border-teal-100 text-teal-800',
  blue:      'bg-blue-50 border-blue-100 text-blue-800',
  indigo:    'bg-indigo-50 border-indigo-100 text-indigo-800',
  violet:    'bg-violet-50 border-violet-100 text-violet-800',
  purple:    'bg-purple-50 border-purple-100 text-purple-800',
  fuchsia:   'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-800',
  rose:      'bg-rose-50 border-rose-100 text-rose-800',
  pink:      'bg-pink-50 border-pink-100 text-pink-800',
  amber:     'bg-amber-50 border-amber-100 text-amber-800',
  orange:    'bg-orange-50 border-orange-100 text-orange-800',
  green:     'bg-green-50 border-green-100 text-green-800',
  emerald:   'bg-emerald-50 border-emerald-100 text-emerald-800',
  cyan:      'bg-cyan-50 border-cyan-100 text-cyan-800',
  sky:       'bg-sky-50 border-sky-100 text-sky-800',
  red:       'bg-red-50 border-red-100 text-red-800',
  gray:      'bg-gray-50 border-gray-100 text-gray-800',
  yellow:    'bg-yellow-50 border-yellow-100 text-yellow-800',
};

function StatCard({ label, value, Icon, variant, sub }: CardProps) {
  const cls = VARIANT_STYLES[variant] || VARIANT_STYLES.gray;
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-2 ${cls}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
        <Icon className="w-5 h-5 opacity-60" />
      </div>
      <p className="text-2xl font-extrabold leading-none">{value}</p>
      {sub && <p className="text-xs opacity-60 font-medium">{sub}</p>}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string;
  icon:  React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        <Icon className="w-5 h-5 text-gray-500" />
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {children}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminOverview() {
  const [stats, setStats]   = useState<AdminStats | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [lastUpdate, setLU] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      const res = await axios.get<AdminStats>(`${API_BASE}/admin/stats`, { withCredentials: true });
      setStats(res.data);
      setLU(new Date());
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load admin stats.');
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15_000);
    return () => clearInterval(interval);
  }, []);

  if (error) return <p className="text-red-500 text-center py-10">{error}</p>;
  if (!stats) return (
    <div className="flex items-center justify-center py-20 gap-3">
      <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 font-medium">Loading overview…</p>
    </div>
  );

  return (
    <div className="space-y-8 p-1">

      {/* Last updated */}
      {lastUpdate && (
        <p className="text-xs text-gray-400 text-right font-medium">
          Updated {lastUpdate.toLocaleTimeString()} · auto-refresh every 15s
        </p>
      )}

      {/* ── USERS ── */}
      <Section title="Users" icon={HiOutlineUsers}>
        <StatCard label="Clippers"           value={stats.totalClippers}     Icon={HiOutlineUsers}      variant="teal"    />
        <StatCard label="Advertisers"        value={stats.totalAdvertisers}  Icon={HiOutlineUserGroup}  variant="blue"    />
        <StatCard label="Admin Workers"      value={stats.totalAdminWorkers} Icon={HiOutlinePuzzle}     variant="indigo"  />
        <StatCard label="Super Admins"       value={stats.totalSuperAdmins}  Icon={HiOutlineBadgeCheck} variant="violet"  />
      </Section>

      {/* ── UGC CAMPAIGNS ── */}
      <Section title="UGC Campaigns" icon={HiOutlineClipboardList}>
        <StatCard label="Total UGC Campaigns"    value={stats.totalUgcCampaigns}         Icon={HiOutlineClipboardList} variant="purple"
          sub={`${stats.activeUgcCampaigns} active`} />
        <StatCard label="Pending Admin Approval" value={stats.pendingUgcCampaigns}        Icon={HiClock}               variant="amber"   />
        <StatCard label="Active"                 value={stats.activeUgcCampaigns}         Icon={HiOutlineChartBar}     variant="emerald" />
        <StatCard label="Video Submitted"        value={stats.videoSubmittedCampaigns}    Icon={HiOutlineVideoCamera}  variant="sky"
          sub="Awaiting advertiser review" />
        <StatCard label="Completed"              value={stats.completedUgcCampaigns}      Icon={HiOutlineBadgeCheck}   variant="green"   />
        <StatCard label="Approved Videos"        value={stats.totalApprovedVideos}        Icon={HiOutlineVideoCamera}  variant="teal"
          sub="Videos accepted by advertisers" />
        {/* <StatCard label="Views Delivered"        value={stats.totalViewsSold.toLocaleString()} Icon={HiEye}            variant="cyan"    /> */}
    
      </Section>

      {/* ── CLIPPING CAMPAIGNS ── */}
      <Section title="Clipping Campaigns" icon={MdOutlineMovieFilter}>
        <StatCard label="Total Clipping"         value={stats.totalClippingCampaigns}   Icon={HiOutlineClipboardList} variant="purple"
          sub={`${stats.activeClippingCampaigns} active`} />
            {/* <StatCard label="Proof Submissions"      value={stats.totalSubmissions}           Icon={HiOutlineDocument}     variant="indigo"  /> */}
        <StatCard label="Proofs Pending Review"  value={stats.activeClipperPendingApproval} Icon={HiClock}            variant="orange"  />
        <StatCard label="Pending Approval"       value={stats.pendingClippingCampaigns} Icon={HiClock}       variant="amber"   />
        <StatCard label="Active Clipping"        value={stats.activeClippingCampaigns}  Icon={HiOutlineChartBar} variant="emerald" />
        <StatCard label="Total Clipping Views"   value={stats.totalClippingViews.toLocaleString()} Icon={HiEye} variant="cyan" />
        <StatCard label="NGN Budget (total)"     value={fmtNGN(stats.clippingBudgetNGN)}  Icon={HiOutlineCash}    variant="green"
          sub={`${fmtNGN(stats.clippingSpentNGN)} spent`} />
        <StatCard label="USDT Budget (total)"    value={fmtUSDT(stats.clippingBudgetUSDT)} Icon={HiOutlineCash}   variant="yellow"
          sub={`${fmtUSDT(stats.clippingSpentUSDT)} spent`} />
      </Section>

      {/* ── WALLET POOL ── */}
      <Section title="Wallet Pool (All Users)" icon={HiOutlineCash}>
        <StatCard label="NGN Available (pool)"   value={fmtNGN(stats.totalNGNBalance)}   Icon={HiOutlineCash}  variant="green"
          sub="Available balances" />
        <StatCard label="NGN in Escrow"          value={fmtNGN(stats.totalNGNEscrow)}    Icon={HiLockClosed}   variant="amber"
          sub="Locked in pending ops" />
        <StatCard label="NGN in System (total)"  value={fmtNGN(stats.totalNGNInSystem)}  Icon={HiTrendingUp}   variant="emerald"
          sub="Available + escrow" />
        <StatCard label="USDT Available (pool)"  value={fmtUSDT(stats.totalUSDTBalance)} Icon={HiOutlineCash}  variant="yellow"
          sub="Available balances" />
        <StatCard label="USDT in Escrow"         value={fmtUSDT(stats.totalUSDTEscrow)}  Icon={HiLockClosed}   variant="orange"
          sub="Locked in pending ops" />
        <StatCard label="USDT in System (total)" value={fmtUSDT(stats.totalUSDTInSystem)} Icon={HiTrendingUp}  variant="cyan"
          sub="Available + escrow" />
        <StatCard label="Platform Wallet NGN"    value={fmtNGN(stats.platformWalletBalance)} Icon={HiOutlineBadgeCheck} variant="indigo"
          sub="ClippaPay platform account" />
        <StatCard label="Platform Wallet USDT"   value={fmtUSDT(stats.platformWalletUSDT)}  Icon={HiOutlineBadgeCheck} variant="violet"
          sub="ClippaPay platform account" />
      </Section>

      {/* ── DEPOSITS ── */}
      <Section title="Deposits" icon={HiTrendingDown}>
        <StatCard label="Pending Deposits"       value={stats.pendingDeposits}             Icon={HiClock}          variant="orange"  />
        <StatCard label="Approved NGN Deposits"  value={fmtNGN(stats.approvedDepositsNGN)} Icon={HiTrendingDown}   variant="green"   />
        <StatCard label="Approved USDT Deposits" value={fmtUSDT(stats.approvedDepositsUSDT)} Icon={HiTrendingDown} variant="yellow"  />
      </Section>

      {/* ── WITHDRAWALS ── */}
      <Section title="Withdrawals" icon={HiTrendingUp}>
        <StatCard label="Pending Withdrawals"       value={stats.pendingWithdrawals}                Icon={HiClock}        variant="red"    />
        <StatCard label="Completed NGN Withdrawals" value={fmtNGN(stats.completedWithdrawalsNGN)}   Icon={HiTrendingUp}   variant="rose"   />
        <StatCard label="Completed USDT Withdrawals"value={fmtUSDT(stats.completedWithdrawalsUSDT)} Icon={HiTrendingUp}   variant="pink"   />
      </Section>

      {/* ── SUBSCRIPTIONS / MISC ── */}
      <Section title="Subscriptions & Misc" icon={HiOutlineDocument}>
        <StatCard label="Pending Subscriptions" value={stats.pendingSubscriptions} Icon={HiOutlineDocument} variant="pink"   />
        <StatCard label="Total Subscriptions"   value={stats.totalSubscriptions}   Icon={HiOutlineDocument} variant="purple" />
        <StatCard label="Net NGN Revenue"       value={fmtNGN(stats.totalRevenue)} Icon={HiOutlineCash}     variant="emerald"
          sub="Deposits – Withdrawals (NGN)" />
      </Section>

    </div>
  );
}