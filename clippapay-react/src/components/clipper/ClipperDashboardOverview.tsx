import React, { useEffect, useRef, useState } from "react";
import {
  HiClipboardCheck,
  HiCollection,
  HiUpload,
  HiCurrencyDollar,
  HiClock,
  HiCheckCircle,
} from "react-icons/hi";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

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
  joinedCampaigns: "indigo",
  submissions: "teal",
  pendingVerifications: "amber",
  activeCampaigns: "sky",
  walletBalance: "emerald",
  totalEarned: "violet",
};

/* =========================
   Scrolling News Ticker
   ========================= */
function ClippaPayTicker({
  showBanner,
  speed = 180, // ⏩ pixels/sec (increase for faster)
}: {
  showBanner: boolean;
  speed?: number;
}) {
  const messages = [
    "📢 ClippaPay Update: Earnings per 1,000 views have increased from ₦200 to ₦500 for all new campaigns.",
    "🆕 UGC is live: Earn ₦2,000 per 1,000 views by creating videos to an advertiser’s brief. Check the Campaign Jobs section for details and new tasks.",
  ];
  const tickerText = messages.join("   •   ");

  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLSpanElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!copyRef.current) return;
      setContentWidth(copyRef.current.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    if (copyRef.current) ro.observe(copyRef.current);
    return () => ro.disconnect();
  }, [tickerText]);

  const duration = contentWidth > 0 ? contentWidth / speed : 10;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="bg-yellow-300 text-black px-4 py-3 rounded-md shadow text-sm font-medium overflow-hidden relative"
        >
          <div ref={trackRef} className="relative overflow-hidden">
            <motion.div
              className="flex whitespace-nowrap will-change-transform"
              animate={{ x: [0, -contentWidth] }}
              transition={{ duration, ease: "linear", repeat: Infinity }}
            >
              <span ref={copyRef} className="pr-12">
                {tickerText}
              </span>
              <span className="pr-12">{tickerText}</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* =========================
   Dashboard Overview
   ========================= */
export default function ClipperDashboardOverview() {
  const [stats, setStats] = useState<ClipperStats | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    axios
      .get("/clippers/overview")
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));

    // Hide after 90 seconds
   // const timer = setTimeout(() => setShowBanner(false), 90_000);
    return //() => clearTimeout(timer);
  }, []);

  if (!stats) {
    return <p className="text-center py-10 text-gray-500">Loading overview…</p>;
  }

  const cards: { key: keyof ClipperStats; label: string; value: string | number }[] = [
    { key: "joinedCampaigns", label: "Campaigns Joined", value: stats.joinedCampaigns },
    { key: "activeCampaigns", label: "Active Campaigns", value: stats.activeCampaigns },
    { key: "submissions", label: "Submissions Made", value: stats.submissions },
    { key: "pendingVerifications", label: "Pending Verifications", value: stats.pendingVerifications },
    {
      key: "walletBalance",
      label: "Wallet Balance (₦)",
      value: `₦${stats.walletBalance?.toLocaleString?.() || 0}`,
    },
    {
      key: "totalEarned",
      label: "Total Earned (₦)",
      value: `₦${stats.totalEarned?.toLocaleString?.() || 0}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 🔔 News Banner */}
      <ClippaPayTicker showBanner={showBanner} speed={100} /> {/* ⚡ Fast scroll */}

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
