// File: src/components/advertiser/AdvertiserDashboardOverview.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  HiClipboardList,
  HiEye,
  HiCurrencyDollar,
  HiOutlineChartBar,
  HiOutlineUsers,
  HiLockClosed,
} from 'react-icons/hi';

interface OverviewStats {
  totalCampaigns: number;
  walletBalance: number;
  fundsInEscrow: number;
  totalClippers: number;

}

const ICONS = {
  totalCampaigns: HiClipboardList,

  totalViewsBought: HiEye,
  walletBalance: HiCurrencyDollar,
  // avgCPV: HiCurrencyDollar,
  totalClippers: HiOutlineUsers,
  fundsInEscrow: HiLockClosed,
} as const;

const VARIANTS = {
  totalCampaigns: 'blue',
  totalViewsBought: 'cyan',
  walletBalance: 'teal',
  avgCPV: 'cyan',
  totalClippers: 'amber',
  fundsInEscrow: 'rose',
} as const;

export default function AdvertiserDashboardOverview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<OverviewStats>('/advertiser/stats')
      .then(res => setStats(res.data))
      .catch(err => {
        console.error(err);
        setError('Failed to load stats.');
      });
  }, []);

  if (error) {
    return <p className="text-center py-10 text-red-500">{error}</p>;
  }
  if (!stats) {
    return <p className="text-center py-10 text-gray-500">Loading overview…</p>;
  }

  const allowedKeys = [
    'totalCampaigns',
    // 'totalViewsBought',
    'walletBalance',
    'fundsInEscrow',
    // 'totalClippers'
  ];

  const cards = (Object.entries(stats) as [keyof OverviewStats, number][])
    .filter(([key]) => allowedKeys.includes(key))
    .map(([key, value]) => ({
      key,
      label: {
        totalCampaigns: 'Campaigns',
        totalViewsBought: 'Views Bought',
        walletBalance: 'Wallet Balance',
        fundsInEscrow: 'Funds in Escrow',    // <--- Add this label
        totalClippers: 'Clippers Engaged',
      }[key],
      display:
        key === 'walletBalance' || key === 'fundsInEscrow'
          ? `₦${value.toLocaleString()}`
          : key === 'totalViewsBought'
            ? value.toLocaleString()
            : value,
    }));



  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map(({ key, label, display }) => {
        const Icon = ICONS[key];
        const variant = VARIANTS[key];
        return (
          <div key={key} className="card p-6" data-variant={variant}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium opacity-90">{label}</p>
              <Icon className="w-6 h-6 opacity-80" />
            </div>
            <p className="mt-3 text-3xl font-extrabold">{display}</p>
          </div>
        );
      })}
    </div>
  );
}
