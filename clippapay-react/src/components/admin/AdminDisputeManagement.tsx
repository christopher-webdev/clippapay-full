// components/admin/AdminDisputeManagement.tsx
// Admin panel for reviewing and resolving UGC job disputes.
//
// Four resolution actions:
//   1. Pay Creator     — escrow → clipper, campaign completed
//   2. Refund Brand    — escrow → advertiser, campaign cancelled  
//   3. Reassign Job    — dismiss current creator, campaign reopened for new selection
//   4. Add Note        — log contact attempt or update, optionally notify both parties
//
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  HiSearch, HiRefresh, HiPhone, HiMail, HiOfficeBuilding,
  HiUser, HiClock, HiExclamationCircle, HiCheckCircle,
  HiCash, HiX, HiDocumentText, HiStar,
} from "react-icons/hi";
import { MdOutlineGavel } from "react-icons/md";

const API_BASE = import.meta.env.VITE_API_URL || "";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Party {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  profileImage?: string | null;
  rating?: number;
  country?: string;
  bio?: string;
  categories?: string[];
}

interface DisputeRow {
  _id: string;
  status: string;
  disputeRaised: boolean;
  paymentAmount?: number;
  paymentCurrency?: "NGN" | "USDT";
  createdAt: string;
  updatedAt: string;
  submissionDeadline?: string;
  revisionCount?: number;
  lastFeedback?: string;
  currentVideoUrl?: string;
  clipper: Party;
  campaign?: {
    _id: string;
    title: string;
    category: string;
    description: string;
    advertiser: Party;
    thumbnailUrl?: string;
  };
}

interface WalletSnap {
  balance?: number;
  escrowLocked?: number;
  usdtBalance?: number;
  usdtEscrowLocked?: number;
}

