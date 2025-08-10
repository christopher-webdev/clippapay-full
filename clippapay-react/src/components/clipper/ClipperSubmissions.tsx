import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiExternalLink,
  HiPhotograph,
  HiVideoCamera,
  HiPencilAlt
} from 'react-icons/hi';

const ALL_PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'X'];
const PLATFORM_LABELS = {
  TikTok: 'TikTok',
  Instagram: 'Instagram',
  YouTube: 'YouTube',
  Facebook: 'Facebook',
  X: 'X',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
  x: 'X',
};

// ======= CONFIG =======
// Show at most this many campaign cards per page
const PAGE_SIZE = 7;

// If true, COMPLETED campaigns will not render at all
const HIDE_COMPLETED_CARDS = false;

// If not hiding, and this is true, show a “Campaign Completed” badge
// in place of the Update button
const SHOW_COMPLETED_BADGE = true;
// ======================

export default function ClipperSubmissions() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const campaignId = params.get('campaign');

  const [page, setPage] = useState(1);
  const [campaign, setCampaign] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState('new');
  const [formSubmissionId, setFormSubmissionId] = useState(null);
  const [formProofId, setFormProofId] = useState(null);
  const [platformBlocks, setPlatformBlocks] = useState([
    { platform: '', submissionUrl: '', views: '', proofVideo: null, proofImage: null }
  ]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // ——— Helpers: robust campaign completion check ———
  const isCampaignCompleted = (submission) => {
    const camp =
      (typeof submission.campaign === 'object' && submission.campaign) ? submission.campaign : null;

    const status =
      camp?.status ??
      submission.campaignStatus ??               // sometimes sent separately
      submission.status;                         // (last resort; avoid if clashes with proof status)

    const viewsLeft =
      camp?.views_left ??
      camp?.viewsLeft ??
      submission.campaignViewsLeft;

    // Completed if explicit status or no views left (0 or below)
    if (status === 'completed') return true;
    if (typeof viewsLeft === 'number' && viewsLeft <= 0) return true;
    return false;
  };

  // Fetch campaign info if needed
  useEffect(() => {
    async function fetchCampaign() {
      if (!campaignId) return setCampaign(null);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/clippers/${campaignId}`, { headers: { Authorization: `Bearer ${token}` } });
        setCampaign(res.data);
      } catch {
        setCampaign(null);
      }
    }
    fetchCampaign();
  }, [campaignId]);

  // Fetch submissions
  async function loadSubmissions() {
    setLoading(true);
    try {
      const res = await axios.get('/clippers/my-submissions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSubmissions(res.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadSubmissions(); }, []);

  // Auto-show form
  useEffect(() => {
    if (!campaignId || !campaign) return;
    const existing = submissions.find(s => s.campaign?._id === campaignId || s.campaign === campaignId);
    if (!existing) {
      setPlatformBlocks(
        (campaign.platforms || []).map(p => ({
          platform: p,
          submissionUrl: '',
          views: '',
          proofVideo: null,
          proofImage: null
        }))
      );
      setFormMode('new');
      setFormSubmissionId(null);
      setFormProofId(null);
      setFormVisible(true);
    } else if (existing && existing.proofs?.length > 0) {
      const firstProof = existing.proofs[0];
      setPlatformBlocks([{
        platform: firstProof.platform,
        submissionUrl: firstProof.submissionUrl || '',
        views: firstProof.views || '',
        proofVideo: null,
        proofImage: null
      }]);
      setFormMode('edit');
      setFormSubmissionId(existing._id);
      setFormProofId(firstProof._id);
      setFormVisible(true);
    }
  }, [campaignId, campaign, submissions]);

  // Build visible list based on completion setting
  const visibleSubmissions = HIDE_COMPLETED_CARDS
    ? submissions.filter(s => !isCampaignCompleted(s))
    : submissions.slice();

  // Pagination computed off visible list
  const totalPages = Math.max(1, Math.ceil(visibleSubmissions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedSubmissions = visibleSubmissions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page to 1 when the visible list changes (prevents empty pages)
  useEffect(() => {
    setPage(1);
  }, [submissions.length, HIDE_COMPLETED_CARDS]); // eslint-disable-line

  const platformOptions = (excludeIdx) =>
    (campaign?.platforms || ALL_PLATFORMS).filter(
      p => !platformBlocks.map((b, i) => (i !== excludeIdx ? b.platform : null)).includes(p)
    );

  const addPlatformBlock = () =>
    setPlatformBlocks(blocks => [
      ...blocks,
      { platform: '', submissionUrl: '', views: '', proofVideo: null, proofImage: null }
    ]);

  const removePlatformBlock = (idx) =>
    setPlatformBlocks(blocks =>
      blocks.length === 1 ? blocks : blocks.filter((_, i) => i !== idx)
    );

  const handleBlockChange = (idx, field, value) => {
    setPlatformBlocks(blocks =>
      blocks.map((b, i) => (i === idx ? { ...b, [field]: value } : b))
    );
  };

  // Update form
  async function openProofFormEdit(sub, proof) {
    let camp = sub.campaign;
    if (!camp || typeof camp === 'string') {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/clippers/${typeof camp === 'string' ? camp : proof.campaign || sub.campaign}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        camp = res.data;
      } catch {
        camp = { _id: typeof sub.campaign === 'string' ? sub.campaign : undefined, title: 'Untitled campaign' };
      }
    }
    setCampaign(camp);
    setPlatformBlocks([{
      platform: proof.platform,
      submissionUrl: proof.submissionUrl || '',
      views: proof.views || '',
      proofVideo: null,
      proofImage: null
    }]);
    setFormMode('edit');
    setFormSubmissionId(sub._id);
    setFormProofId(proof._id);
    setFormVisible(true);
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const token = localStorage.getItem('token');
      for (let b of platformBlocks) {
        if (!b.platform || !b.submissionUrl) {
          setFormError('Platform and Submission Link are required.');
          setFormLoading(false);
          return;
        }
        const fd = new FormData();
        fd.append('platform', b.platform);
        fd.append('submissionUrl', b.submissionUrl);
        fd.append('views', b.views || '0');
        if (b.proofVideo) fd.append('proofVideo', b.proofVideo);
        if (b.proofImage) fd.append('proofImage', b.proofImage);

        if (formMode === 'edit' && formSubmissionId && formProofId) {
          await axios.patch(`/clippers/${formSubmissionId}/update-proof/${formProofId}`, fd, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          await axios.post(`/clippers/${campaignId}/submit-clip`, fd, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
          });
        }
      }
      setFormVisible(false);
      setFormError('');
      setPlatformBlocks([{ platform: '', submissionUrl: '', views: '', proofVideo: null, proofImage: null }]);
      await loadSubmissions();
      if (campaignId) navigate('/dashboard/clipper/submissions', { replace: true });
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not submit.');
    } finally {
      setFormLoading(false);
    }
  };

  const closeForm = () => {
    setFormVisible(false);
    setFormError('');
    setPlatformBlocks([{ platform: '', submissionUrl: '', views: '', proofVideo: null, proofImage: null }]);
    if (campaignId) navigate('/dashboard/clipper/submissions', { replace: true });
  };

  return (
    <div className="max-w-4xl mx-auto px-2 py-7">
      <h2 className="text-2xl font-bold mb-4">My Submissions</h2>

      {formVisible && (
        <section className="mb-7 bg-white shadow rounded-xl p-5">
          <form onSubmit={handleFormSubmit}>
            {campaign && campaign.title && (
              <h1 className="text-2xl font-bold mb-3">{campaign.title}</h1>
            )}
            {platformBlocks.map((block, idx) => (
              <div key={idx} className="border rounded-lg p-4 mb-5 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={block.platform}
                    onChange={e => handleBlockChange(idx, 'platform', e.target.value)}
                    required
                    disabled={formMode === 'edit'}
                    className="border p-2 rounded flex-1"
                  >
                    <option value="">Select Platform</option>
                    {platformOptions(idx).map(p => (
                      <option key={p} value={p}>{PLATFORM_LABELS[p] || p}</option>
                    ))}
                  </select>
                  {platformBlocks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePlatformBlock(idx)}
                      className="text-red-500 text-xs ml-2"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  value={block.submissionUrl}
                  onChange={e => handleBlockChange(idx, 'submissionUrl', e.target.value)}
                  placeholder="Submission Link"
                  className="border p-2 rounded mb-2 block w-full"
                  required
                />
                <input
                  value={block.views}
                  onChange={e => handleBlockChange(idx, 'views', e.target.value)}
                  placeholder="Views (optional)"
                  type="number"
                  min={0}
                  className="border p-2 rounded mb-2 block w-full"
                />
                <div className="mb-2">
                  <label className="text-xs block mb-1">Upload Video Proof (optional)</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={e => handleBlockChange(idx, 'proofVideo', e.target.files?.[0] || null)}
                  />
                </div>
                <div className="mb-2">
                  <label className="text-xs block mb-1">Upload Image Proof (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleBlockChange(idx, 'proofImage', e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            ))}
            {formMode === 'new' && (
              <button
                type="button"
                onClick={addPlatformBlock}
                disabled={platformBlocks.length === (campaign?.platforms?.length || ALL_PLATFORMS.length)}
                className="bg-blue-100 text-blue-800 rounded px-3 py-1 mb-4 mr-2"
              >
                + Add Platform
              </button>
            )}
            {formError && <div className="text-red-500 mb-3">{formError}</div>}
            <div className="flex gap-2">
              <button type="button" className="bg-gray-300 text-gray-700 rounded px-5 py-2" onClick={closeForm}>Cancel</button>
              <button type="submit" className="bg-green-600 text-white rounded px-5 py-2">
                {formLoading ? 'Submitting…' : (formMode === 'edit' ? 'Update' : 'Submit')}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading...</div>
      ) : (
        <>
          {pagedSubmissions.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No submissions yet.</div>
          ) : (
            pagedSubmissions.map(sub => {
              const campaignObj = (typeof sub.campaign === 'object' && sub.campaign !== null) ? sub.campaign : null;
              const campTitle = campaignObj?.title ?? 'Untitled campaign';
              const completed = isCampaignCompleted(sub);

              return (
                <div key={sub._id} className="bg-white p-5 rounded-xl shadow mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-semibold text-base">{campTitle}</div>
                    {completed && !HIDE_COMPLETED_CARDS && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        Campaign Completed
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(sub.proofs || []).map((proof, i) => (
                      <div key={i} className="border rounded-lg p-3 bg-gray-50 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          {proof.status === 'approved' && <HiCheckCircle className="text-green-500 w-5 h-5" />}
                          {proof.status === 'pending' && <HiExclamationCircle className="text-yellow-400 w-5 h-5" />}
                          {proof.status === 'rejected' && <HiExclamationCircle className="text-red-400 w-5 h-5" />}
                          <span className="font-bold">{proof.status?.toUpperCase?.()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs mb-1">
                          {proof.proofVideo && <span className="flex items-center gap-1 text-blue-700"><HiVideoCamera className="w-4 h-4" /> Video</span>}
                          {proof.proofImage && <span className="flex items-center gap-1 text-blue-700"><HiPhotograph className="w-4 h-4" /> Image</span>}
                          {proof.submissionUrl && (
                            <a href={proof.submissionUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-700 underline">
                              <HiExternalLink className="w-4 h-4" /> Link
                            </a>
                          )}
                        </div>
                        <div className="text-xs text-gray-700 mb-1">Reported Views: <b>{proof.views?.toLocaleString?.() ?? 0}</b></div>
                        {proof.verifiedViews && <div className="text-xs text-green-700">Verified: <b>{proof.verifiedViews.toLocaleString()}</b></div>}
                        {proof.rewardAmount && <div className="text-xs text-green-700">Reward: ₦{proof.rewardAmount.toLocaleString()}</div>}
                        {proof.adminNote && (
                          <div className={`mt-2 p-2 rounded text-xs ${proof.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                            <b>Admin note:</b> {proof.adminNote}
                          </div>
                        )}

                        {/* Update button or Completed badge */}
                        {!completed ? (
                          <button
                            onClick={() => openProofFormEdit(sub, proof)}
                            className="flex items-center mt-2 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-800 text-xs font-semibold"
                          >
                            <HiPencilAlt className="w-4 h-4 mr-1" /> Update
                          </button>
                        ) : (
                          !HIDE_COMPLETED_CARDS && SHOW_COMPLETED_BADGE && (
                            <div className="mt-2 inline-flex items-center px-3 py-1 rounded bg-gray-200 text-gray-700 text-xs font-semibold">
                              Campaign Completed
                            </div>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2 text-sm">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
