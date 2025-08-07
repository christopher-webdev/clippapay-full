import React, { useEffect, useState } from 'react';
import {
  HiClipboardCheck,
  HiCollection,
  HiUpload,
  HiCurrencyDollar,
  HiClock,
  HiCheckCircle,
} from 'react-icons/hi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion'; // ✅ Install this if not already

interface ClipperStats {
  joinedCampaigns: number;
  submissions: number;
  pendingVerifications: number;
  activeCampaigns: number;
  walletBalance: number;
  totalEarned: number;
}

const ICONS: Record<keyof ClipperStats, React.ComponentType<{ className?: string }>> = {
  joinedCampaigns: HiClipboardCheck,
  submissions: HiUpload,
  pendingVerifications: HiClock,
  activeCampaigns: HiCollection,
  walletBalance: HiCurrencyDollar,
  totalEarned: HiCheckCircle,
};

const VARIANTS: Record<keyof ClipperStats, string> = {
  joinedCampaigns: 'indigo',
  submissions: 'teal',
  pendingVerifications: 'amber',
  activeCampaigns: 'sky',
  walletBalance: 'emerald',
  totalEarned: 'violet',
};

export default function ClipperDashboardOverview() {
  const [stats, setStats] = useState<ClipperStats | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    axios.get('/clippers/overview')
      .then(res => setStats(res.data))
      .catch(() => setStats(null));

    const timer = setTimeout(() => setShowBanner(false), 90000); // Hide after 60s
    return () => clearTimeout(timer);
  }, []);

  if (!stats) {
    return <p className="text-center py-10 text-gray-500">Loading overview…</p>;
  }

  const cards: { key: keyof ClipperStats; label: string; value: string | number }[] = [
    { key: 'joinedCampaigns', label: 'Campaigns Joined', value: stats.joinedCampaigns },
    { key: 'activeCampaigns', label: 'Active Campaigns', value: stats.activeCampaigns },
    { key: 'submissions', label: 'Submissions Made', value: stats.submissions },
    { key: 'pendingVerifications', label: 'Pending Verifications', value: stats.pendingVerifications },
    { key: 'walletBalance', label: 'Wallet Balance (₦)', value: `₦${stats.walletBalance?.toLocaleString?.() || 0}` },
    { key: 'totalEarned', label: 'Total Earned (₦)', value: `₦${stats.totalEarned?.toLocaleString?.() || 0}` },
  ];

  return (
    <div className="space-y-6">
      {/* 🔔 Scrolling Notification Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="bg-yellow-300 text-black-900 px-4 py-3 rounded-md shadow text-sm font-medium overflow-hidden relative"
          >
            <div className="animate-marquee whitespace-nowrap">
              📢 <strong>ClippaPay Update:</strong> Earnings per 1,000 views have increased from ₦200 to ₦500! This applies to all new campaigns.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔢 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(({ key, label, value }) => {
          const Icon = ICONS[key];
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
    </div>
  );
}