interface DetailData {
  dispute: DisputeRow;
  advWallet: WalletSnap;
  clipperWallet: WalletSnap;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d?: string) =>
  !d ? "—" : new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const fullName = (p?: Party) =>
  !p ? "Unknown" : p.company || `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.email || "Unknown";

const initials = (p?: Party) =>
  fullName(p).slice(0, 2).toUpperCase();

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  disputed:          { label: "Open",     color: "#DC2626", bg: "#FEF2F2", dot: "bg-red-500"    },
  disputed_resolved: { label: "Resolved", color: "#059669", bg: "#ECFDF5", dot: "bg-green-500"  },
};

// ─── Action card ──────────────────────────────────────────────────────────────
function ActionCard({
  icon, title, description, color, onClick, disabled,
}: {
  icon: React.ReactNode; title: string; description: string;
  color: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md ${color}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="text-xl">{icon}</div>
        <span className="font-bold text-gray-900 text-sm">{title}</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </button>
  );
}

// ─── Party card ───────────────────────────────────────────────────────────────
function PartyCard({ party, label, wallet, currency }: {
  party?: Party; label: string; wallet?: WalletSnap; currency?: string;
}) {
  if (!party) return null;
  const isNGN     = currency === "NGN";
  const balance   = isNGN ? wallet?.balance : wallet?.usdtBalance;
  const escrow    = isNGN ? wallet?.escrowLocked : wallet?.usdtEscrowLocked;
  const sym       = isNGN ? "₦" : "$";

  return (
    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
          {initials(party)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm truncate">{fullName(party)}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 shrink-0">{label}</span>
          </div>
          {party.rating && (
            <div className="flex items-center gap-1 mt-0.5">
              <HiStar className="h-3 w-3 text-amber-400" />
              <span className="text-xs text-gray-500">{party.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        {party.email && (
          <a href={`mailto:${party.email}`} className="flex items-center gap-2 text-indigo-600 hover:underline">
            <HiMail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{party.email}</span>
          </a>
        )}
        {party.phone && (
          <a href={`tel:${party.phone}`} className="flex items-center gap-2 text-green-600 hover:underline">
            <HiPhone className="h-3.5 w-3.5 shrink-0" /><span>{party.phone}</span>
          </a>
        )}
        {party.country && (
          <span className="flex items-center gap-2 text-gray-500">
            <HiOfficeBuilding className="h-3.5 w-3.5 shrink-0" />{party.country}
          </span>
        )}
      </div>

      {wallet && (
        <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-2.5 text-center">
            <p className="text-xs text-gray-400">Wallet</p>
            <p className="text-sm font-bold text-gray-800">{sym}{(balance || 0).toLocaleString()}</p>
          </div>
          {escrow !== undefined && (
            <div className="bg-white rounded-xl p-2.5 text-center">
              <p className="text-xs text-gray-400">Escrow</p>
              <p className="text-sm font-bold text-amber-600">{sym}{(escrow || 0).toLocaleString()}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminDisputeManagement() {
  const [disputes, setDisputes]   = useState<DisputeRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<"all" | "open" | "resolved">("open");
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Detail panel
  const [detail, setDetail]       = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action modal
  const [actionType, setActionType] = useState<"pay" | "refund" | "reassign" | "note" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [notifyBoth, setNotifyBoth] = useState(false);
  const [acting, setActing]         = useState(false);
  const [actError, setActError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15", search });
      if (filter !== "all") params.set("status", filter);
      const { data } = await axios.get(`${API_BASE}/disputes?${params}`, { withCredentials: true });
      setDisputes(data.disputes || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [page, filter, search]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await axios.get(`${API_BASE}/disputes/${id}`, { withCredentials: true });
      setDetail(data);
    } catch (err) {
      console.error(err);
    } finally { setDetailLoading(false); }
  };

  const submitAction = async () => {
    if (!detail) return;
    if (actionType !== "note" && !actionNote.trim()) {
      setActError("Please add a note explaining your decision to both parties.");
      return;
    }
    setActing(true); setActError("");
    try {
      const id = detail.dispute._id;
      const body = { note: actionNote.trim(), notifyBoth };

      if (actionType === "pay")      await axios.post(`${API_BASE}/disputes/${id}/pay-clipper`,      body, { withCredentials: true });
      if (actionType === "refund")   await axios.post(`${API_BASE}/disputes/${id}/refund-advertiser`, body, { withCredentials: true });
      if (actionType === "reassign") await axios.post(`${API_BASE}/disputes/${id}/reassign`,          body, { withCredentials: true });
      if (actionType === "note")     await axios.post(`${API_BASE}/disputes/${id}/note`,              { note: actionNote.trim(), notifyBoth }, { withCredentials: true });

      setActionType(null); setActionNote(""); setNotifyBoth(false);
      // Refresh detail + list
      await loadDetail(id);
      load();
    } catch (err: any) {
      setActError(err.response?.data?.error || "Action failed. Please try again.");
    } finally { setActing(false); }
  };

  const isResolved = detail?.dispute?.status === "disputed_resolved";

  const ACTION_META = {
    pay:      { title: "Pay Creator",    color: "bg-green-500 hover:bg-green-600",  label: "Confirm — Pay Creator"    },
    refund:   { title: "Refund Brand",   color: "bg-indigo-500 hover:bg-indigo-600", label: "Confirm — Refund Brand"   },
    reassign: { title: "Reassign Job",   color: "bg-amber-500 hover:bg-amber-600",  label: "Confirm — Reassign"       },
    note:     { title: "Add Note",       color: "bg-gray-600 hover:bg-gray-700",    label: "Save Note"                },
  };

  return (
    <div className="flex gap-5 h-full min-h-[80vh]">

      {/* ── Left: list panel ── */}
      <div className="w-96 shrink-0 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <MdOutlineGavel className="h-6 w-6 text-red-600" />
          <h2 className="text-lg font-bold text-gray-900">Disputes</h2>
          <span className="ml-auto text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">{total} total</span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <HiSearch className="text-gray-400 shrink-0" />
          <input
            className="flex-1 text-sm outline-none text-gray-700 bg-transparent"
            placeholder="Search campaign or creator…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["open","resolved","all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all capitalize ${filter === f ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <HiRefresh className="animate-spin h-4 w-4" /><span>Loading…</span>
            </div>
          ) : disputes.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-gray-300 gap-2">
              <MdOutlineGavel className="h-10 w-10" />
              <p className="text-sm font-medium">No disputes found</p>
            </div>
          ) : disputes.map((d) => {
            const cfg      = STATUS_CFG[d.status] || STATUS_CFG.disputed;
            const isActive = detail?.dispute._id === d._id;
            const sym      = d.paymentCurrency === "NGN" ? "₦" : "$";
            return (
              <button
                key={d._id}
                onClick={() => loadDetail(d._id)}
                className={`w-full text-left rounded-2xl p-3.5 border-2 transition-all ${isActive ? "border-red-400 bg-red-50" : "border-gray-100 bg-white hover:border-gray-200"}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">
                    {d.campaign?.title || "Untitled"}
                  </p>
                  <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full`}
                    style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <HiUser className="h-3 w-3" />{fullName(d.clipper)}
                  </span>
                  {d.paymentAmount && (
                    <span className="flex items-center gap-1 font-semibold text-amber-600">
                      <HiCash className="h-3 w-3" />{sym}{d.paymentAmount.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <HiClock className="h-3 w-3" />Updated {fmt(d.updatedAt)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="disabled:opacity-40 font-semibold">← Prev</button>
            <span>Page {page}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="disabled:opacity-40 font-semibold">Next →</button>
          </div>
        )}
      </div>

      {/* ── Right: detail panel ── */}
      <div className="flex-1 overflow-y-auto">
        {!detail && !detailLoading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
            <MdOutlineGavel className="h-16 w-16 opacity-30" />
            <p className="text-sm font-medium">Select a dispute to review</p>
          </div>
        )}

        {detailLoading && (
          <div className="flex items-center justify-center h-full text-gray-400 gap-2">
            <HiRefresh className="animate-spin h-5 w-5" /><span>Loading dispute…</span>
          </div>
        )}

        {detail && !detailLoading && (() => {
          const d       = detail.dispute;
          const adv     = d.campaign?.advertiser;
          const clipper = d.clipper;
          const sym     = d.paymentCurrency === "NGN" ? "₦" : "$";
          const cfg     = STATUS_CFG[d.status] || STATUS_CFG.disputed;

          return (
            <div className="space-y-4">

              {/* ── Status banner ── */}
              <div className={`rounded-2xl p-4 flex items-center gap-3 ${isResolved ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                {isResolved
                  ? <HiCheckCircle className="h-7 w-7 text-green-500 shrink-0" />
                  : <HiExclamationCircle className="h-7 w-7 text-red-500 shrink-0" />}
                <div>
                  <p className={`font-bold text-sm ${isResolved ? "text-green-800" : "text-red-800"}`}>
                    {isResolved ? "Dispute Resolved" : "⚠️ Active Dispute — Requires Resolution"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Campaign: <strong>{d.campaign?.title}</strong> · {d.campaign?.category} · Updated {fmt(d.updatedAt)}
                  </p>
                </div>
                {d.paymentAmount && (
                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-400">Escrow at stake</p>
                    <p className="text-lg font-black text-amber-600">{sym}{d.paymentAmount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{d.paymentCurrency}</p>
                  </div>
                )}
              </div>

              {/* ── Campaign brief ── */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Campaign Brief</h3>
                <p className="text-sm text-gray-600 line-clamp-4 leading-relaxed">{d.campaign?.description || "No description"}</p>
                {d.lastFeedback && (
                  <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-700 mb-1">Last Revision Feedback from Advertiser</p>
                    <p className="text-sm text-amber-800">{d.lastFeedback}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-gray-500">
                  <div className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-gray-400">Revisions</p>
                    <p className="font-bold text-gray-800">{d.revisionCount || 0}/3</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-gray-400">Submitted</p>
                    <p className="font-bold text-gray-800">{fmt(d.updatedAt)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-gray-400">Video</p>
                    <p className="font-bold text-indigo-600">
                      {d.currentVideoUrl
                        ? <a href={d.currentVideoUrl} target="_blank" rel="noreferrer" className="hover:underline">Watch ↗</a>
                        : "None"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Parties ── */}
              <div className="grid grid-cols-2 gap-3">
                <PartyCard
                  party={adv}
                  label="Advertiser"
                  wallet={detail.advWallet}
                  currency={d.paymentCurrency}
                />
                <PartyCard
                  party={clipper}
                  label="Creator"
                  wallet={detail.clipperWallet}
                  currency={d.paymentCurrency}
                />
              </div>

              {/* ── Resolution actions ── */}
              {!isResolved ? (
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <MdOutlineGavel className="h-5 w-5 text-gray-700" />
                    <h3 className="text-sm font-bold text-gray-900">Admin Resolution</h3>
                    <span className="text-xs text-gray-400 ml-auto">Contact both parties before deciding</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <ActionCard
                      icon={<HiCheckCircle className="h-5 w-5 text-green-600" />}
                      title="Pay Creator"
                      description="Creator delivered acceptable work. Release escrow to creator and mark campaign complete."
                      color="border-green-200 hover:bg-green-50"
                      onClick={() => { setActionType("pay"); setActionNote(""); setActError(""); }}
                    />
                    <ActionCard
                      icon={<HiCash className="h-5 w-5 text-indigo-600" />}
                      title="Refund Brand"
                      description="Creator failed to deliver. Return escrow to advertiser and cancel the campaign."
                      color="border-indigo-200 hover:bg-indigo-50"
                      onClick={() => { setActionType("refund"); setActionNote(""); setActError(""); }}
                    />
                    <ActionCard
                      icon={<HiRefresh className="h-5 w-5 text-amber-600" />}
                      title="Reassign Job"
                      description="Dismiss current creator. Reopen campaign so advertiser can pick a new creator from existing applicants."
                      color="border-amber-200 hover:bg-amber-50"
                      onClick={() => { setActionType("reassign"); setActionNote(""); setActError(""); }}
                    />
                    <ActionCard
                      icon={<HiDocumentText className="h-5 w-5 text-gray-600" />}
                      title="Add Note"
                      description="Log a contact attempt or update. Optionally notify both parties without resolving yet."
                      color="border-gray-200 hover:bg-gray-50"
                      onClick={() => { setActionType("note"); setActionNote(""); setActError(""); }}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                  <HiCheckCircle className="h-8 w-8 text-green-500 shrink-0" />
                  <div>
                    <p className="font-bold text-green-800">This dispute has been resolved</p>
                    <p className="text-xs text-green-600 mt-0.5">Resolved {fmt(d.updatedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ══════════ Action modal ══════════ */}
      {actionType && detail && (() => {
        const meta = ACTION_META[actionType];
        const d    = detail.dispute;
        const sym  = d.paymentCurrency === "NGN" ? "₦" : "$";

        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
              {/* Modal header */}
              <div className={`px-6 py-5 ${actionType === "pay" ? "bg-green-50" : actionType === "refund" ? "bg-indigo-50" : actionType === "reassign" ? "bg-amber-50" : "bg-gray-50"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{meta.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{d.campaign?.title}</p>
                  </div>
                  <button onClick={() => { setActionType(null); setActError(""); }} className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center hover:bg-white">
                    <HiX className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                {/* Payment summary */}
                {(actionType === "pay" || actionType === "refund") && d.paymentAmount && (
                  <div className={`mt-3 rounded-xl p-3 text-center ${actionType === "pay" ? "bg-green-100" : "bg-indigo-100"}`}>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      {actionType === "pay" ? "Releasing to creator" : "Returning to advertiser"}
                    </p>
                    <p className={`text-2xl font-black ${actionType === "pay" ? "text-green-700" : "text-indigo-700"}`}>
                      {sym}{d.paymentAmount.toLocaleString()} {d.paymentCurrency}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-4">
                {/* Consequences */}
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
                  {actionType === "pay" && (
                    <>
                      <p>✅ Escrow released to creator wallet</p>
                      <p>✅ Campaign marked as completed</p>
                      <p>✅ Both parties notified</p>
                    </>
                  )}
                  {actionType === "refund" && (
                    <>
                      <p>💰 Escrow returned to advertiser wallet</p>
                      <p>❌ Campaign cancelled — creator receives nothing</p>
                      <p>✅ Both parties notified</p>
                    </>
                  )}
                  {actionType === "reassign" && (
                    <>
                      <p>🔄 Current creator dismissed from job</p>
                      <p>🟢 Campaign reopened — advertiser can select new creator</p>
                      <p>💰 Escrow stays locked for new creator selection</p>
                      <p>✅ Both parties notified</p>
                    </>
                  )}
                  {actionType === "note" && (
                    <p>📋 Dispute stays open. Use this to log contact attempts or keep both parties updated.</p>
                  )}
                </div>

                {/* Note field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {actionType === "note" ? "Note" : "Resolution Message to Both Parties"}
                    {actionType !== "note" && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <textarea
                    rows={4}
                    className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors"
                    placeholder={
                      actionType === "pay"      ? "e.g. After reviewing the submission and revision history, we are releasing payment to the creator as the work meets the campaign requirements..." :
                      actionType === "refund"   ? "e.g. After reviewing both parties' evidence, we are refunding the advertiser as the submitted content did not match the agreed brief..." :
                      actionType === "reassign" ? "e.g. Due to irreconcilable differences on the brief, we are resetting the campaign. The advertiser may now select a new creator..." :
                      "e.g. We have reviewed your submissions and are currently investigating. We will provide a final decision within 24 hours..."
                    }
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                  />
                </div>

                {/* Notify both toggle (for notes) */}
                {actionType === "note" && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyBoth}
                      onChange={(e) => setNotifyBoth(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">Send this note as a notification to both parties</span>
                  </label>
                )}

                {/* Error */}
                {actError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    <HiExclamationCircle className="h-4 w-4 shrink-0" />{actError}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setActionType(null); setActError(""); }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitAction}
                    disabled={acting}
                    className={`flex-2 flex-1 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${meta.color}`}
                  >
                    {acting ? (
                      <><HiRefresh className="animate-spin h-4 w-4" />Processing…</>
                    ) : meta.label}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
