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

  // flexible extras (whatever your API returns)
  campaignKind?: string;
  kind?: string;
  clipper_cpm?: number;
  platform_cpm?: number;
  campaign?: any;
  ugc?: any;
}

type CampaignKind = "normal" | "ugc";

const API_BASE = import.meta.env.VITE_API_URL || "";

// Fallback CPMs if the row/API doesn’t include them
const DEFAULT_CPMS: Record<CampaignKind, { clipper: number; platform: number }> =
  {
    normal: { clipper: 500, platform: 700 },
    ugc: { clipper: 2000, platform: 3000 },
  };

/// Robust kind detector (accept both snake & camel)
const getKind = (row: any): CampaignKind => {
  const k =
    row?.campaignKind ??
    row?.campaign_kind ??
    row?.kind ??
    row?.campaign?.kind ??
    row?.campaign_type ??
    row?.campaignType;
  return k === "ugc" ? "ugc" : "normal";
};

// Robust CPM resolver (accept snake_case and camelCase, plus nested campaign/ugc)
const getCPMs = (row: any) => {
  const kind = getKind(row);

  const clipperRaw =
    row?.clipper_cpm ??
    row?.clipperCPM ??
    row?.campaign?.clipper_cpm ??
    row?.campaign?.clipperCPM ??
    row?.ugc?.clipper_cpm ??
    row?.ugc?.clipperCPM;

  const platformRaw =
    row?.platform_cpm ??
    row?.platformCPM ??
    row?.campaign?.platform_cpm ??
    row?.campaign?.platformCPM ??
    row?.ugc?.platform_cpm ??
    row?.ugc?.platformCPM;

  const clipper =
    Number.isFinite(clipperRaw) && Number(clipperRaw) > 0
      ? Number(clipperRaw)
      : DEFAULT_CPMS[kind].clipper;

  const platform =
    Number.isFinite(platformRaw) && Number(platformRaw) > 0
      ? Number(platformRaw)
      : DEFAULT_CPMS[kind].platform;

  return { kind, clipper, platform };
};

const PLATFORM_FILTERS = ["tiktok", "instagram", "youtube", "facebook", "X"];
const STATUS_FILTERS = ["pending", "approved", "rejected"];

