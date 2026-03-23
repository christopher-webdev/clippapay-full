import React, { useEffect, useState } from "react";
import {
  HiClipboardCheck,
  HiFilm,
  HiUpload,
  HiCurrencyDollar,
  HiClock,
  HiCheckCircle,
} from "react-icons/hi";
import axios from "axios";

interface ClipperStats {
  joinedCampaigns:      number;
  clippingCampaigns:    number;
  submissions:          number;
  pendingVerifications: number;
  walletBalance:        number;
  usdtBalance:          number;
  totalEarned:          number;
}

interface RecentCampaign {
  _id:       string;
  title:     string;
  kind:      "normal" | "ugc" | "pgc";
  createdAt: string;
}

// ─── Card definitions ─────────────────────────────────────────────────────────
interface CardDef {
  key:     keyof ClipperStats;
  label:   string;
  variant: string;
  Icon:    React.ComponentType<{ className?: string }>;
  format:  (v: number) => string;
}

const CARDS: CardDef[] = [
  {
    key:     "joinedCampaigns",
    label:   "UGC Campaigns Joined",
    variant: "indigo",
    Icon:    HiClipboardCheck,
    format:  (v) => String(v),
  },
  {
    key:     "clippingCampaigns",
    label:   "Clipping Campaigns Joined",
    variant: "sky",
    Icon:    HiFilm,
    format:  (v) => String(v),
  },
  {
    key:     "submissions",
    label:   "Submissions Made",
    variant: "teal",
    Icon:    HiUpload,
    format:  (v) => String(v),
  },
  {
    key:     "pendingVerifications",
    label:   "Pending Verifications",
    variant: "amber",
    Icon:    HiClock,
    format:  (v) => String(v),
  },
  {
    key:     "walletBalance",
    label:   "NGN Balance",
    variant: "emerald",
    Icon:    HiCurrencyDollar,
    format:  (v) => `₦${v.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`,
  },
  {
    key:     "usdtBalance",
    label:   "USDT Balance",
    variant: "yellow",
    Icon:    HiCurrencyDollar,
    format:  (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  // {
  //   key:     "totalEarned",
  //   label:   "Total Earned (₦)",
  //   variant: "violet",
  //   Icon:    HiCheckCircle,
  //   format:  (v) => `₦${v.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`,
  // },
];

// ─── Live ticker ──────────────────────────────────────────────────────────────
function ClippaPayTicker() {
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);

  const permanentMessages = [
    "Standard campaigns: $0.5 per thousand views",
    "Join our Telegram channel for instant updates → t.me/clippapay",
  ];

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await axios.get("/campaigns/recent-for-ticker");
        setRecentCampaigns(res.data);
      } catch {
        // silent — ticker still shows permanent messages
      }
    };
    fetchRecent();
    const interval = setInterval(fetchRecent, 120_000);
    return () => clearInterval(interval);
  }, []);

  const campaignMessages = recentCampaigns.map((camp) => {
    const badge =
      camp.kind === "ugc" ? " [UGC]" : camp.kind === "pgc" ? " [PGC]" : "";
    return `NEW CAMPAIGN${badge}: "${camp.title}" — Join now & start earning!`;
  });

  const allMessages = [...permanentMessages, ...campaignMessages];
  const tickerText  = allMessages.join("   •   ");

  return (
    <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold text-sm md:text-base px-6 py-4 rounded-xl shadow-2xl overflow-hidden">
      {campaignMessages.length > 0 && (
        <div className="absolute -top-3 -right-3 text-5xl animate-pulse pointer-events-none">🔔</div>
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
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ClipperDashboardOverview() {
  const [stats, setStats] = useState<ClipperStats | null>(null);

  useEffect(() => {
    axios
      .get<ClipperStats>("/clippers/overview")
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  if (!stats) {
    return (
      <p className="text-center py-20 text-gray-500 text-lg">
        Loading your dashboard…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Live ticker */}
      <ClippaPayTicker />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {CARDS.map(({ key, label, variant, Icon, format }) => (
          <div
            key={key}
            className={`bg-white rounded-2xl shadow-lg p-6 border-l-4 border-${variant}-500 transition-all hover:shadow-xl`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">{label}</p>
              <Icon className={`w-8 h-8 text-${variant}-500`} />
            </div>
            <p className="mt-4 text-4xl font-extrabold text-gray-800">
              {format(stats[key])}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}