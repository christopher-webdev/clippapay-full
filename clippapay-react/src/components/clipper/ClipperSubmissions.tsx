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

const ALL_PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook'];
const PLATFORM_LABELS = {
  TikTok: 'TikTok',
  Instagram: 'Instagram',
  YouTube: 'YouTube',
  Facebook: 'Facebook',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook'
};
const PAGE_SIZE = 5;

function campaignIsCompleted(status) {
  return status === 'completed' || status === 'cancelled';
}

export default function ClipperSubmissions() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const campaignId = params.get('campaign');

  // Pagination
  const [page, setPage] = useState(1);

  // Data states
  const [campaign, setCampaign] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form (new or edit)
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState('new');
  const [formSubmissionId, setFormSubmissionId] = useState(null);
  const [formProofId, setFormProofId] = useState(null);
  const [platformBlocks, setPlatformBlocks] = useState([
    { platform: '', submissionUrl: '', views: '', proofVideo: null, proofImage: null }
  ]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

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

  // Fetch all submissions for this user
  async function loadSubmissions() {
    setLoading(true);
    try {
      const res = await axios.get('/clippers/my-submissions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSubmissions(res.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadSubmissions(); }, []);

  // Handle auto-show form on ?campaign=xxx
  useEffect(() => {
    if (!campaignId || !campaign) return;
    const existing = submissions.find(s => s.campaign._id === campaignId);
    if (!existing) {
      setPlatformBlocks([
        ...((campaign.platforms || []).map(p => ({
          platform: p,
          submissionUrl: '',
          views: '',
          proofVideo: null,
          proofImage: null
        })))
      ]);
      setFormMode('new');
      setFormSubmissionId(null);
      setFormProofId(null);
      setFormVisible(true);
    } else if (existing && existing.proofs.length > 0) {
      const firstProof = existing.proofs[0];
      setPlatformBlocks([
        {
          platform: firstProof.platform,
          submissionUrl: firstProof.submissionUrl || '',
          views: firstProof.views || '',
          proofVideo: null,
          proofImage: null
        }
      ]);
      setFormMode('edit');
      setFormSubmissionId(existing._id);
      setFormProofId(firstProof._id);
      setFormVisible(true);
    }
    // eslint-disable-next-line
  }, [campaignId, campaign, submissions.length]);

  // Pagination helpers
  const totalPages = Math.ceil(submissions.length / PAGE_SIZE);
  const pagedSubmissions = submissions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Form handlers
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

  // When clicking 'Update'
  function openProofFormEdit(submission, proof) {
    setCampaign(submission.campaign);
    setPlatformBlocks([
      {
        platform: proof.platform,
        submissionUrl: proof.submissionUrl || '',
        views: proof.views || '',
        proofVideo: null,
        proofImage: null
      }
    ]);
    setFormMode('edit');
    setFormSubmissionId(submission._id);
    setFormProofId(proof._id);
    setFormVisible(true);
  }

  // Handle form submit (Create or Patch)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const token = localStorage.getItem('token');
      for (let b of platformBlocks) {
        if (!b.platform || !b.submissionUrl || !b.views) {
          setFormError('All fields are required.');
          setFormLoading(false);
          return;
        }
        const needsProof = b.platform === 'TikTok' || b.platform === 'YouTube';
        if (needsProof && !b.proofVideo && !b.proofImage && formMode === 'new') {
          setFormError(`Video or image proof is required for ${b.platform}.`);
          setFormLoading(false);
          return;
        }
        const fd = new FormData();
        fd.append('platform', b.platform);
        fd.append('submissionUrl', b.submissionUrl);
        fd.append('views', b.views);
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

      {/* --- Form Section --- */}
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
                  placeholder="Views"
                  type="number"
                  min={0}
                  className="border p-2 rounded mb-2 block w-full"
                  required
                />
                <div className="mb-2">
                  <label className="text-xs block mb-1">
                    Upload Video Proof{' '}
                    {['TikTok', 'YouTube'].includes(block.platform) && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    required={['TikTok', 'YouTube'].includes(block.platform) && formMode === 'new'}
                    onChange={e =>
                      handleBlockChange(idx, 'proofVideo', e.target.files?.[0] || null)
                    }
                    className="block"
                  />
                </div>
                <div className="mb-2">
                  <label className="text-xs block mb-1">
                    Upload Image Proof{' '}
                    {['TikTok', 'YouTube'].includes(block.platform) && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required={['TikTok', 'YouTube'].includes(block.platform) && formMode === 'new'}
                    onChange={e =>
                      handleBlockChange(idx, 'proofImage', e.target.files?.[0] || null)
                    }
                    className="block"
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
            <br />
            {formError && <div className="text-red-500 mb-3">{formError}</div>}
            <div className="flex gap-2">
              <button
                type="button"
                className="bg-gray-300 text-gray-700 rounded px-5 py-2"
                onClick={closeForm}
                disabled={formLoading}
              >Cancel</button>
              <button
                type="submit"
                className="bg-green-600 text-white rounded px-5 py-2"
                disabled={formLoading}
              >{formLoading ? 'Submitting…' : (formMode === 'edit' ? 'Update' : 'Submit')}</button>
            </div>
          </form>
        </section>
      )}

      {/* --- Submissions List (with Pagination) --- */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading...</div>
      ) : (
        <>
          {pagedSubmissions.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              No submissions yet.
            </div>
          ) : (
            pagedSubmissions.map(sub => (
              <div key={sub._id} className="bg-white p-5 rounded-xl shadow mb-4">
                <div className="font-semibold text-base mb-2">{sub.campaign.title}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(sub.proofs || []).map((proof, i) => (
                    <div key={i} className="border rounded-lg p-3 bg-gray-50 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        {proof.status === 'approved' && <HiCheckCircle className="text-green-500 w-5 h-5" />}
                        {proof.status === 'pending' && <HiExclamationCircle className="text-yellow-400 w-5 h-5" />}
                        {proof.status === 'rejected' && <HiExclamationCircle className="text-red-400 w-5 h-5" />}
                        <span className="font-bold">{proof.status.toUpperCase()}</span>
                        {proof.lastVerified && (
                          <span className="text-xs text-gray-400 ml-2">Last checked: {new Date(proof.lastVerified).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs mb-1">
                        {proof.proofVideo && (
                          <span rel="noopener noreferrer" className="flex items-center gap-1 text-blue-700 ">
                            <HiVideoCamera className="w-4 h-4" /> Video
                          </span>
                        )}
                        {proof.proofImage && (
                          <span rel="noopener noreferrer" className="flex items-center gap-1 text-blue-700 ">
                            <HiPhotograph className="w-4 h-4" /> Image
                          </span>
                        )}
                        {proof.submissionUrl && (
                          <a href={proof.submissionUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-700 underline">
                            <HiExternalLink className="w-4 h-4" /> Link
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-700 mb-1">Reported Views: <b>{proof.views?.toLocaleString?.() ?? 0}</b></div>
                      {proof.verifiedViews && (
                        <div className="text-xs text-green-700">Verified: <b>{proof.verifiedViews.toLocaleString()}</b></div>
                      )}
                      {proof.rewardAmount && (
                        <div className="text-xs text-green-700">Reward: ₦{proof.rewardAmount.toLocaleString()}</div>
                      )}
                      {proof.adminNote && (
                        <div className={`mt-2 p-2 rounded text-xs ${proof.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                          <b>Admin note:</b> {proof.adminNote}
                        </div>
                      )}
                      {/* Always show Update btn */}
                      <button
                        onClick={() => openProofFormEdit(sub, proof)}
                        className="flex items-center mt-2 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-800 text-xs font-semibold"
                      >
                        <HiPencilAlt className="w-4 h-4 mr-1" />
                        Update
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700"
              >Previous</button>
              <span className="px-2 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700"
              >Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
