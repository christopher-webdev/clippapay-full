
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiExternalLink,
  HiPhotograph,
  HiVideoCamera,
  HiPencilAlt,
  HiPlus,
  HiX,
  HiChatAlt2
} from 'react-icons/hi';


const ALL_PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'X', 'WhatsApp'];
const PLATFORM_LABELS: Record<string, string> = {
  TikTok: 'TikTok', Instagram: 'Instagram', YouTube: 'YouTube',
  Facebook: 'Facebook', X: 'X', WhatsApp: 'WhatsApp'
};

const HTTPS_REGEX = /^https:\/\//i;

// Reusable Proof Form Modal
const ProofForm: React.FC<{
  campaign: any;
  submission: any;
  existingProof?: any;
  mode: 'new' | 'add' | 'edit';
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ campaign, submission, existingProof, mode, onSuccess, onCancel }) => {
  const [platform, setPlatform] = useState(existingProof?.platform || '');
  const [submissionUrl, setSubmissionUrl] = useState(existingProof?.submissionUrl || '');
  const [views, setViews] = useState(existingProof?.views?.toString() || '');
  const [proofVideo, setProofVideo] = useState<File | null>(null);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isWhatsApp = platform === 'WhatsApp';
  const campaignPlatforms = campaign?.platforms || ALL_PLATFORMS;
  const alreadyUsed = submission?.proofs?.map((p: any) => p.platform) || [];

  const availablePlatforms = campaignPlatforms.filter((p: string) =>
    p === platform || !alreadyUsed.includes(p)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!platform) return setError('Please select a platform');
    if (!isWhatsApp && !submissionUrl.trim()) return setError('Link is required');
    if (!isWhatsApp && !HTTPS_REGEX.test(submissionUrl.trim())) {
      return setError('Link must start with https://');
    }
    if (isWhatsApp && !proofImage && !proofVideo && mode !== 'edit') {
      return setError('WhatsApp requires at least one screenshot or video');
    }

    const formData = new FormData();
    formData.append('platform', platform);
    if (submissionUrl.trim()) formData.append('submissionUrl', submissionUrl.trim());
    if (views) formData.append('views', views);
    if (proofVideo) formData.append('proofVideo', proofVideo);
    if (proofImage) formData.append('proofImage', proofImage);

    try {
      const token = localStorage.getItem('token');
      if (mode === 'edit' && existingProof) {
        await axios.patch(
          `/clippers/${submission._id}/update-proof/${existingProof._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `/clippers/${campaign._id}/submit-clip`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-2xl font-bold text-gray-800">
            {mode === 'edit' ? 'Update Proof' : 'Submit Proof'}
          </h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <HiX className="w-7 h-7" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={mode === 'edit'}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
              required
            >
              <option value="">Select platform</option>
              {availablePlatforms.map(p => (
                <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
              ))}
            </select>
          </div>

          {platform && !isWhatsApp && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Post Link <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                placeholder="https://tiktok.com/@user/video/123456789"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                required
              />
            </div>
          )}

          {platform && isWhatsApp && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
              <strong>WhatsApp Status:</strong> No link needed. Upload a screenshot or short video of your status showing the post.
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Current Views</label>
            <input
              type="number"
              min="0"
              value={views}
              onChange={(e) => setViews(e.target.value)}
              placeholder="e.g. 1250"
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Video Proof {isWhatsApp ? '(Recommended)' : '(Optional)'}
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setProofVideo(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Image Proof {isWhatsApp ? '(Required if no video)' : '(Optional)'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProofImage(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>

          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-70"
            >
              {loading ? 'Submitting...' : (mode === 'edit' ? 'Update Proof' : 'Submit Proof')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function ClipperSubmissions() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const campaignId = params.get('campaign');

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'new' | 'add' | 'edit'>('new');
  const [currentSubmission, setCurrentSubmission] = useState<any>(null);
  const [currentProof, setCurrentProof] = useState<any>(null);


  // Smooth scroll to top + fresh feel every time
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/clippers/my-ugc-submissions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSubmissions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubmissions(); }, []);

  // Auto-open logic (unchanged)
  // useEffect(() => {
  //   if (!campaignId) return;
  //   axios.get(`/clippers/${campaignId}`, {
  //     headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  //   }).then(res => setCampaign(res.data)).catch(() => {});
  // }, [campaignId]);

  useEffect(() => {
    if (!campaignId || submissions.length === 0) return;

    const hasSubmission = submissions.some(s => 
      String(s.campaign?._id || s.campaign) === campaignId
    );

    if (!hasSubmission) {
      axios.get(`/clippers/${campaignId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(res => {
        setCampaign(res.data);
        setFormMode('new');
        setCurrentSubmission(null);
        setCurrentProof(null);
        setFormOpen(true);
      }).catch(() => setFormOpen(false));
    } else {
      navigate('/dashboard/clipper/submissions', { replace: true });
    }
  }, [campaignId, submissions, navigate]);

  const openAddProof = (sub: any) => {
    setCurrentSubmission(sub);
    setCurrentProof(null);
    setFormMode('add');
    setFormOpen(true);
  };

  const openEditProof = (sub: any, proof: any) => {
    setCurrentSubmission(sub);
    setCurrentProof(proof);
    setFormMode('edit');
    setFormOpen(true);
  };

  const getProofForPlatform = (sub: any, platform: string) =>
    sub.proofs?.find((p: any) => p.platform === platform);

  const fmt = (n?: number) => n?.toLocaleString() || '—';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">My Submissions</h1>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading your submissions...</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-20 text-gray-600 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
          <p className="text-lg">You haven't joined any campaigns yet.</p>
          <p className="text-sm mt-2">Go to campaigns and click "Start Promoting" to begin!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {submissions.map(sub => {
            const camp = sub.campaign || {};
            const whatsappProof = getProofForPlatform(sub, 'WhatsApp');

            return (
              <div key={sub._id} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-7">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{camp.title || 'Untitled Campaign'}</h2>
                    <p className="text-sm text-gray-500 mt-1">Started {new Date(sub.createdAt).toLocaleDateString()}</p>
                  </div>
                  {!whatsappProof && (
                    <span className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold">
                      WhatsApp Required
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                  {ALL_PLATFORMS.map(pl => {
                    const proof = getProofForPlatform(sub, pl);

                    return (
                      <div
                        key={pl}
                        className={`border-2 rounded-xl p-5 text-center transition-all relative ${
                          proof ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'
                        }`}
                      >
                        <div className="font-bold text-lg text-gray-800 mb-2">{pl}</div>

                        {proof ? (
                          <>
                            {proof.status === 'approved' && <HiCheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />}
                            {proof.status === 'pending' && <HiExclamationCircle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />}
                            {proof.status === 'rejected' && <HiExclamationCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />}

                            <div className="text-xs space-y-1">
                              <div>Views: <strong>{fmt(proof.verifiedViews || proof.views)}</strong></div>
                              {proof.rewardAmount > 0 && (
                                <div className="text-green-600 font-bold">₦{proof.rewardAmount}</div>
                              )}
                            </div>

                            {/* ADMIN NOTE — Beautifully Styled */}
                            {proof.adminNote && (
                              <div className={`mt-3 p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${
                                proof.status === 'rejected'
                                  ? 'bg-red-50 text-red-800 border border-red-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}>
                                <HiChatAlt2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                  <strong>Admin:</strong> {proof.adminNote}
                                </div>
                              </div>
                            )}

                            <button
                              onClick={() => openEditProof(sub, proof)}
                              className="mt-4 text-xs bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                            >
                              Update
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openAddProof(sub)}
                            className="mt-3 text-sm bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700"
                          >
                            <HiPlus className="inline mr-1" /> Submit
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {formOpen && (
        <ProofForm
          campaign={campaign || currentSubmission?.campaign}
          submission={currentSubmission}
          existingProof={currentProof}
          mode={formMode}
          onSuccess={() => {
            setFormOpen(false);
            loadSubmissions();
            navigate('/dashboard/clipper/submissions', { replace: true });
          }}
          onCancel={() => {
            setFormOpen(false);
            navigate('/dashboard/clipper/submissions', { replace: true });
          }}
        />
      )}
    </div>
  );
}