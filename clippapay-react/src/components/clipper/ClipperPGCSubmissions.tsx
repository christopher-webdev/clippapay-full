import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    HiCheckCircle,
    HiExclamationCircle,
    HiPhotograph,
    HiVideoCamera,
    HiPencilAlt
} from 'react-icons/hi';

const PAGE_SIZE = 7;
const HIDE_COMPLETED_CARDS = false;
const SHOW_COMPLETED_BADGE = true;

export default function ClipperPGCSubmissions() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const campaignId = params.get('campaign');

    const [page, setPage] = useState(1);
    const [campaign, setCampaign] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [formVisible, setFormVisible] = useState(false);
    const [formMode, setFormMode] = useState<'new' | 'edit'>('new');
    const [formSubmissionId, setFormSubmissionId] = useState<string | null>(null);
    const [formProofId, setFormProofId] = useState<string | null>(null);
    const [platformBlocks, setPlatformBlocks] = useState<any[]>([
        { proofVideo: null, proofImage: null }
    ]);
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    // ——— Helpers: robust campaign completion & stats ———
    const getCampaignObj = (submission: any) =>
        (typeof submission.campaign === 'object' && submission.campaign) ? submission.campaign : null;

    const getCampaignStatus = (submission: any) => {
        const camp = getCampaignObj(submission);
        return camp?.status ?? submission.campaignStatus ?? submission.status;
    };

    const getTotal = (submission: any): number | undefined => {
        const camp = getCampaignObj(submission);
        return camp?.desiredVideos;
    };

    const getApproved = (submission: any): number | undefined => {
        const camp = getCampaignObj(submission);
        return camp?.approvedVideosCount;
    };

    const getLeft = (submission: any): number | undefined => {
        const camp = getCampaignObj(submission);
        return camp?.desiredVideos ? camp.desiredVideos - (camp.approvedVideosCount ?? 0) : undefined;
    };

    const isCampaignCompleted = (submission: any) => {
        const status = getCampaignStatus(submission);
        const left = getLeft(submission);
        if (status === 'completed') return true;
        if (typeof left === 'number' && left <= 0) return true;
        return false;
    };

    const getCompletionRatio = (submission: any): number | undefined => {
        const total = getTotal(submission);
        const approved = getApproved(submission);
        if (typeof total === 'number' && typeof approved === 'number' && total > 0) {
            return approved / total;
        }
        return undefined;
    };

    const fmt = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '—');

    // Fetch campaign info if needed
    useEffect(() => {
        async function fetchCampaign() {
            if (!campaignId) return setCampaign(null);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`/clippers/${campaignId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.kind !== 'pgc') return setCampaign(null); // Only PGC campaigns
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
            const res = await axios.get('/clippers/my-pgc-submissions', {
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
        if (!campaignId || !campaign || campaign.kind !== 'pgc') return;
        const existing = submissions.find(s => s.campaign?._id === campaignId || s.campaign === campaignId);
        if (!existing) {
            setPlatformBlocks([{ proofVideo: null, proofImage: null }]);
            setFormMode('new');
            setFormSubmissionId(null);
            setFormProofId(null);
            setFormVisible(true);
        } else if (existing && existing.proofs?.length > 0) {
            const firstProof = existing.proofs[0];
            setPlatformBlocks([{ proofVideo: null, proofImage: null }]);
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

    // Reset page to 1 when the visible list changes
    useEffect(() => {
        setPage(1);
    }, [submissions.length, HIDE_COMPLETED_CARDS]);

    const addPlatformBlock = () =>
        setPlatformBlocks(blocks => [
            ...blocks,
            { proofVideo: null, proofImage: null }
        ]);

    const removePlatformBlock = (idx: number) =>
        setPlatformBlocks(blocks =>
            blocks.length === 1 ? blocks : blocks.filter((_, i) => i !== idx)
        );

    const handleBlockChange = (idx: number, field: string, value: any) => {
        setPlatformBlocks(blocks =>
            blocks.map((b, i) => (i === idx ? { ...b, [field]: value } : b))
        );
    };

    // Update form
    async function openProofFormEdit(sub: any, proof: any) {
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
        if (camp.kind !== 'pgc') return; // Only PGC campaigns
        setCampaign(camp);
        setPlatformBlocks([{ proofVideo: null, proofImage: null }]);
        setFormMode('edit');
        setFormSubmissionId(sub._id);
        setFormProofId(proof._id);
        setFormVisible(true);
    }

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);
        try {
            const token = localStorage.getItem('token');

            // Validate each block
            for (let i = 0; i < platformBlocks.length; i++) {
                const b = platformBlocks[i];
                if (!b.proofVideo) {
                    setFormError(`Please upload a video in block ${i + 1}.`);
                    setFormLoading(false);
                    return;
                }

                const fd = new FormData();
                fd.append('proofVideo', b.proofVideo);
                if (b.proofImage) fd.append('proofImage', b.proofImage);

                if (formMode === 'edit' && formSubmissionId && formProofId) {
                    await axios.patch(`/clippers/${formSubmissionId}/update-proof-pgc/${formProofId}`, fd, {
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
            setPlatformBlocks([{ proofVideo: null, proofImage: null }]);
            await loadSubmissions();
            if (campaignId) navigate('/dashboard/clipper/pgc-submissions', { replace: true });
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Could not submit.');
        } finally {
            setFormLoading(false);
        }
    };

    const closeForm = () => {
        setFormVisible(false);
        setFormError('');
        setPlatformBlocks([{ proofVideo: null, proofImage: null }]);
        if (campaignId) navigate('/dashboard/clipper/pgc-submissions', { replace: true });
    };

    // —— UI helpers ——
    const ProgressBar = ({ ratio }: { ratio: number }) => (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
                className="h-2 bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, Math.round(ratio * 100)))}%` }}
            />
        </div>
    );

    const StatPill = ({ label, value }: { label: string, value: React.ReactNode }) => (
        <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700">
            <span className="font-semibold">{value}</span> <span className="text-gray-500">· {label}</span>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-2 py-7">
            <h2 className="text-2xl font-bold mb-6">My PGC Submissions</h2>

            {/* Form Modal */}
            {formVisible && (
                <section className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <form onSubmit={handleFormSubmit} className="bg-white p-6 rounded-xl max-w-md w-full mx-4 space-y-4 overflow-y-auto max-h-[80vh]">
                        <h3 className="text-xl font-bold mb-4">Submit Your Video</h3>
                        {platformBlocks.map((block, idx) => (
                            <div key={idx} className="border p-4 rounded mb-4 bg-gray-50">
                                <div className="mb-2">
                                    <label className="text-xs block mb-1">Upload Your Video (required)</label>
                                    <input
                                        type="file"
                                        accept="video/mp4"
                                        required
                                        onChange={e => handleBlockChange(idx, 'proofVideo', e.target.files?.[0] || null)}
                                    />
                                </div>
                                <div className="mb-2">
                                    <label className="text-xs block mb-1">Upload Thumbnail Image (optional)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleBlockChange(idx, 'proofImage', e.target.files?.[0] || null)}
                                    />
                                </div>
                                {platformBlocks.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removePlatformBlock(idx)}
                                        className="text-red-500 text-xs mt-2"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addPlatformBlock}
                            className="bg-blue-100 text-blue-800 rounded px-3 py-1 mb-4 mr-2"
                        >
                            + Add Another Video
                        </button>
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
                        <div className="text-center text-gray-500 py-12">No PGC submissions yet.</div>
                    ) : (
                        pagedSubmissions.map(sub => {
                            const campaignObj = getCampaignObj(sub);
                            const campTitle = campaignObj?.title ?? 'Untitled campaign';
                            const completed = isCampaignCompleted(sub);

                            const total = getTotal(sub);
                            const approved = getApproved(sub);
                            const left = getLeft(sub);
                            const ratio = getCompletionRatio(sub);
                            const pct = typeof ratio === 'number' ? Math.round(ratio * 100) : undefined;

                            return (
                                <div
                                    key={sub._id}
                                    className="bg-white p-5 rounded-2xl shadow border border-gray-200 mb-5 overflow-hidden"
                                >
                                    {/* Card header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="text-base sm:text-lg font-semibold text-gray-900">{campTitle}</div>
                                            {completed && !HIDE_COMPLETED_CARDS && (
                                                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-medium">
                                                    Campaign Completed
                                                </span>
                                            )}
                                        </div>

                                        {/* top-right stats */}
                                        <div className="flex flex-wrap gap-2">
                                            <StatPill label="Desired Videos" value={fmt(total)} />
                                            <StatPill label="Approved Videos" value={fmt(approved)} />
                                            {typeof pct === 'number' && <StatPill label="Done" value={`${pct}%`} />}
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    {typeof ratio === 'number' && (
                                        <div className="mb-4">
                                            <ProgressBar ratio={ratio} />
                                            <div className="mt-1 text-[11px] text-gray-500">
                                                {fmt(approved)} / {fmt(total)} approved
                                            </div>
                                        </div>
                                    )}

                                    {/* Proofs grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(sub.proofs || []).map((proof: any, i: number) => (
                                            <div key={i} className="border rounded-xl p-3 bg-gray-50">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {proof.status === 'approved' ? (
                                                        <HiCheckCircle className="text-green-500 w-5 h-5" />
                                                    ) : proof.status === 'pending' ? (
                                                        <HiExclamationCircle className="text-yellow-400 w-5 h-5" />
                                                    ) : (
                                                        <HiExclamationCircle className="text-red-400 w-5 h-5" />
                                                    )}
                                                    <span className="font-bold text-sm">{proof.status?.toUpperCase?.()}</span>
                                                </div>

                                                <div className="mb-2">
                                                    {proof.proofVideo ? (
                                                        <div className="relative w-full aspect-video">
                                                            <video
                                                                src={`${proof.proofVideo}#t=0.5`}
                                                                className="w-full h-full object-contain bg-black"
                                                                controls
                                                                controlsList="nodownload"
                                                                preload="auto"
                                                                onError={(e) => {
                                                                    console.error('Video load error:', {
                                                                        url: proof.proofVideo,
                                                                        error: (e.target as HTMLVideoElement).error,
                                                                    });
                                                                    (e.target as HTMLVideoElement).poster = '/video-error-placeholder.png';
                                                                }}
                                                                onLoadedMetadata={(e) => {
                                                                    console.log('Video metadata loaded:', {
                                                                        url: proof.proofVideo,
                                                                        duration: (e.target as HTMLVideoElement).duration,
                                                                    });
                                                                }}
                                                            >
                                                                <source src={proof.proofVideo} type="video/mp4" />
                                                                Your browser does not support the video tag.
                                                            </video>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-600">No video available</div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 text-xs mb-1">
                                                    {proof.proofImage && (
                                                        <span className="flex items-center gap-1 text-blue-700">
                                                            <HiPhotograph className="w-4 h-4" /> Image
                                                        </span>
                                                    )}
                                                </div>

                                                {proof.rewardAmount && (
                                                    <div className="text-xs text-green-700">
                                                        Reward: ₦{proof.rewardAmount.toLocaleString()}
                                                    </div>
                                                )}
                                                {proof.adminNote && (
                                                    <div className={`mt-2 p-2 rounded text-xs ${proof.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                                        <b>Admin note:</b> {proof.adminNote}
                                                    </div>
                                                )}

                                                {!completed && proof.status !== 'approved' && (
                                                    <button
                                                        onClick={() => openProofFormEdit(sub, proof)}
                                                        className="flex items-center mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-sm"
                                                    >
                                                        <HiPencilAlt className="w-4 h-4 mr-1" /> Update
                                                    </button>
                                                )}
                                                {completed && !HIDE_COMPLETED_CARDS && SHOW_COMPLETED_BADGE && (
                                                    <div
                                                        className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold select-none cursor-not-allowed"
                                                        title="Campaign Completed"
                                                        aria-disabled="true"
                                                    >
                                                        Campaign Completed
                                                    </div>
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
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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