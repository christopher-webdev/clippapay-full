// File: src/components/advertiser/AdvertiserDashboardOverview.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  HiClipboardList,
  HiFilm,
  HiCurrencyDollar,
  HiLockClosed,
} from 'react-icons/hi';

interface OverviewStats {
  totalCampaigns:         number;
  totalClippingCampaigns: number;
  totalViewsBought:       number;
  walletBalance:          number;
  fundsInEscrow:          number;
  usdtBalance:            number;
  usdtEscrowLocked:       number;
  avgCPV:                 number;
  totalClippers:          number;
}

// ─── Card definitions ─────────────────────────────────────────────────────────
type CardKey =
  | 'totalCampaigns'
  | 'totalClippingCampaigns'
  | 'walletBalance'
  | 'fundsInEscrow'
  | 'usdtBalance'
  | 'usdtEscrowLocked';

interface CardDef {
  key:     CardKey;
  label:   string;
  variant: string;
  Icon:    React.ElementType;
  format:  (v: number) => string;
}

const fmtNGN  = (v: number) => `₦${v.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
const fmtUSDT = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CARDS: CardDef[] = [
  {
    key:     'totalCampaigns',
    label:   'UGC Campaigns',
    variant: 'blue',
    Icon:    HiClipboardList,
    format:  (v) => String(v),
  },
  {
    key:     'totalClippingCampaigns',
    label:   'Clipping Campaigns',
    variant: 'cyan',
    Icon:    HiFilm,
    format:  (v) => String(v),
  },
  {
    key:     'walletBalance',
    label:   'NGN Balance',
    variant: 'teal',
    Icon:    HiCurrencyDollar,
    format:  fmtNGN,
  },
  {
    key:     'fundsInEscrow',
    label:   'NGN in Escrow',
    variant: 'rose',
    Icon:    HiLockClosed,
    format:  fmtNGN,
  },
  {
    key:     'usdtBalance',
    label:   'USDT Balance',
    variant: 'amber',
    Icon:    HiCurrencyDollar,
    format:  fmtUSDT,
  },
  {
    key:     'usdtEscrowLocked',
    label:   'USDT in Escrow',
    variant: 'purple',
    Icon:    HiLockClosed,
    format:  fmtUSDT,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
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

  if (error) return <p className="text-center py-10 text-red-500">{error}</p>;
  if (!stats) return <p className="text-center py-10 text-gray-500">Loading overview…</p>;

  return (
    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {CARDS.map(({ key, label, variant, Icon, format }) => (
        <div key={key} className="card p-6" data-variant={variant}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium opacity-90">{label}</p>
            <Icon className="w-6 h-6 opacity-80" />
          </div>
          <p className="mt-3 text-3xl font-extrabold">
            {format(stats[key])}
          </p>
        </div>
      ))}
    </div>
  );
}