export default function SubmissionsManagement() {
  const [proofs, setProofs] = useState<ProofRow[]>([]);
  const [filtered, setFiltered] = useState<ProofRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal
  const [reviewing, setReviewing] = useState<ProofRow | null>(null);
  const [adjustedViews, setAdjustedViews] = useState(0);
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [clipperFilter, setClipperFilter] = useState("");

  // Load rows
  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE}/admin/submissions`, { withCredentials: true })
      .then((res) => setProofs(res.data))
      .finally(() => setLoading(false));
  }, []);

  // Apply filters
  useEffect(() => {
    let rows = proofs.slice();

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.clipperName?.toLowerCase().includes(q) ||
          p.campaignTitle?.toLowerCase().includes(q) ||
          p.platform?.toLowerCase().includes(q) ||
          p.status?.toLowerCase().includes(q) ||
          p.adminNote?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) rows = rows.filter((p) => p.status === statusFilter);
    if (platformFilter) rows = rows.filter((p) => p.platform === platformFilter);
    if (campaignFilter)
      rows = rows.filter((p) => p.campaignTitle === campaignFilter);
    if (clipperFilter)
      rows = rows.filter((p) => p.clipperName === clipperFilter);

    setFiltered(rows);
  }, [
    proofs,
    search,
    statusFilter,
    platformFilter,
    campaignFilter,
    clipperFilter,
  ]);

  const uniqueCampaigns = [...new Set(proofs.map((p) => p.campaignTitle))];
  const uniqueClippers = [...new Set(proofs.map((p) => p.clipperName))];

  const openReview = (row: ProofRow) => {
    setReviewing(row);
    setAdjustedViews(row.verifiedViews ?? row.reportedViews ?? 0);
    setAdminNote("");
    setErr(null);
    setRejecting(false);
  };

  // Approve (verify) proof
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
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Error verifying proof.");
    } finally {
      setSaving(false);
    }
  };

  // Reject proof
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
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Error rejecting proof.");
    } finally {
      setSaving(false);
    }
  };

  const truncate = (url: string, len = 42) =>
    url?.length > len ? url.slice(0, len) + "…" : url;

  if (loading) return <p className="p-10 text-center">Loading…</p>;

  return (
    <div className="space-y-8">
      {/* Filters */}
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
          {STATUS_FILTERS.map((st) => (
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
          {PLATFORM_FILTERS.map((pl) => (
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

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500">Details</th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-center">Proof</th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-center">Views</th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-center">Status</th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((row) => {
              const { kind, clipper, platform } = getCPMs(row);
              return (
                <tr key={row.submissionId + "-" + row.proofId} className="align-top">
                  <td className="px-2 py-2 text-sm max-w-xs">
                    <div className="flex items-center flex-wrap gap-1">
                      <b className="text-gray-700">{row.campaignTitle}</b>
                      <span
                        className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          kind === "ugc"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {kind.toUpperCase()}
                      </span>
                      <span className="ml-1 text-xs bg-gray-100 rounded px-2 py-0.5 text-gray-600">
                        {row.platform}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600">
                      Clipper: <span className="font-semibold">{row.clipperName}</span>
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Views Left: <span className="ml-1 font-semibold">{row.campaignViewsLeft ?? "—"}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Budget Left:{" "}
                      <span className="ml-1 font-semibold">
                        {row.campaignBudgetRemaining != null
                          ? "₦" + Number(row.campaignBudgetRemaining).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      CPM (clipper / platform): <b>₦{clipper}/₦{platform}</b>
                    </div>
                  </td>

                  {/* Proof */}
                  <td className="px-2 py-2 text-xs text-center">
                    <div className="flex flex-col items-center space-y-1">
                      {row.proofVideo && (
                        <a
                          href={row.proofVideo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center text-blue-700 hover:underline"
                        >
                          <HiVideoCamera className="w-6 h-6 mx-auto" />
                          <span>Video</span>
                        </a>
                      )}
                      {row.proofImage && (
                        <a
                          href={row.proofImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center text-blue-700 hover:underline"
                        >
                          <HiPhotograph className="w-6 h-6 mx-auto" />
                          <span>Image</span>
                        </a>
                      )}
                      {row.submissionUrl && (
                        <a
                          href={row.submissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center text-indigo-600 hover:underline"
                        >
                          <HiExternalLink className="w-5 h-5 mx-auto" />
                          <span>{truncate(row.submissionUrl)}</span>
                        </a>
                      )}
                      {!row.proofVideo && !row.proofImage && !row.submissionUrl && (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>

                  {/* Views + Reward */}
                  <td className="px-2 py-2 text-center text-xs">
                    <div>Reported: <b>{row.reportedViews}</b></div>
                    <div>Verified: <b>{row.verifiedViews ?? "—"}</b></div>
                    <div className="mt-1 text-green-700 font-bold">
                      ₦{(row.rewardAmount ?? 0).toLocaleString()}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-2 py-2 text-xs text-center">
                    {row.status === "approved" && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Approved</span>
                    )}
                    {row.status === "pending" && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">Pending</span>
                    )}
                    {row.status === "rejected" && (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Rejected</span>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(row.dateSubmitted).toLocaleDateString()}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-2 py-2 text-xs text-center">
                    {row.status === "pending" && (
                      <button
                        onClick={() => openReview(row)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {reviewing && (() => {
        const { kind, clipper, platform } = getCPMs(reviewing);
        const clipperReward = (adjustedViews * clipper) / 1000;
        const platformFee = (adjustedViews * platform) / 1000;

        return (
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
                <span
                  className={`ml-2 px-2 py-0.5 rounded text-xs border font-semibold ${
                    kind === "ugc"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  {kind.toUpperCase()}
                </span>
                <span className="ml-2 px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                  {reviewing.platform}
                </span>
              </p>

              <div>
                <label className="block text-sm font-semibold mb-1">Reported Views</label>
                <input
                  type="number"
                  value={reviewing.reportedViews}
                  readOnly
                  className="w-full border rounded p-2 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Verified Views</label>
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
                  <label className="block text-sm font-semibold mb-1">Proof Video</label>
                  <video
                    src={reviewing.proofVideo}
                    controls
                    className="w-full rounded mb-2"
                    style={{ maxHeight: 240 }}
                  />
                </div>
              ) : reviewing.proofImage ? (
                <div>
                  <label className="block text-sm font-semibold mb-1">Proof Image</label>
                  <img
                    src={reviewing.proofImage}
                    alt="Proof"
                    className="w-full rounded mb-2"
                    style={{ maxHeight: 240 }}
                  />
                </div>
              ) : reviewing.submissionUrl ? (
                <div>
                  <label className="block text-sm font-semibold mb-1">Proof Link</label>
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
                  {rejecting ? "Rejection Reason (required)" : "Admin Note (optional)"}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  required={!!rejecting}
                  className="w-full border rounded p-2 min-h-[54px]"
                  placeholder={rejecting ? "Reason for rejection..." : "Optional note for the clipper"}
                />
              </div>

              {/* Payout summary */}
              <div className="border-t pt-4 mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Clipper reward</span>
                  <b>₦{clipperReward.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Platform fee</span>
                  <b>₦{platformFee.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
                </div>
                <div className="flex justify-between text-base font-semibold border-t pt-1">
                  <span>Total deduct from advertiser</span>
                  <b>
                    ₦{(clipperReward + platformFee).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </b>
                </div>
              </div>

              {err && <div className="text-red-600 text-sm py-1">{err}</div>}

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
        );
      })()}
    </div>
  );
}
