// components/admin/AdminClippingCampaignsManagement.tsx
// Admin panel: review & approve/reject newly submitted clipping campaigns
// Campaigns arrive as 'waiting_for_approval'. Admin approves → active, or rejects → cancelled + refund.

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  HiSearch, HiCheckCircle, HiXCircle, HiRefresh,
  HiEye, HiClock, HiFilter,
} from "react-icons/hi";
import { MdOutlineMovieFilter } from "react-icons/md";
import {
  SiTiktok, SiInstagram, SiYoutube,
  SiFacebook, SiSnapchat, SiX,
} from "react-icons/si";

const API_BASE = import.meta.env.VITE_API_URL || "";

type CampaignStatus = "waiting_for_approval" | "active" | "completed" | "cancelled";

interface Campaign {
  _id:              string;
  title:            string;
  videoUrl:         string;
  budget:           number;
  currency:         "NGN" | "USDT";
  costPerThousand:  number;
  estimatedViews:   number;
  platforms:        string[];
  categories:       string[];
  hashtags:         string[];
  directions:       string[];
  ctaUrl?:          string;
  status:           CampaignStatus;
  totalViews:       number;
  totalSpent:       number;
  createdAt:        string;
  advertiser: {
    _id:        string;
    firstName?: string;
    lastName?:  string;
    email:      string;
    company?:   string;
  };
}

const fmtMoney = (n: number, cur: "NGN" | "USDT") =>
  cur === "NGN"
    ? `₦${n.toLocaleString()}`
    : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;

const STATUS_STYLE: Record<CampaignStatus, string> = {
  waiting_for_approval: "bg-amber-50 text-amber-700 border-amber-200",
  active:               "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed:            "bg-blue-50 text-blue-700 border-blue-200",
  cancelled:            "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  waiting_for_approval: "Pending Review",
  active:               "Active",
  completed:            "Completed",
  cancelled:            "Cancelled",
};

const PLATFORM_ICON_MAP: Record<string, React.ElementType> = {
  tiktok:    SiTiktok,
  instagram: SiInstagram,
  youtube:   SiYoutube,
  facebook:  SiFacebook,
  snapchat:  SiSnapchat,
  twitter:   SiX,
};

const PLATFORM_COLOR: Record<string, string> = {
  tiktok:    "#000000",
  instagram: "#E1306C",
  youtube:   "#FF0000",
  facebook:  "#1877F2",
  snapchat:  "#FFFC00",
  twitter:   "#000000",
};

function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  const Icon  = PLATFORM_ICON_MAP[platform.toLowerCase()];
  const color = PLATFORM_COLOR[platform.toLowerCase()] || "#6B7280";
  if (!Icon) return <span className="text-xs text-gray-400">{platform}</span>;
  return <Icon size={size} color={color} title={platform} />;
}

