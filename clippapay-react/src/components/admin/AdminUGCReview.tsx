// components/admin/AdminUGCReview.tsx
// Adworker panel: review pending UGC campaigns and click "Go Live" or "Reject"
// Adworker sees full campaign details (title, description, script, category, budget)
// and either approves (campaign goes live) or rejects with a note (sent back to advertiser)
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  HiSearch, HiRefresh, HiCheckCircle, HiXCircle, HiEye,
  HiClock, HiCalendar, HiUser, HiDocumentText, HiPhotograph,
} from "react-icons/hi";
import { MdOutlineCampaign, MdOutlineRocketLaunch } from "react-icons/md";

const API_BASE = import.meta.env.VITE_API_URL || "";
const UPLOADS  = import.meta.env.VITE_UPLOADS_URL || "";
const fullUrl  = (p?: string) => (!p ? null : p.startsWith("http") ? p : `${UPLOADS}${p}`);

interface CampaignRow {
  _id: string;
  title: string;
  description: string;
  script?: string;
  category: string;
  preferredLength: string;
  applicationDeadline: string;
  status: string;
  adworkerNote?: string;
  thumbnailUrl?: string;
  keyPhrases?: string[];
  creativeDirection?: {
    aspectRatio?: string; preferredLocation?: string;
    locationDescription?: string; backgroundStyle?: string; moodTone?: string;
  };
  advertiser?: { firstName?: string; lastName?: string; email?: string; company?: string };
  createdAt: string;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending_approval: { label: "Pending Review", color: "#D97706", bg: "#FFFBEB" },
  active:           { label: "Live",           color: "#059669", bg: "#ECFDF5" },
  draft:            { label: "Draft",          color: "#6B7280", bg: "#F3F4F6" },
  completed:        { label: "Completed",      color: "#6366F1", bg: "#EEF2FF" },
  cancelled:        { label: "Cancelled",      color: "#EF4444", bg: "#FEF2F2" },
};

