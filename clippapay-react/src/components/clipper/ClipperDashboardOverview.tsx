import React, { useEffect, useState } from "react";
import {
  HiClipboardCheck,
  HiCollection,
  HiUpload,
  HiCurrencyDollar,
  HiClock,
  HiCheckCircle,
} from "react-icons/hi";
import axios from "axios";

interface ClipperStats {
  joinedCampaigns: number;
  submissions: number;
  pendingVerifications: number;
  activeCampaigns: number;
  walletBalance: number;
  totalEarned: number;
}

interface RecentCampaign {
  _id: string;
  title: string;
  kind: "normal" | "ugc" | "pgc";
  createdAt: string;
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
   UPGRADED REAL-TIME TICKER (3 Days)
   ========================= */
function ClippaPayTicker() {
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);

  const permanentMessages = [
    "Earnings per 1,000 views increased to ₦500!",
    "UGC live → ₦2,000 per 1,000 views",
    "PGC available → ₦5,000 flat per approved video!",
  ];

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await axios.get("/campaigns/recent-for-ticker");
        setRecentCampaigns(res.data);
      } catch (err) {
        console.error("Failed to load recent campaigns");
      }
    };

    fetchRecent();
    const interval = setInterval(fetchRecent, 120_000); // Refresh every 2 mins
    return () => clearInterval(interval);
  }, []);

  const campaignMessages = recentCampaigns.map((camp) => {
    const badge = camp.kind === "ugc" ? " [UGC]" : camp.kind === "pgc" ? " [PGC]" : "";
    return `NEW CAMPAIGN${badge}: "${camp.title}" — Join now & start earing!`;
  });

  const allMessages = [...permanentMessages, ...campaignMessages];
  if (allMessages.length === 0) return null;

  const tickerText = allMessages.join("   •   ");

  return (
    <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold text-sm md:text-base px-6 py-4 rounded-xl shadow-2xl overflow-hidden">
      {/* Flashing bell when new campaigns exist */}
      {campaignMessages.length > 0 && (
        <div className="absolute -top-3 -right-3 text-5xl animate-pulse pointer-events-none">
          
        </div>
      )}

      <div className="overflow-hidden whitespace-nowrap">
        <div
          className="inline-block will-change-transform"
          style={{
            animation: `scroll-left ${Math.max(15, tickerText.length * 0.08)}s linear infinite`,
          }}
        >
          <span className="px-10">{tickerText}</span>
          <span className="px-10">{tickerText}</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

/* =========================
   MAIN DASHBOARD COMPONENT
   ========================= */
export default function ClipperDashboardOverview() {
  const [stats, setStats] = useState<ClipperStats | null>(null);

  useEffect(() => {
    axios
      .get("/clippers/overview")
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  if (!stats) {
    return <p className="text-center py-20 text-gray-500 text-lg">Loading your dashboard…</p>;
  }

  const cards = [
    { key: "joinedCampaigns" as const, label: "Campaigns Joined", value: stats.joinedCampaigns },
    { key: "activeCampaigns" as const, label: "Active Campaigns", value: stats.activeCampaigns },
    { key: "submissions" as const, label: "Submissions Made", value: stats.submissions },
    { key: "pendingVerifications" as const, label: "Pending Verifications", value: stats.pendingVerifications },
    { key: "walletBalance" as const, label: "Wallet Balance (₦)", value: `₦${stats.walletBalance.toLocaleString()}` },
    { key: "totalEarned" as const, label: "Total Earned (₦)", value: `₦${stats.totalEarned.toLocaleString()}` },
  ];

  return (
    <div className="space-y-8">
      {/* LIVE NEW CAMPAIGN TICKER */}
      <ClippaPayTicker />

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(({ key, label, value }) => {
          const Icon = ICONS[key];
          const variant = VARIANTS[key];
          return (
            <div
              key={key}
              className={`card bg-white rounded-2xl shadow-lg p-6 border-l-4 border-${variant}-500 transition-all hover:shadow-xl`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <Icon className={`w-8 h-8 text-${variant}-500`} />
              </div>
              <p className="mt-4 text-4xl font-extrabold text-gray-800">{value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}