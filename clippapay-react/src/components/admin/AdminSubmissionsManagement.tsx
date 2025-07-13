import React, { useEffect, useState, FormEvent } from "react";
import {
  HiExternalLink,
  HiVideoCamera,
  HiPhotograph,
  HiSearch,
} from "react-icons/hi";
import axios from "axios";

interface ProofRow {
  submissionId: string;
  proofId: string;
  clipperName: string;
  campaignTitle: string;
  platform: string;
  proofUrl: string;
  proofVideo?: string;
  proofImage?: string;
  submissionUrl: string;
  reportedViews: number;
  verifiedViews?: number;
  dateSubmitted: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  rewardAmount?: number;
  campaignViewsLeft?: number;
  campaignBudgetRemaining?: number;
}

const CPM_CLIPPER = 200;
const CPM_PLATFORM = 400;
const API_BASE = import.meta.env.VITE_API_URL || "";

const platformList = ["tiktok", "instagram", "youtube", "facebook"];
const statusList = ["pending", "approved", "rejected"];

export default function SubmissionsManagement() {
  const [proofs, setProofs] = useState<ProofRow[]>([]);
  const [filtered, setFiltered] = useState<ProofRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewing, setReviewing] = useState<ProofRow | null>(null);
  const [adjustedViews, setAdjustedViews] = useState(0);
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  // FILTER state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [clipperFilter, setClipperFilter] = useState("");

  // Fetch proofs
  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE}/admin/submissions`, { withCredentials: true })
      .then((res) => {
        setProofs(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter logic
  useEffect(() => {
    let result = proofs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.clipperName?.toLowerCase().includes(q) ||
          p.campaignTitle?.toLowerCase().includes(q) ||
          p.platform?.toLowerCase().includes(q) ||
          p.status?.toLowerCase().includes(q) ||
          p.adminNote?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((p) => p.status === statusFilter);
    if (platformFilter)
      result = result.filter((p) => p.platform === platformFilter);
    if (campaignFilter)
      result = result.filter((p) => p.campaignTitle === campaignFilter);
    if (clipperFilter)
      result = result.filter((p) => p.clipperName === clipperFilter);
    setFiltered(result);
  }, [
    proofs,
    search,
    statusFilter,
    platformFilter,
    campaignFilter,
    clipperFilter,
  ]);

  // Unique options for filter dropdowns
  const uniqueCampaigns = [...new Set(proofs.map((p) => p.campaignTitle))];
  const uniqueClippers = [...new Set(proofs.map((p) => p.clipperName))];

  // Open review modal
  const openReview = (p: ProofRow) => {
    setReviewing(p);
    setAdjustedViews(p.verifiedViews ?? p.reportedViews ?? 0);
    setAdminNote("");
    setErr(null);
    setRejecting(false);
  };

  // Approve handler
  const handleApprove = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewing) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await axios.post(
        `${API_BASE}/admin/submissions/${reviewing.submissionId}/proof/${reviewing.proofId}/verify`,
        { verifiedViews: adjustedViews, note: adminNote },
        { withCredentials: true }
      );
      const updated: ProofRow = res.data;
      setProofs((prev) =>
        prev.map((p) =>
          p.submissionId === updated.submissionId && p.proofId === updated.proofId
            ? updated
            : p
        )
      );
      setReviewing(null);
    } catch (err: any) {
      setErr(err.response?.data?.error || "Error verifying proof.");
    } finally {
      setSaving(false);
    }
  };


  // Reject handler
  const handleReject = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewing) return;
    if (!adminNote.trim()) {
      setErr("Note is required to reject a proof.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await axios.post(
        `${API_BASE}/admin/submissions/${reviewing.submissionId}/proof/${reviewing.proofId}/reject`,
        { note: adminNote },
        { withCredentials: true }
      );
      const updated: ProofRow = res.data;
      setProofs((prev) =>
        prev.map((p) =>
          p.submissionId === updated.submissionId && p.proofId === updated.proofId
            ? updated
            : p
        )
      );
      setReviewing(null);
    } catch (err: any) {
      setErr(err.response?.data?.error || "Error rejecting proof.");
    } finally {
      setSaving(false);
    }
  };


  const truncate = (url: string, len = 38) =>
    url.length > len ? url.slice(0, len) + "…" : url;

  if (loading)
    return <p className="p-10 text-center">Loading…</p>;

  return (
    <div className="space-y-8">
      {/* FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
        <div className="relative w-full md:w-60">
          <input
            type="text"
            placeholder="Search…"
            className="w-full rounded-lg border px-3 py-2 pl-10 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <HiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Status</option>
          {statusList.map((st) => (
            <option key={st} value={st}>
              {st[0].toUpperCase() + st.slice(1)}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
        >
          <option value="">Platform</option>
          {platformList.map((pl) => (
            <option key={pl} value={pl}>
              {pl[0].toUpperCase() + pl.slice(1)}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
        >
          <option value="">Campaign</option>
          {uniqueCampaigns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={clipperFilter}
          onChange={(e) => setClipperFilter(e.target.value)}
        >
          <option value="">Clipper</option>
          {uniqueClippers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Stack headers for mobile! */}
              <th className="px-2 py-2 text-xs font-semibold text-gray-500">
                Details
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-center">
                Proof
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-center">
                Views
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-center">
                Status
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((p) => (
              <tr key={p.submissionId + "-" + p.proofId} className="align-top">
                {/* Details: Campaign, Clipper, Platform, Budget/Views */}
                <td className="px-2 py-2 text-sm max-w-xs">
                  <div>
                    <b className="text-gray-700">{p.campaignTitle}</b>
                    <span className="ml-2 text-xs bg-gray-100 rounded px-2 py-1 text-gray-600">
                      {p.platform}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Clipper: <span className="font-semibold">{p.clipperName}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <span>Views Left:</span>
                    <span className="ml-1 font-semibold">
                      {p.campaignViewsLeft ?? "—"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span>Budget Left:</span>
                    <span className="ml-1 font-semibold">
                      {p.campaignBudgetRemaining != null
                        ? "₦" +
                        Number(p.campaignBudgetRemaining).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </td>
                {/* Proof: Video, Image, or Link */}
                <td className="px-2 py-2 text-xs text-center">
                  {p.proofVideo ? (
                    <a
                      href={p.proofVideo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center text-blue-700 hover:underline"
                    >
                      <HiVideoCamera className="w-6 h-6 mx-auto" />
                      <span>Video</span>
                    </a>
                  ) : p.proofImage ? (
                    <a
                      href={p.proofImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center text-blue-700 hover:underline"
                    >
                      <HiPhotograph className="w-6 h-6 mx-auto" />
                      <span>Image</span>
                    </a>
                  ) : p.submissionUrl ? (
                    <a
                      href={p.submissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center text-indigo-600 hover:underline"
                    >
                      <HiExternalLink className="w-5 h-5 mx-auto" />
                      <span>Link</span>
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                {/* Views/Reward */}
                <td className="px-2 py-2 text-center text-xs">
                  <div>
                    Reported: <b>{p.reportedViews}</b>
                  </div>
                  <div>
                    Verified: <b>{p.verifiedViews ?? "—"}</b>
                  </div>
                  <div className="mt-1 text-green-700 font-bold">
                    ₦{(p.rewardAmount ?? 0).toLocaleString()}
                  </div>
                </td>
                {/* Status */}
                <td className="px-2 py-2 text-xs text-center">
                  {p.status === "approved" && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                      Approved
                    </span>
                  )}
                  {p.status === "pending" && (
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
                      Pending
                    </span>
                  )}
                  {p.status === "rejected" && (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                      Rejected
                    </span>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(p.dateSubmitted).toLocaleDateString()}
                  </div>
                </td>
                {/* Action */}
                <td className="px-2 py-2 text-xs text-center">
                  {p.status === "pending" && (
                    <button
                      onClick={() => openReview(p)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    >
                      Review
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {reviewing && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <form
            onSubmit={rejecting ? handleReject : handleApprove}
            className="bg-white p-8 rounded-lg w-full max-w-md space-y-4 relative"
          >
            <button
              type="button"
              onClick={() => setReviewing(null)}
              disabled={saving}
              className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-gray-700"
              title="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-bold">Review Proof</h3>
            <p className="mb-2">
              <b>{reviewing.clipperName}</b> — <em>{reviewing.campaignTitle}</em>
              <span className="ml-2 px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                {reviewing.platform}
              </span>
            </p>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Reported Views
              </label>
              <input
                type="number"
                value={reviewing.reportedViews}
                readOnly
                className="w-full border rounded p-2 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Verified Views
              </label>
              <input
                type="number"
                value={adjustedViews}
                onChange={(e) => setAdjustedViews(Number(e.target.value))}
                min={0}
                required
                className="w-full border rounded p-2"
              />
            </div>
            {/* Proof media */}
            {reviewing.proofVideo ? (
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Proof Video
                </label>
                <video
                  src={reviewing.proofVideo}
                  controls
                  className="w-full rounded mb-2"
                  style={{ maxHeight: 240 }}
                />
              </div>
            ) : reviewing.proofImage ? (
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Proof Image
                </label>
                <img
                  src={reviewing.proofImage}
                  alt="Proof"
                  className="w-full rounded mb-2"
                  style={{ maxHeight: 240 }}
                />
              </div>
            ) : reviewing.submissionUrl ? (
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Proof Link
                </label>
                <a
                  href={reviewing.submissionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline flex items-center"
                >
                  {truncate(reviewing.submissionUrl, 48)}
                  <HiExternalLink className="ml-1 w-4 h-4" />
                </a>
              </div>
            ) : null}

            {/* Admin note */}
            <div>
              <label className="block text-sm font-semibold mb-1">
                {rejecting
                  ? "Rejection Reason (required)"
                  : "Admin Note (optional)"}
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                required={rejecting}
                className="w-full border rounded p-2 min-h-[54px]"
                placeholder={
                  rejecting
                    ? "Reason for rejection..."
                    : "Optional note for the clipper"
                }
              />
            </div>

            {/* Payout summary */}
            <div className="border-t pt-4 mt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Clipper reward</span>
                <b>
                  ₦
                  {(
                    (adjustedViews * CPM_CLIPPER) /
                    1000
                  ).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </b>
              </div>
              <div className="flex justify-between text-sm">
                <span>Platform fee</span>
                <b>
                  ₦
                  {(
                    (adjustedViews * CPM_PLATFORM) /
                    1000
                  ).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </b>
              </div>
              <div className="flex justify-between text-base font-semibold border-t pt-1">
                <span>Total deduct from advertiser</span>
                <b>
                  ₦
                  {(
                    (adjustedViews * (CPM_CLIPPER + CPM_PLATFORM)) /
                    1000
                  ).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </b>
              </div>
            </div>

            {err && (
              <div className="text-red-600 text-sm py-1">{err}</div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              {!rejecting ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRejecting(true);
                      setErr(null);
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    {saving ? "Saving…" : "Approve & Pay"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setRejecting(false)}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    {saving ? "Rejecting…" : "Confirm Reject"}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