export default function AdminUGCReview() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("pending_approval");
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Review modal
  const [reviewing, setReviewing]     = useState<CampaignRow | null>(null);
  const [action, setAction]           = useState<"approve" | "reject" | "">("");
  const [rejectNote, setRejectNote]   = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [submitting, setSubmitting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, page: String(page), limit: "15", search });
      const { data } = await axios.get(`${API_BASE}/campaigns/adworker/pending?${params}`, { withCredentials: true });
      setCampaigns(data.campaigns || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, search]);

  useEffect(() => { load(); }, [load]);

  const openReview = (c: CampaignRow, act: "approve" | "reject") => {
    setReviewing(c);
    setAction(act);
    setRejectNote("");
    setApproveNote("");
  };

  const submitReview = async () => {
    if (!reviewing) return;
    if (action === "reject" && !rejectNote.trim()) { alert("Please provide a rejection reason."); return; }

    setSubmitting(true);
    try {
      if (action === "approve") {
        await axios.post(`${API_BASE}/campaigns/${reviewing._id}/go-live`, { note: approveNote }, { withCredentials: true });
        alert(`✅ "${reviewing.title}" is now LIVE! Creators can start applying.`);
      } else {
        await axios.post(`${API_BASE}/campaigns/${reviewing._id}/reject-by-adworker`, { note: rejectNote.trim() }, { withCredentials: true });
        alert(`Campaign returned to advertiser with your feedback.`);
      }
      setReviewing(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const advName = (c: CampaignRow) =>
    c.advertiser?.company || `${c.advertiser?.firstName || ""} ${c.advertiser?.lastName || ""}`.trim() || c.advertiser?.email || "Unknown";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <MdOutlineCampaign className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">UGC Campaign Review</h1>
          <p className="text-sm text-gray-500">Review advertiser UGC briefs before they go live to creators</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Results", val: total,      color: "bg-blue-50 text-blue-700"    },
          { label: "Page",          val: `${page}/${totalPages}`, color: "bg-gray-50 text-gray-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.val}</div>
            <div className="text-xs font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-gray-50 rounded-lg px-3 py-2">
          <HiSearch className="text-gray-400 shrink-0" />
          <input
            type="text" placeholder="Search campaign title…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm text-gray-700 outline-none w-full"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {["pending_approval","active","draft","completed","cancelled",""].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === s ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "" ? "All" : STATUS_CFG[s]?.label || s}
            </button>
          ))}
        </div>

        <button onClick={load} className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg">
          <HiRefresh className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Campaign cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
          <HiRefresh className="animate-spin h-5 w-5" />
          <span>Loading campaigns…</span>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-gray-400 gap-2">
          <MdOutlineCampaign className="h-12 w-12 opacity-30" />
          <p className="font-medium">No campaigns found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c) => {
            const cfg = STATUS_CFG[c.status] || STATUS_CFG.draft;
            return (
              <div key={c._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                {/* Thumbnail */}
                {c.thumbnailUrl ? (
                 <img
                      src={fullUrl(c.thumbnailUrl) || ""}
                      alt={c.title}
                      className="w-full h-64 object-contain bg-gray-100"
                    />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
                    <HiPhotograph className="h-12 w-12 text-purple-200" />
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col gap-3">
                  {/* Title + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-base leading-tight">{c.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{advName(c)}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg}`} style={{ color: cfg.color }}>
                      <HiClock className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-indigo-50 text-indigo-700 font-medium px-2 py-1 rounded-lg">{c.category}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{c.preferredLength}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg flex items-center gap-1">
                      <HiCalendar className="h-3 w-3" />
                      {new Date(c.applicationDeadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  {/* Description preview */}
                  <p className="text-sm text-gray-600 line-clamp-3">{c.description}</p>

                  {/* Previous adworker note */}
                  {c.adworkerNote && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
                      <span className="font-semibold">Previous note: </span>{c.adworkerNote}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => setReviewing(c)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 py-2 rounded-xl transition-all"
                    >
                      <HiEye className="h-4 w-4" />
                      Full Review
                    </button>
                    {c.status === "pending_approval" && (
                      <>
                        <button
                          onClick={() => openReview(c, "approve")}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 py-2 rounded-xl transition-all"
                        >
                          <MdOutlineRocketLaunch className="h-4 w-4" />
                          Go Live
                        </button>
                        <button
                          onClick={() => openReview(c, "reject")}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 py-2 rounded-xl transition-all"
                        >
                          <HiXCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-4 py-2 rounded-lg">
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-4 py-2 rounded-lg">
            Next →
          </button>
        </div>
      )}

      {/* ── Full Review Modal ────────────────────────────────────────────────── */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{action === "approve" ? "🚀 Approve Campaign" : action === "reject" ? "❌ Reject Campaign" : "📋 Campaign Details"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{reviewing.title} · {advName(reviewing)}</p>
              </div>
              <button onClick={() => setReviewing(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">×</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Thumbnail */}
              {reviewing.thumbnailUrl && (
                <img src={fullUrl(reviewing.thumbnailUrl) || ""} alt="" className="w-full rounded-xl h-96 object-cover" />
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Category",   reviewing.category],
                  ["Length",     reviewing.preferredLength],
                  ["Deadline",   new Date(reviewing.applicationDeadline).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })],
                  ["Advertiser", advName(reviewing)],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">{lbl}</p>
                    <p className="font-semibold text-gray-800">{val}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Brief / Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{reviewing.description}</p>
              </div>

              {/* Script */}
              {reviewing.script && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">Script</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{reviewing.script}</p>
                </div>
              )}

              {/* Key phrases */}
              {(reviewing.keyPhrases || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Key Phrases</p>
                  <div className="flex flex-wrap gap-2">
                    {reviewing.keyPhrases!.map((kp, i) => (
                      <span key={i} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">{kp}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Creative direction */}
              {reviewing.creativeDirection && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs font-semibold text-purple-600 mb-3 uppercase tracking-wide">Creative Direction</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    {[
                      ["Aspect Ratio",  reviewing.creativeDirection.aspectRatio],
                      ["Location",      reviewing.creativeDirection.preferredLocation],
                      ["Background",    reviewing.creativeDirection.backgroundStyle],
                      ["Mood / Tone",   reviewing.creativeDirection.moodTone],
                    ].filter(([, v]) => v).map(([lbl, val]) => (
                      <div key={lbl}><span className="text-gray-400">{lbl}: </span><span className="font-medium">{val}</span></div>
                    ))}
                  </div>
                  {reviewing.creativeDirection.locationDescription && (
                    <p className="text-xs text-gray-600 mt-2"><span className="text-gray-400">Location details: </span>{reviewing.creativeDirection.locationDescription}</p>
                  )}
                </div>
              )}

              {/* Review inputs */}
              {action === "approve" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Note to advertiser (optional)</label>
                  <textarea
                    rows={3} value={approveNote} onChange={(e) => setApproveNote(e.target.value)}
                    className="w-full border-2 border-gray-200 focus:border-green-400 rounded-xl px-4 py-3 text-sm outline-none resize-none"
                    placeholder="e.g. Great brief! We've approved your campaign."
                  />
                </div>
              )}

              {action === "reject" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rejection Reason *</label>
                  <textarea
                    rows={4} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                    className="w-full border-2 border-gray-200 focus:border-red-400 rounded-xl px-4 py-3 text-sm outline-none resize-none"
                    placeholder="e.g. The script contains prohibited content. Please remove the pricing claims and resubmit."
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100">
              {!action ? (
                <>
                  <button onClick={() => setReviewing(null)} className="flex-1 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl">Close</button>
                  {reviewing.status === "pending_approval" && (
                    <>
                      <button onClick={() => setAction("approve")} className="flex-1 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 py-3 rounded-xl flex items-center justify-center gap-2">
                        <MdOutlineRocketLaunch className="h-4 w-4" />Go Live
                      </button>
                      <button onClick={() => setAction("reject")} className="flex-1 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 py-3 rounded-xl flex items-center justify-center gap-2">
                        <HiXCircle className="h-4 w-4" />Reject
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => setAction("")} className="flex-1 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl">Back</button>
                  <button
                    onClick={submitReview} disabled={submitting}
                    className={`flex-1 text-sm font-semibold text-white py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 ${
                      action === "approve" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {submitting ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> :
                      action === "approve" ? <><MdOutlineRocketLaunch className="h-4 w-4" />Confirm Go Live</> :
                      <><HiXCircle className="h-4 w-4" />Send Back to Advertiser</>
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}