export default function AdminClippingCampaignsManagement() {
  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<"all" | CampaignStatus>("waiting_for_approval");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);

  // Detail / action modal
  const [selected, setSelected]   = useState<Campaign | null>(null);
  const [action, setAction]       = useState<"approve" | "reject" | "view" | null>(null);
  const [rejectReason, setReason] = useState("");
  const [submitting, setSubmit]   = useState(false);
  const [modalErr, setModalErr]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:   String(page),
        limit:  "15",
        status: statusFilter,
        search,
      });
      const endpoint = statusFilter === "waiting_for_approval"
        ? `${API_BASE}/campaigns/clipping/admin/pending?${params}`
        : `${API_BASE}/campaigns/clipping/admin/all?${params}`;

      const { data } = await axios.get(endpoint, { withCredentials: true });
      setCampaigns(data.campaigns || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const pendingCount = statusFilter === "waiting_for_approval" ? total : campaigns.filter(c => c.status === "waiting_for_approval").length;

  const openAction = (c: Campaign, a: "approve" | "reject" | "view") => {
    setSelected(c); setAction(a); setReason(""); setModalErr("");
  };

  const handleAction = async () => {
    if (!selected || !action || action === "view") return;
    if (action === "reject" && !rejectReason.trim()) { setModalErr("Please enter a rejection reason."); return; }

    setSubmit(true); setModalErr("");
    try {
      const url = `${API_BASE}/campaigns/clipping/admin/${selected._id}/${action}`;
      const body = action === "reject" ? { reason: rejectReason.trim() } : {};
      const { data } = await axios.post(url, body, { withCredentials: true });
      alert(data.message || `Campaign ${action}d successfully.`);
      setSelected(null); setAction(null);
      load();
    } catch (err: any) {
      setModalErr(err.response?.data?.error || "Request failed.");
    } finally {
      setSubmit(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MdOutlineMovieFilter className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clipping Campaigns</h1>
            <p className="text-sm text-gray-500">Review and approve new clipping campaigns before they go live</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <HiRefresh className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending Review", val: pendingCount,  color: "bg-amber-50 text-amber-700"   },
          { label: "Total Shown",    val: total,          color: "bg-blue-50 text-blue-700"     },
          { label: "Page",           val: `${page}/${totalPages}`, color: "bg-gray-50 text-gray-700" },
          { label: "Results/Page",   val: campaigns.length, color: "bg-purple-50 text-purple-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <p className="text-2xl font-extrabold">{s.val}</p>
            <p className="text-xs font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
          <HiSearch className="text-gray-400 shrink-0" />
          <input
            type="text" placeholder="Search campaign title or advertiser…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm text-gray-700 outline-none w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { val: "waiting_for_approval", label: "⏳ Pending" },
            { val: "active",               label: "✅ Active"  },
            { val: "cancelled",            label: "❌ Cancelled"},
            { val: "all",                  label: "All"        },
          ] as { val: "all" | CampaignStatus; label: string }[]).map(({ val, label }) => (
            <button key={val}
              onClick={() => { setStatus(val); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                statusFilter === val
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-20 text-center">
            <MdOutlineMovieFilter className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No campaigns found</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {campaigns.map((c) => {
              const advertiserName = c.advertiser?.firstName
                ? `${c.advertiser.firstName} ${c.advertiser.lastName || ""}`.trim()
                : c.advertiser?.company || c.advertiser?.email || "—";

              return (
                <li key={c._id} className="p-5 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Top row */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[c.status]}`}>
                          {STATUS_LABEL[c.status]}
                        </span>
                        <h3 className="font-bold text-gray-900 text-sm">{c.title}</h3>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Advertiser</p>
                          <p className="font-medium text-gray-700 truncate">{advertiserName}</p>
                          <p className="text-xs text-gray-400 truncate">{c.advertiser?.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Budget</p>
                          <p className="font-bold text-indigo-600">{fmtMoney(c.budget, c.currency)}</p>
                          <p className="text-xs text-gray-400">{fmtMoney(c.costPerThousand, c.currency)}/1K views</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Est. Views</p>
                          <p className="font-medium text-gray-700">{c.estimatedViews?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Platforms</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {c.platforms?.map(p => (
                              <PlatformIcon key={p} platform={p} size={18} />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Categories */}
                      {c.categories?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {c.categories.map(cat => (
                            <span key={cat} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cat}</span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-2">
                        Submitted: {new Date(c.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => openAction(c, "view")}
                        className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-semibold flex items-center gap-1 transition-colors">
                        <HiEye className="h-3.5 w-3.5" /> View
                      </button>
                      {c.status === "waiting_for_approval" && (
                        <>
                          <button onClick={() => openAction(c, "approve")}
                            className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold flex items-center gap-1 transition-colors">
                            <HiCheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button onClick={() => openAction(c, "reject")}
                            className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold flex items-center gap-1 transition-colors">
                            <HiXCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-4 py-2 rounded-xl">
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-4 py-2 rounded-xl">
            Next →
          </button>
        </div>
      )}

      {/* ── Action / Detail Modal ── */}
      {selected && action && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {action === "approve" ? "✅ Approve Campaign"
                    : action === "reject" ? "❌ Reject Campaign"
                    : "📋 Campaign Details"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{selected.title}</p>
              </div>
              <button onClick={() => { setSelected(null); setAction(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              {modalErr && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                  {modalErr}
                </div>
              )}

              {/* Campaign summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
                {([
                  ["Title",     selected.title],
                  ["Advertiser", selected.advertiser?.firstName
                    ? `${selected.advertiser.firstName} ${selected.advertiser.lastName || ""}`.trim()
                    : selected.advertiser?.company || selected.advertiser?.email],
                  ["Email",     selected.advertiser?.email],
                  ["Budget",    fmtMoney(selected.budget, selected.currency)],
                  ["CPM Rate",  fmtMoney(selected.costPerThousand, selected.currency) + "/1K views"],
                  ["Est. Views",selected.estimatedViews?.toLocaleString()],
                  ["Categories",selected.categories?.join(", ")],
                  ["Video URL", selected.videoUrl],
                  ...(selected.ctaUrl ? [["CTA URL", selected.ctaUrl]] : []),
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-gray-400 shrink-0 text-xs">{label}</span>
                    <span className="text-gray-800 font-medium text-xs text-right break-all">{val}</span>
                  </div>
                ))}

                {/* Platforms row — real brand icons */}
                <div className="flex justify-between gap-3 items-center">
                  <span className="text-gray-400 shrink-0 text-xs">Platforms</span>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {selected.platforms?.map(p => (
                      <PlatformIcon key={p} platform={p} size={16} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Hashtags */}
              {selected.hashtags?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Hashtags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.hashtags.map(h => (
                      <span key={h} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">#{h}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Directions */}
              {selected.directions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Creator Directions</p>
                  <ul className="space-y-1">
                    {selected.directions.map((d, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-orange-400 shrink-0">•</span>{d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reject reason input */}
              {action === "reject" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea rows={3} value={rejectReason}
                    onChange={(e) => { setReason(e.target.value); setModalErr(""); }}
                    placeholder="Explain why this campaign is being rejected. The advertiser will see this and their budget will be refunded."
                    className="w-full border-2 border-gray-200 focus:border-red-400 rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors"
                  />
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">
                    ⚠️ Rejecting will cancel the campaign and refund {fmtMoney(selected.budget, selected.currency)} to the advertiser.
                  </p>
                </div>
              )}

              {action === "approve" && (
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-emerald-700 mb-1">Ready to approve?</p>
                  <p className="text-xs text-emerald-600">
                    The campaign will go live immediately. Clippers will be able to join and submit proofs.
                    Budget of {fmtMoney(selected.budget, selected.currency)} stays in escrow.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => { setSelected(null); setAction(null); }}
                className="flex-1 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl transition-colors">
                {action === "view" ? "Close" : "Cancel"}
              </button>
              {action !== "view" && (
                <button onClick={handleAction} disabled={submitting}
                  className={`flex-1 text-sm font-semibold text-white py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
                    action === "approve"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}>
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : action === "approve"
                      ? <><HiCheckCircle className="h-4 w-4" /> Approve & Go Live</>
                      : <><HiXCircle className="h-4 w-4" /> Reject & Refund</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}