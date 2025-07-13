// File: src/components/admin/AdminOverview.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  HiOutlineUsers,
  HiOutlineClipboardList,
  HiOutlineDocument,
  HiOutlineCash,
  HiOutlineExclamationCircle,
  HiOutlineChartBar,
  HiOutlineBadgeCheck,
  HiOutlinePuzzle,
  HiOutlineUserGroup,
  HiLockClosed,
} from 'react-icons/hi';

interface AdminStats {
  totalClippers: number;
  totalAdvertisers: number;
  totalAdminWorkers: number;
  totalSuperAdmins: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalSubmissions: number;
  pendingWithdrawals: number;
  totalRevenue: number;
  pendingSubscriptions: number;
  activeClipperPendingApproval: number;
  totalSubscriptions: number;
  platformWalletBalance: number;
  totalEscrowLocked: number;
}

const ICON_MAP: Record<keyof AdminStats, React.ComponentType<{ className?: string }>> = {
  totalClippers: HiOutlineUsers,
  totalAdvertisers: HiOutlineUserGroup || HiOutlineUsers,
  totalAdminWorkers: HiOutlinePuzzle,
  totalSuperAdmins: HiOutlineBadgeCheck,
  totalCampaigns: HiOutlineClipboardList,
  activeCampaigns: HiOutlineChartBar,
  totalSubmissions: HiOutlineDocument,
  pendingWithdrawals: HiOutlineExclamationCircle,
  totalRevenue: HiOutlineCash,
  pendingSubscriptions: HiOutlineDocument,
  activeClipperPendingApproval: HiOutlineDocument,
  totalSubscriptions: HiOutlineDocument,
  platformWalletBalance: HiOutlineCash,
  totalEscrowLocked: HiLockClosed,
};

const VARIANTS: Record<keyof AdminStats, string> = {
  // User-related stats (cool colors)
  totalClippers: 'teal',
  totalAdvertisers: 'blue',
  totalAdminWorkers: 'indigo',
  totalSuperAdmins: 'violet',

  // Campaign-related stats (purple/pink range)
  totalCampaigns: 'purple',
  activeCampaigns: 'fuchsia',
  totalSubmissions: 'rose',
  pendingSubscriptions: 'pink',
  activeClipperPendingApproval: 'lightBlue',

  // Financial stats (warm colors)
  totalRevenue: 'amber',
  pendingWithdrawals: 'orange',
  platformWalletBalance: 'green',
  totalEscrowLocked: 'emerald',
  totalSubscriptions: 'cyan'
};

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get<AdminStats>('/admin/stats');
        setStats(res.data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load admin stats.');
      }
    };

    fetchStats(); // initial load

    const interval = setInterval(() => {
      fetchStats();
    }, 15000); // 15 seconds

    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  if (error) {
    return <p className="text-red-500 text-center py-10">{error}</p>;
  }
  if (!stats) {
    return <p className="text-gray-500 text-center py-10">Loading overview…</p>;
  }

  // Transform into cards
  const cards: {
    key: keyof AdminStats;
    label: string;
    value: string | number;
  }[] = [
      { key: 'totalClippers', label: 'Clippers', value: stats.totalClippers },
      { key: 'totalAdvertisers', label: 'Advertisers', value: stats.totalAdvertisers },
      { key: 'totalAdminWorkers', label: 'Admin Workers logged in', value: stats.totalAdminWorkers },
      { key: 'totalSuperAdmins', label: 'Super Admins', value: stats.totalSuperAdmins },
      { key: 'totalCampaigns', label: 'Total Campaigns (all)', value: stats.totalCampaigns },
      { key: 'activeCampaigns', label: 'Active Campaigns', value: stats.activeCampaigns },
      { key: 'pendingWithdrawals', label: 'Withdrawals Pending', value: stats.pendingWithdrawals },
      { key: 'activeClipperPendingApproval', label: 'Total Clippper Pending Approval', value: stats.activeClipperPendingApproval },
      { key: 'totalRevenue', label: 'Total Wallets Balance (₦)', value: `₦${stats.totalRevenue.toLocaleString()}` },
      { key: 'platformWalletBalance', label: 'Platform Wallet (₦)', value: `₦${stats.platformWalletBalance.toLocaleString()}` },
      { key: 'totalEscrowLocked', label: 'Total Escrowed Funds Locked (₦)', value: `₦${stats.totalEscrowLocked.toLocaleString()}` },

      // { key: 'totalSubscriptions', label: 'Subscriptions (total)',  value: stats.totalSubscriptions },
      // { key: 'pendingSubscriptions', label: 'Subscriptions (pending)', value: stats.pendingSubscriptions },
    ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map(({ key, label, value }) => {
        const Icon = ICON_MAP[key];
        const variant = VARIANTS[key];
        return (
          <div key={key} className="card p-6" data-variant={variant}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium opacity-90">{label}</p>
              <Icon className="w-6 h-6 opacity-80" />
            </div>
            <p className="mt-3 text-3xl font-extrabold">{value}</p>
          </div>
        );
      })}
    </div>
  );
}
