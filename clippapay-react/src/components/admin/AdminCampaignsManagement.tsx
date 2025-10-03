// File: src/components/admin/CampaignsManagement.tsx
import React, { useEffect, useState, ChangeEvent } from "react";
import axios from "axios";
import { HiSearch, HiTrash, HiPencil, HiX } from "react-icons/hi";
import Modal from "react-modal";

const PAGE_SIZE = 100;

Modal.setAppElement('#root');

const platformLabels: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  X: "X",
};

const categoryOptions = [
  'Fashion', 'Science & Tech', 'Gaming', 'Food', 'Travel', 'TV/Movies & Entertainment',
  'Sports', 'Education', 'Politics', 'Religion', 'Business & Investment', 'Health & Fitness',
  'Lifestyle', 'News & Media', 'Real Estate', 'Pets & Animals', 'Agriculture',
  'Music', 'Comedy', 'DIY & Crafts', 'Other',
];

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
  directions?: string[];
  cta_url?: string;
  createdAt: string;
  adWorkerStatus?: string;
  clippersCount?: number;
  ugc?: {
    brief?: string;
    deliverables?: string[];
    assets?: string[];
    captionTemplate?: string;
    usageRights?: string;
    approvalCriteria?: string;
  };
}

export default function CampaignsManagement() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState<CampaignRow | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    platforms: [] as string[],
    hashtags: '' as string,
    directions: '' as string,
    categories: [] as string[],
    cta_url: '' as string,
    brief: '' as string,
    deliverables: '' as string,
    captionTemplate: '' as string,
    usageRights: '' as string,
    approvalCriteria: '' as string,
  });
  const [existingAssets, setExistingAssets] = useState<string[]>([]);
  const [newAssets, setNewAssets] = useState<File[]>([]);
  const [removedAssets, setRemovedAssets] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/admin-campaigns/adworker-campaign");
        setCampaigns(res.data);
      } catch (err) {
        console.error("Error fetching campaigns:", err);
        setErr("Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
    const intervalId = setInterval(fetchCampaigns, 150000);
    return () => clearInterval(intervalId);
  }, []);

  // Filter
  const filtered = campaigns.filter(c => {
    if (
      search &&
      !(
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.advertiser?.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.platforms.join(",").toLowerCase().includes(search.toLowerCase())
      )
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

  // Edit Modal
  const openEditModal = (campaign: CampaignRow) => {
    setCurrentCampaign(campaign);
    setEditForm({
      title: campaign.title,
      platforms: campaign.platforms || [],
      hashtags: campaign.hashtags?.join(', ') || '',
      directions: campaign.directions?.join(', ') || '',
      categories: campaign.categories || [],
      cta_url: campaign.cta_url || '',
      brief: campaign.ugc?.brief || '',
      deliverables: campaign.ugc?.deliverables?.join(', ') || '',
      captionTemplate: campaign.ugc?.captionTemplate || '',
      usageRights: campaign.ugc?.usageRights || '',
      approvalCriteria: campaign.ugc?.approvalCriteria || '',
    });
    setExistingAssets(campaign.ugc?.assets || []);
    setNewAssets([]);
    setRemovedAssets([]);
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'platforms') {
      const options = e.target as HTMLSelectElement;
      const selectedPlatforms = Array.from(options.selectedOptions).map(opt => opt.value);
      setEditForm(prev => ({ ...prev, platforms: selectedPlatforms }));
    } else if (name === 'hashtags' || name === 'directions' || name === 'deliverables') {
      setEditForm(prev => ({ ...prev, [name]: value }));
    } else if (name === 'brief' || name === 'captionTemplate' || name === 'usageRights' || name === 'approvalCriteria' || name === 'cta_url') {
      setEditForm(prev => ({ ...prev, [name]: value }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCategoryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setEditForm(prev => ({
      ...prev,
      categories: checked
        ? [...prev.categories, value]
        : prev.categories.filter(c => c !== value),
    }));
  };

  const handleNewAssets = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewAssets(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleRemoveAsset = (asset: string) => {
    setExistingAssets(prev => prev.filter(a => a !== asset));
    setRemovedAssets(prev => [...prev, asset]);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCampaign) return;

    setErr(null);
    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('title', editForm.title);
      fd.append('platforms', JSON.stringify(editForm.platforms));
      fd.append('hashtags', editForm.hashtags);
      fd.append('directions', editForm.directions);
      fd.append('categories', JSON.stringify(editForm.categories));
      fd.append('cta_url', editForm.cta_url);
      fd.append('brief', editForm.brief);
      fd.append('deliverables', editForm.deliverables);
      fd.append('captionTemplate', editForm.captionTemplate);
      fd.append('usageRights', editForm.usageRights);
      fd.append('approvalCriteria', editForm.approvalCriteria);

      // Append new assets
      newAssets.forEach(file => fd.append('assets', file));

      // Append removed assets (if any)
      if (removedAssets.length > 0) {
        fd.append('removeAssets', JSON.stringify(removedAssets));
      }

      const res = await axios.put(`/admin-campaigns/admin-campaigns/${currentCampaign._id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCampaigns(prev =>
        prev.map(c =>
          c._id === currentCampaign._id ? { ...c, ...res.data } : c
        )
      );
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error("Update error:", err);
      setErr(err.response?.data?.error || "Could not update campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                        <span key={p} className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs">
                          {platformLabels[p] || p}
                        </span>
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
                        title="Edit"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-800"
                        onClick={() => openEditModal(c)}
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

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onRequestClose={() => setIsEditModalOpen(false)}
        className="modal"
        overlayClassName="modal-overlay"
        contentLabel="Edit Campaign"
      >
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Edit Campaign</h2>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <HiX className="w-6 h-6" />
            </button>
          </div>

          {currentCampaign && (
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditFormChange}
                    className="w-full rounded border px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platforms</label>
                  <select
                    name="platforms"
                    multiple
                    value={editForm.platforms}
                    onChange={handleEditFormChange}
                    className="w-full rounded border px-3 py-2"
                  >
                    {Object.entries(platformLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {categoryOptions.map(category => (
                      <label key={category} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="categories"
                          value={category}
                          checked={editForm.categories.includes(category)}
                          onChange={handleCategoryChange}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA URL (optional)</label>
                  <input
                    type="text"
                    name="cta_url"
                    value={editForm.cta_url}
                    onChange={handleEditFormChange}
                    className="w-full rounded border px-3 py-2"
                    placeholder="e.g. https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
                  <input
                    type="text"
                    name="hashtags"
                    value={editForm.hashtags}
                    onChange={handleEditFormChange}
                    className="w-full rounded border px-3 py-2"
                    placeholder="comma, separated, list"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Directions</label>
                  <textarea
                    name="directions"
                    value={editForm.directions}
                    onChange={handleEditFormChange}
                    className="w-full rounded border px-3 py-2"
                    placeholder="comma, separated, list"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Creative Brief</label>
                  <textarea
                    name="brief"
                    value={editForm.brief}
                    onChange={handleEditFormChange}
                    className="w-full rounded border px-3 py-2"
                    rows={5}
                    placeholder="e.g. Create a 30-60 second video..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deliverables</label>
                  <textarea
                    name="deliverables"
                    value={editForm.deliverables}
                    onChange={handleEditFormChange}
                    className="w-full rounded border px-3 py-2"
                    rows={3}
                    placeholder="comma, separated, list"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Caption Template</label>
                  <textarea
                    name="captionTemplate"
                    value={editForm.captionTemplate}
                    onChange={handleEditFormChange}
                    className="w-full rounded border px-3 py-2"
                    rows={3}
                    placeholder="e.g. Check out [product]!..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usage Rights</label>
                  <textarea
                    name="usageRights"
                    value={editForm.usageRights}
                    onChange={handleEditFormChange}
                    className="w-full rounded border px-3 py-2"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approval Criteria</label>
                  <textarea
                    name="approvalCriteria"
                    value={editForm.approvalCriteria}
                    onChange={handleEditFormChange}
                    className="w-full rounded border px-3 py-2"
                    rows={4}
                    placeholder="e.g. Must be 1080p..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Assets</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md px-6 py-4 text-center">
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="new-asset-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          <span>Upload new files</span>
                          <input
                            id="new-asset-upload"
                            name="new-asset-upload"
                            type="file"
                            multiple
                            onChange={handleNewAssets}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">Images, videos, PDFs up to 200MB</p>
                    </div>
                  </div>

                  {existingAssets.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700">Existing Assets</h3>
                      <ul className="space-y-2 mt-2">
                        {existingAssets.map((asset, index) => (
                          <li key={index} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                            <span className="text-sm text-gray-900 truncate max-w-xs">{asset.split('/').pop()}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAsset(asset)}
                              className="text-red-600 hover:text-red-500 text-sm"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {newAssets.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700">New Assets to Upload</h3>
                      <ul className="space-y-2 mt-2">
                        {newAssets.map((file, index) => (
                          <li key={index} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                            <span className="text-sm text-gray-900 truncate max-w-xs">{file.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
          {err && <div className="text-red-600 text-sm mt-4">{err}</div>}
        </div>
      </Modal>

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