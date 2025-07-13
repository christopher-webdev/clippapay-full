

// src/components/admin/CampaignsManagement.tsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import { HiSearch, HiTrash, HiPencil, HiEye } from "react-icons/hi";
const PAGE_SIZE = 12;

const platformLabels: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
};

interface CampaignRow {
  _id: string;
  title: string;
  status: string;
  platforms: string[];
  advertiser?: { email: string; firstName?: string; lastName?: string; company?: string; contactName?: string };
  assignedWorker?: { email: string };
  rate_per_1000: number;
  clipper_cpm: number;
  budget_total: number;
  budget_remaining: number;
  views_purchased: number;
  views_left: number;
  categories?: string[];
  countries?: string[];
  hashtags?: string[];
  createdAt: string;
  adWorkerStatus?: string;
}

export default function CampaignsManagement() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/admin-campaigns");
        setCampaigns(res.data);
      } catch (err) {
        console.error("Error fetching campaigns:", err);
        // You might want to set an error state here if needed
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchCampaigns();

    // Set up interval for periodic fetching (every 15 seconds)
    const intervalId = setInterval(fetchCampaigns, 15000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  // Filter
  const filtered = campaigns.filter(c => {
    if (
      search &&
      !(c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.advertiser?.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.platforms.join(",").toLowerCase().includes(search.toLowerCase()))
    ) return false;
    if (status && c.status !== status) return false;
    if (platform && !c.platforms.includes(platform)) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this campaign and ALL related proofs?")) return;
    setErr(null);
    try {
      await axios.delete(`/admin-campaigns/${id}`);
      setCampaigns(prev => prev.filter(c => c._id !== id));
    } catch (err: any) {
      setErr(err.response?.data?.error || "Could not delete campaign");
    }
  };

  // UI
  return (
    <div className="p-2 md:p-6">
      <div className="flex flex-col md:flex-row gap-2 md:gap-6 items-stretch md:items-end mb-4">
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search title, email, platform…"
            className="w-full rounded-xl border px-4 py-2 pl-10 text-sm focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
        <select
          className="rounded-xl border px-3 py-2 text-sm"
          value={platform}
          onChange={e => { setPlatform(e.target.value); setPage(1); }}
        >
          <option value="">Platform</option>
          {Object.entries(platformLabels).map(([val, label]) =>
            <option key={val} value={val}>{label}</option>
          )}
        </select>
        <select
          className="rounded-xl border px-3 py-2 text-sm"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">Status</option>
          {["pending", "active", "paused", "completed", "cancelled"].map(st =>
            <option key={st} value={st}>{st[0].toUpperCase() + st.slice(1)}</option>
          )}
        </select>
      </div>
      {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
      {/* TABLE */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-left">Campaign</th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-left">Platform</th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-left">Financials</th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-left">Views</th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-left">Status</th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400">Loading…</td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">No campaigns found.</td>
              </tr>
            ) : (
              pageRows.map(c => (
                <tr key={c._id}>
                  <td className="px-2 py-3 align-top max-w-[220px]">
                    <div className="font-semibold text-gray-900">{c.title}</div>
                    <div className="text-xs text-gray-700">
                      Adv: {c.advertiser?.firstName || c.advertiser?.contactName || c.advertiser?.company || c.advertiser?.email}
                    </div>
                    {c.categories && c.categories.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {c.categories.join(", ")}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      Created: {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-2 py-3 align-top text-xs">
                    <div className="flex flex-wrap gap-1">
                      {c.platforms.map(p => (
                        <span key={p} className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs">{platformLabels[p] || p}</span>
                      ))}
                    </div>
                    {c.countries && c.countries.length > 0 && (
                      <div className="mt-1 text-gray-400">Countries: {c.countries.join(', ')}</div>
                    )}
                  </td>
                  <td className="px-2 py-3 align-top text-xs">
                    <div>Budget: <b><span>₦</span>{c.budget_total?.toLocaleString()}</b></div>
                    <div>Remain: <b><span>₦</span>{c.budget_remaining?.toLocaleString()}</b></div>
                    <div>CPM: <b><span>₦</span>{c.rate_per_1000}</b></div>
                    <div>Clipper CPM: <b><span>₦</span>{c.clipper_cpm}</b></div>

                  </td>
                  <td className="px-2 py-3 align-top text-xs">
                    <div>Target: <b>{c.views_purchased?.toLocaleString()}</b></div>
                    <div>Left: <b>{c.views_left?.toLocaleString()}</b></div>
                    <div>Clippers: <b>{c.clippersCount ?? "—"}</b></div>
                  </td>
                  <td className="px-2 py-3 align-top text-xs">
                    <span className={
                      "inline-block px-2 py-1 rounded-full " +
                      (c.status === "completed" ? "bg-green-100 text-green-700" :
                        c.status === "paused" ? "bg-yellow-100 text-yellow-800" :
                          c.status === "active" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-200 text-gray-600")
                    }>
                      {c.status[0].toUpperCase() + c.status.slice(1)}
                    </span>
                    {c.adWorkerStatus && (
                      <div className="text-xs mt-1">Worker: {c.adWorkerStatus}</div>
                    )}
                  </td>
                  <td className="px-2 py-3 align-top text-xs">
                    <div className="flex flex-col gap-2">
                      <button
                        title="View"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        onClick={() => window.open(`/admin/campaigns/${c._id}`, "_blank")}
                      >
                        <HiEye className="w-4 h-4" /> View
                      </button>
                      <button
                        title="Edit"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-800"
                      // onClick={handleEdit(c)} // implement modal for editing if you want
                      >
                        <HiPencil className="w-4 h-4" /> Edit
                      </button>
                      <button
                        title="Delete"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700"
                        onClick={() => handleDelete(c._id)}
                      >
                        <HiTrash className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex justify-between items-center mt-6 mb-2 px-1">
        <div className="text-sm text-gray-500">
          Showing {(page - 1) * PAGE_SIZE + 1}-{
            Math.min(page * PAGE_SIZE, filtered.length)
          } of {filtered.length} campaigns
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="px-2 py-1 rounded bg-gray-100 text-xs"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-xs">{page} / {totalPages || 1}</span>
          <button
            className="px-2 py-1 rounded bg-gray-100 text-xs"
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
