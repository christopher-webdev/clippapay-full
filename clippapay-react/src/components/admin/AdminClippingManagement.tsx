// components/admin/AdminClippingManagement.tsx
// Admin panel for managing clipping campaign proof submissions.
// Features:
//  - Table of all clipping proof submissions with filters (status, search)
//  - Approve with verified view count (calculates clipper 40% / platform 60% split)
//  - Reject with note
//  - View proof links/images
//  - Live stats header

import React, { useEffect, useState, useCallback } from "react";
import {
  HiExternalLink, HiPhotograph, HiVideoCamera, HiSearch,
  HiCheckCircle, HiXCircle, HiClock, HiRefresh, HiEye,
} from "react-icons/hi";
import { MdOutlineMovieFilter } from "react-icons/md";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface ProofRow {
  submissionId: string;
  proofId: string;
  clipperName: string;
  clipperId: string;
  clipperEmail: string;
  campaignTitle: string;
  campaignId: string;
  campaignCurrency: "NGN" | "USDT";
  advertiserCpm: number;
  clipperCpm: number;
  platform: string;
  submissionUrl?: string;
  proofImage?: string;
  proofVideo?: string;
  reportedViews: number;
  verifiedViews: number;
  rewardAmount: number;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  dateSubmitted: string;
  dateUpdated: string;
}

const UPLOADS = import.meta.env.VITE_UPLOADS_URL || "";
const fmtMoney = (n: number, cur = "NGN") =>
  cur === "NGN" ? `₦${n.toLocaleString()}` : `$${n.toFixed(4)}`;
const fmtCpm = (n: number, cur = "NGN") =>
  cur === "NGN" ? `₦${n}` : `$${n.toFixed(2)}`;

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "text-yellow-700 bg-yellow-50",  icon: HiClock         },
  approved: { label: "Approved", color: "text-green-700 bg-green-50",    icon: HiCheckCircle   },
  rejected: { label: "Rejected", color: "text-red-700 bg-red-50",        icon: HiXCircle       },
};

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "🎵", instagram: "📷", youtube: "▶️", facebook: "📘",
  snapchat: "👻", twitter: "🐦", whatsapp: "💬",
};

