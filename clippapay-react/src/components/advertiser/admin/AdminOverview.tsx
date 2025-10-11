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
  HiEye,
  HiOutlineVideoCamera
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
  pendingDeposits: number;
  totalRevenue: number;
  pendingSubscriptions: number;
  activeClipperPendingApproval: number;
  totalSubscriptions: number;
  platformWalletBalance: number;
  totalEscrowLocked: number;
  totalViewsSold: number;
  totalApprovedPgcVideos: number; // Added for PGC
}

const ICON_MAP: Record<keyof AdminStats, React.ComponentType<{ className?: string }>> = {
  totalClippers: HiOutlineUsers,
  totalAdvertisers: HiOutlineUserGroup,
  totalAdminWorkers: HiOutlinePuzzle,
  totalSuperAdmins: HiOutlineBadgeCheck,
  totalCampaigns: HiOutlineClipboardList,
  activeCampaigns: HiOutlineChartBar,
  totalSubmissions: HiOutlineDocument,
  pendingWithdrawals: HiOutlineExclamationCircle,
  pendingDeposits: HiOutlineExclamationCircle,
  totalRevenue: HiOutlineCash,
  pendingSubscriptions: HiOutlineDocument,
  activeClipperPendingApproval: HiOutlineDocument,
  totalSubscriptions: HiOutlineDocument,
  platformWalletBalance: HiOutlineCash,
  totalEscrowLocked: HiLockClosed,
  totalViewsSold: HiEye,
  totalApprovedPgcVideos: HiOutlineVideoCamera // Added for PGC
};

const VARIANTS: Record<keyof AdminStats, string> = {
  totalClippers: 'teal',
  totalAdvertisers: 'blue',
  totalAdminWorkers: 'indigo',
  totalSuperAdmins: 'violet',
  totalCampaigns: 'purple',
  activeCampaigns: 'fuchsia',
  totalSubmissions: 'rose',
  pendingSubscriptions: 'pink',
  activeClipperPendingApproval: 'lightBlue',
  totalRevenue: 'amber',
  pendingWithdrawals: 'orange',
  pendingDeposits: 'orange',
  platformWalletBalance: 'green',
  totalEscrowLocked: 'emerald',
  totalSubscriptions: 'cyan',
  totalViewsSold: 'cyan',
  totalApprovedPgcVideos: 'blue' // Added for PGC
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

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <p className="text-red-500 text-center py-10">{error}</p>;
  }
  if (!stats) {
    return <p className="text-gray-500 text-center py-10">Loading overview…</p>;
  }

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
      { key: 'pendingDeposits', label: 'Deposits Pending', value: stats.pendingDeposits },
      { key: 'activeClipperPendingApproval', label: 'Total Clipper Pending Approval', value: stats.activeClipperPendingApproval },
      { key: 'totalRevenue', label: 'Total Wallets Balance (₦)', value: `₦${stats.totalRevenue.toLocaleString()}` },
      { key: 'platformWalletBalance', label: 'Platform Wallet (₦)', value: `₦${stats.platformWalletBalance.toLocaleString()}` },
      { key: 'totalEscrowLocked', label: 'Total Escrowed Funds Locked (₦)', value: `₦${stats.totalEscrowLocked.toLocaleString()}` },
      { key: 'totalViewsSold', label: 'Verified Views Delivered', value: stats.totalViewsSold.toLocaleString() },
      { key: 'totalApprovedPgcVideos', label: 'Approved PGC Videos', value: stats.totalApprovedPgcVideos.toLocaleString() } // Added for PGC
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