export default function AdminClippingManagement() {
  const [rows, setRows]             = useState<ProofRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("pending");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);

  // Review modal
  const [reviewing, setReviewing]     = useState<ProofRow | null>(null);
  const [reviewAction, setAction]     = useState<"approve" | "reject" | "">("");
  const [adminNote, setAdminNote]     = useState("");
  const [verifiedViews, setVerified]  = useState("");
  const [submitting, setSubmitting]   = useState(false);

  // Image preview
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: statusFilter,
        search,
      });
      const { data } = await axios.get(`${API_BASE}/clipping/admin/submissions?${params}`, {
        withCredentials: true,
      });
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openReview = (row: ProofRow, action: "approve" | "reject") => {
    setReviewing(row);
    setAction(action);
    setAdminNote("");
    setVerified(String(row.reportedViews || ""));
  };

  const submitReview = async () => {
    if (!reviewing) return;
    if (reviewAction === "approve" && (!verifiedViews || isNaN(Number(verifiedViews)))) {
      alert("Enter verified view count.");
      return;
    }
    if (reviewAction === "reject" && !adminNote.trim()) {
      alert("Please enter a rejection reason for the clipper.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.patch(
        `${API_BASE}/clipping/admin/submissions/${reviewing.submissionId}/proofs/${reviewing.proofId}/review`,
        {
          action: reviewAction,
          adminNote: adminNote.trim(),
          verifiedViews: reviewAction === "approve" ? Number(verifiedViews) : undefined,
        },
        { withCredentials: true }
      );
      alert(data.message || `Proof ${reviewAction}d successfully.`);
      setReviewing(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  // Stats
  const pendingCount  = rows.filter((r) => r.status === "pending").length;
  const approvedCount = rows.filter((r) => r.status === "approved").length;

  const fullUrl = (p?: string) =>
    !p ? null : p.startsWith("http") ? p : `${UPLOADS}${p}`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <MdOutlineMovieFilter className="h-8 w-8 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clipping Submissions</h1>
          <p className="text-sm text-gray-500">Review clipper proofs — approve to credit their wallet (40% of CPM rate)</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Rows",     val: total,         color: "bg-blue-50 text-blue-700"   },
          { label: "Pending Review", val: pendingCount,  color: "bg-yellow-50 text-yellow-700" },
          { label: "Approved",       val: approvedCount, color: "bg-green-50 text-green-700"  },
          { label: "Page",           val: `${page} / ${totalPages}`, color: "bg-gray-50 text-gray-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.val}</div>
            <div className="text-xs font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-gray-50 rounded-lg px-3 py-2">
          <HiSearch className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search clipper name or campaign…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm text-gray-700 outline-none w-full"
          />
        </div>

        <div className="flex gap-2">
          {(["", "pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === s
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <button
          onClick={load}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-all"
        >
          <HiRefresh className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
            <HiRefresh className="animate-spin h-5 w-5" />
            <span>Loading submissions…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400 gap-2">
            <MdOutlineMovieFilter className="h-12 w-12 opacity-30" />
            <p className="font-medium">No submissions found</p>
            <p className="text-sm">{statusFilter ? `No ${statusFilter} proofs right now.` : "Try a different filter."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Clipper</th>
                  <th className="text-left px-4 py-3">Campaign</th>
                  <th className="text-left px-4 py-3">Platform</th>
                  <th className="text-right px-4 py-3">Reported Views</th>
                  <th className="text-right px-4 py-3">Verified Views</th>
                  <th className="text-right px-4 py-3">Clipper Earns</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Proof</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => {
                  const statusCfg = STATUS_CONFIG[row.status];
                  const estimatedEarning = row.verifiedViews > 0
                    ? (row.verifiedViews * row.clipperCpm) / 1000
                    : (row.reportedViews * row.clipperCpm) / 1000;

                  return (
                    <tr key={`${row.submissionId}-${row.proofId}`} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{row.clipperName || "—"}</div>
                        <div className="text-xs text-gray-400">{row.clipperEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-700 max-w-[180px] truncate">{row.campaignTitle}</div>
                        <div className="text-xs text-orange-500 font-medium mt-0.5">
                          They earn: {fmtCpm(row.clipperCpm, row.campaignCurrency)}/1K views
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 font-medium text-xs px-2.5 py-1 rounded-full">
                          <span>{PLATFORM_ICONS[row.platform?.toLowerCase()] || "📱"}</span>
                          {row.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {(row.reportedViews || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {row.verifiedViews > 0 ? row.verifiedViews.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-orange-600">
                          {fmtMoney(row.rewardAmount || 0, row.campaignCurrency)}
                        </div>
                        <div className="text-xs text-gray-400">
                          Est: {fmtMoney(estimatedEarning, row.campaignCurrency)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.color}`}>
                          <statusCfg.icon className="h-3.5 w-3.5" />
                          {statusCfg.label}
                        </span>
                        {row.adminNote && (
                          <div className="text-xs text-gray-400 mt-1 max-w-[120px] truncate" title={row.adminNote}>
                            "{row.adminNote}"
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {row.submissionUrl && (
                            <a href={row.submissionUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-all">
                              <HiExternalLink className="h-3.5 w-3.5" />
                              Post
                            </a>
                          )}
                          {row.proofImage && (
                            <button
                              onClick={() => setPreview(fullUrl(row.proofImage) || "")}
                              className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-all">
                              <HiPhotograph className="h-3.5 w-3.5" />
                              IMG
                            </button>
                          )}
                          {row.proofVideo && (
                            <a href={fullUrl(row.proofVideo) || ""} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg transition-all">
                              <HiVideoCamera className="h-3.5 w-3.5" />
                              VID
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openReview(row, "approve")}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <HiCheckCircle className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => openReview(row, "reject")}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <HiXCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        )}
                        {row.status !== "pending" && (
                          <button
                            onClick={() => openReview(row, "approve")}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg transition-all"
                          >
                            <HiEye className="h-3.5 w-3.5" />
                            Re-review
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-4 py-2 rounded-lg transition-all"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-4 py-2 rounded-lg transition-all"
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Review Modal ──────────────────────────────────────────────────────── */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {reviewAction === "approve" ? "✅ Approve Proof" : "❌ Reject Proof"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {reviewing.clipperName} · {reviewing.platform} · {reviewing.campaignTitle}
                </p>
              </div>
              <button onClick={() => setReviewing(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Proof link */}
              {reviewing.submissionUrl && (
                <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-blue-700 mb-1">Post URL</p>
                    <p className="text-xs text-blue-600 truncate max-w-[280px]">{reviewing.submissionUrl}</p>
                  </div>
                  <a href={reviewing.submissionUrl} target="_blank" rel="noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg">
                    <HiExternalLink className="h-3.5 w-3.5" />
                    Open
                  </a>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Reported Views</p>
                  <p className="text-base font-bold text-gray-800">{(reviewing.reportedViews || 0).toLocaleString()}</p>
                </div>
                <div className="text-center border-x border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Prev. Verified</p>
                  <p className="text-base font-bold text-green-600">{(reviewing.verifiedViews || 0).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Clipper CPM</p>
                  <p className="text-base font-bold text-orange-500">
                    {fmtCpm(reviewing.clipperCpm, reviewing.campaignCurrency)}
                  </p>
                </div>
              </div>

              {/* Approve-specific: verified views + earnings estimate */}
              {reviewAction === "approve" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Verified View Count *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={verifiedViews}
                    onChange={(e) => setVerified(e.target.value)}
                    className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                    placeholder={`Reported: ${reviewing.reportedViews}`}
                    autoFocus
                  />
                  {verifiedViews && !isNaN(Number(verifiedViews)) && (
                    <div className="mt-3 bg-green-50 rounded-xl p-4">
                      <p className="text-xs text-green-700 font-semibold mb-1">Payout Preview</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Incremental views: </span>
                          <span className="font-bold text-gray-800">
                            {Math.max(0, Number(verifiedViews) - (reviewing.verifiedViews || 0)).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Clipper earns: </span>
                          <span className="font-bold text-green-600">
                            {fmtMoney(
                              Math.max(0, (Number(verifiedViews) - (reviewing.verifiedViews || 0)) * reviewing.clipperCpm / 1000),
                              reviewing.campaignCurrency
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Platform keeps: </span>
                          <span className="font-bold text-blue-600">
                            {fmtMoney(
                              Math.max(0, (Number(verifiedViews) - (reviewing.verifiedViews || 0)) * (reviewing.advertiserCpm - reviewing.clipperCpm) / 1000),
                              reviewing.campaignCurrency
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin note */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {reviewAction === "reject" ? "Rejection Reason *" : "Admin Note (optional)"}
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors"
                  placeholder={
                    reviewAction === "reject"
                      ? "e.g. Screenshot doesn't show view count clearly. Please resubmit."
                      : "Optional note for the clipper…"
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setReviewing(null)}
                className="flex-1 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={submitting}
                className={`flex-1 text-sm font-semibold text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  reviewAction === "approve"
                    ? "bg-green-500 hover:bg-green-600 disabled:opacity-60"
                    : "bg-red-500 hover:bg-red-600 disabled:opacity-60"
                }`}
              >
                {submitting ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : reviewAction === "approve" ? (
                  <><HiCheckCircle className="h-4 w-4" /> Approve & Credit Wallet</>
                ) : (
                  <><HiXCircle className="h-4 w-4" /> Reject Proof</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 text-white text-2xl font-bold"
            >
              ×
            </button>
            <img src={preview} alt="Proof" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
