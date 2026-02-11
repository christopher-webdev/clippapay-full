import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Briefcase, Film, User, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const normalizeUrl = (url?: string) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
};

function CampaignKindBadge({ kind }: { kind?: 'normal' | 'ugc' | 'pgc' | 'premium' }) {
  if (kind === 'ugc') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">UGC</span>;
  }
  if (kind === 'pgc') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-200 text-purple-700 border border-purple-200">PGC</span>;
  }
  if (kind === 'premium') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">PREMIUM</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">Normal</span>;
}

function AssetsGrid({ assets }: { assets?: string[] }) {
  if (!assets || assets.length === 0) {
    return <div className="text-sm text-gray-500">No assets uploaded.</div>;
  }

  const kindOf = (u: string) => {
    const x = u.toLowerCase();
    if (/\.(png|jpe?g|webp|gif|svg)$/.test(x)) return 'image';
    if (/\.(mp4|mov|webm|avi|mkv)$/.test(x)) return 'video';
    if (/\.(mp3|wav|m4a|aac|ogg)$/.test(x)) return 'audio';
    if (x.endsWith('.pdf')) return 'pdf';
    return 'file';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {assets.map((raw, i) => {
        const url = normalizeUrl(raw)!;
        const k = kindOf(url);

        if (k === 'image') {
          return (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="block border rounded overflow-hidden bg-gray-50">
              <img src={url} alt={`asset-${i}`} className="w-full h-40 object-cover" />
              <div className="px-3 py-2 text-xs text-gray-600 truncate">{raw}</div>
            </a>
          );
        }
        if (k === 'video') {
          return (
            <div key={i} className="border rounded overflow-hidden bg-gray-50">
              <video controls src={url} className="w-full h-40 object-cover" />
              <div className="px-3 py-2 text-xs text-gray-600 truncate">{raw}</div>
            </div>
          );
        }
        if (k === 'audio') {
          return (
            <div key={i} className="border rounded p-3 bg-gray-50">
              <audio controls src={url} className="w-full" />
              <div className="mt-2 text-xs text-gray-600 truncate">{raw}</div>
            </div>
          );
        }
        if (k === 'pdf') {
          return (
            <a key={i} href={url} target="_blank" rel="noreferrer"
              className="border rounded p-3 bg-gray-50 hover:bg-gray-100 transition text-sm text-blue-700 underline">
              Open PDF: {raw.split('/').pop()}
            </a>
          );
        }
        return (
          <a key={i} href={url} target="_blank" rel="noreferrer"
            className="border rounded p-3 bg-gray-50 hover:bg-gray-100 transition text-sm text-blue-700 underline truncate">
            Open file: {raw}
          </a>
        );
      })}
    </div>
  );
}

interface CampaignSummary {
  _id: string;
  title: string;
  advertiser: { 
    contactName?: string; 
    firstName?: string; 
    lastName?: string; 
    company?: string; 
    email?: string;
    creatorTypes?: string[];
    otherCreatorType?: string;
  };
  adWorkerStatus: 'pending' | 'processing' | 'ready' | 'rejected';
  kind?: 'normal' | 'ugc' | 'pgc' | 'premium';
}

interface CampaignDetails {
  campaign: {
    _id: string;
    kind?: 'normal' | 'ugc' | 'pgc' | 'premium';
    advertiser: {
      contactName?: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      email?: string;
      creatorTypes?: string[];
      otherCreatorType?: string;
    };
    creator?: {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    title: string;
    video_url?: string;
    thumb_url?: string;
    platforms: string[];
    countries: string[];
    hashtags: string[];
    directions: string[];
    cta_url?: string;
    categories: string[];
    numClipsSuggested: number;
    createdAt: string;
    adWorkerStatus: 'pending' | 'processing' | 'ready' | 'rejected';
    status: string;
    ugc?: {
      assets?: string[];
      brief?: string;
      deliverables?: string[];
      captionTemplate?: string;
      usageRights?: string;
      draftRequired?: boolean;
      creativeDeadline?: string;
      postDeadline?: string;
      approvalCriteria?: string;
    };
    generatedContent?: {
      brief?: string;
      deliverables?: string[];
      assets?: string[];
      approvalCriteria?: string;
    };
  };
  clips: {
    _id: string;
    url: string;
    createdAt: string;
    index: number;
    adWorker: { contactName: string, email: string };
  }[];
  stats: {
    clipsCount: number;
    budgetUsed: number;
  };
}

export default function AdWorkerDashboard() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await axios.get<CampaignSummary[]>('/campaigns/assigned');
      // Sort: pending first, then processing, ready, rejected
      const sorted = res.data.sort((a, b) => {
        const order = ['pending', 'processing', 'ready', 'rejected'];
        return order.indexOf(a.adWorkerStatus) - order.indexOf(b.adWorkerStatus);
      });
      setCampaigns(sorted);
      setError(null);
    } catch (err) {
      setError('Failed to load assigned campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 tracking-tight">Ad-Worker Dashboard</h1>

      {loading && <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" />Loading…</div>}
      {error && <p className="text-center text-red-600">{error}</p>}

      {/* Grid of assigned campaigns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
        {campaigns.map(c => (
          <div
            key={c._id}
            className="relative group border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-xl cursor-pointer transition overflow-hidden p-6 flex flex-col"
            onClick={() => setSelectedId(c._id)}
          >
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="w-7 h-7 text-cp-blue/70" />
              <div>
                <div className="font-semibold text-lg text-gray-900">
                  {c.title} <CampaignKindBadge kind={c.kind} />
                </div>
                <div className="text-gray-500 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 inline" />
                  {c.advertiser?.contactName ||
                   c.advertiser?.company ||
                   `${c.advertiser?.firstName || ''} ${c.advertiser?.lastName || ''}`.trim() ||
                   "Unknown Advertiser"}
                </div>
                <div className="text-gray-500 text-sm flex items-center gap-2">
                  <div className="w-4 h-4 inline" />
                  {c.advertiser?.creatorTypes?.join(', ') || ''}
                  {c.advertiser?.otherCreatorType ? `, ${c.advertiser.otherCreatorType}` : ''}
                </div>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 mt-4">
              <span className={`
                text-xs font-bold rounded-full px-3 py-1
                ${c.adWorkerStatus === 'pending'
                  ? 'bg-yellow-50 text-yellow-700'
                  : c.adWorkerStatus === 'processing'
                    ? 'bg-blue-50 text-blue-700'
                    : c.adWorkerStatus === 'ready'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                }`}>
                {c.adWorkerStatus.toUpperCase()}
              </span>
              <span className="ml-auto text-cp-blue group-hover:underline font-medium text-xs">View Details</span>
            </div>
          </div>
        ))}
      </div>

      {selectedId && (
        <CampaignDetailsModal
          campaignId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChange={fetchCampaigns}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
//              Campaign Details Modal
// ────────────────────────────────────────────────
function CampaignDetailsModal({ campaignId, onClose, onStatusChange }: {
  campaignId: string;
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const [details, setDetails] = useState<CampaignDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`/campaigns/${campaignId}/details`)
      .then(res => setDetails(res.data))
      .catch(() => setError('Failed to fetch details.'))
      .finally(() => setLoading(false));
  }, [campaignId]);

  // ─── Status Toggle ───────────────────────────────────────
  const toggleStatus = async () => {
    if (!details) return;
    let nextStatus: CampaignDetails['campaign']['adWorkerStatus'] | undefined;
    switch (details.campaign.adWorkerStatus) {
      case 'pending': nextStatus = 'processing'; break;
      case 'processing': nextStatus = 'ready'; break;
      default: return;
    }

    const kindLabel = details.campaign.kind === 'premium' 
      ? 'Premium' 
      : details.campaign.kind?.toUpperCase() || 'Campaign';

    try {
      await axios.put(`/campaigns/${details.campaign._id}`, { adWorkerStatus: nextStatus });
      setSuccess(`${kindLabel} status updated!`);
      setTimeout(() => {
        setSuccess(null);
        onStatusChange();
      }, 1200);
    } catch {
      setError('Could not update status.');
    }
  };

  // ─── Thumbnail Upload ────────────────────────────────────
  const uploadThumbnail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setError(null);
    setSuccess(null);

    const input = (e.currentTarget.elements.namedItem('thumbnail') as HTMLInputElement);
    if (!input.files || input.files.length === 0) {
      setError('Please select a thumbnail image');
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('thumbnail', input.files[0]);

    try {
      const res = await axios.post(`/campaigns/${campaignId}/thumbnail`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Thumbnail uploaded successfully!');
      const detailsRes = await axios.get(`/campaigns/${campaignId}/details`);
      setDetails(detailsRes.data);
    } catch (err) {
      setError('Failed to upload thumbnail');
    } finally {
      setUploading(false);
    }
  };

  // ─── Clip Upload ─────────────────────────────────────────
  const uploadClip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setError(null);
    setSuccess(null);

    const input = (e.currentTarget.elements.namedItem('clips') as HTMLInputElement);
    if (!input.files || input.files.length === 0) {
      setError('Select one or more video files.');
      setUploading(false);
      return;
    }
    if (details && details.clips && (details.clips.length + input.files.length > 6)) {
      setError('You can only have up to 6 clips per campaign.');
      setUploading(false);
      return;
    }

    const formData = new FormData();
    Array.from(input.files).forEach(file => formData.append('clips', file));

    try {
      await axios.post(`/clip/${campaignId}/clips`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Clip(s) uploaded!');
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setError('Failed to upload clip(s).');
    } finally {
      setUploading(false);
    }
  };

  // ─── Delete Original Video ───────────────────────────────
  const deleteOriginalVideo = async () => {
    if (!details) return;
    try {
      await axios.put(`/uploads/videos/${details.campaign._id}`, { video_url: '' });
      setSuccess('Original video deleted.');
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setError('Could not delete video.');
    }
  };

  const clips = details?.clips.filter(
    clip => (new Date().getTime() - new Date(clip.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000
  ) || [];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg max-h-[90vh] w-full max-w-4xl overflow-y-auto p-4 relative">
        <button
          className="absolute top-4 right-4 text-3xl text-gray-400 hover:text-gray-900"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {loading ? (
          <div className="p-12 text-center flex items-center justify-center">
            <Loader2 className="animate-spin mr-2" />
            Loading…
          </div>
        ) : !details ? (
          <div className="p-12 text-center text-red-500">
            {error || 'Failed to load details.'}
          </div>
        ) : (
          <div className="p-7">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {details.campaign.title} <CampaignKindBadge kind={details.campaign.kind} />
                </h2>
                <div className="text-gray-500 text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {details.campaign.advertiser.contactName} · {details.campaign.advertiser.email}
                </div>
              </div>
              <span className={`
                px-4 py-2 rounded-full text-sm font-semibold tracking-wide border
                ${details.campaign.adWorkerStatus === 'pending'
                  ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                  : details.campaign.adWorkerStatus === 'processing'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : details.campaign.adWorkerStatus === 'ready'
                      ? 'bg-green-50 text-green-800 border-green-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                {details.campaign.adWorkerStatus.toUpperCase()}
              </span>
            </div>

            {/* Original Video Actions */}
            {details.campaign.video_url && (
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <a
                  href={details.campaign.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-cp-blue text-white rounded-md shadow hover:bg-cp-indigo transition"
                >
                  <Film className="mr-2 w-4 h-4" />
                  Download Original Video
                </a>
                <button
                  onClick={deleteOriginalVideo}
                  className="px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 transition"
                >
                  Delete Original Video
                </button>
              </div>
            )}

            {/* Thumbnail */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Campaign Thumbnail</h3>
              {details.campaign.thumb_url ? (
                <div className="flex items-center gap-4 mb-3">
                  <img
                    src={details.campaign.thumb_url}
                    alt="Campaign thumbnail"
                    className="w-20 h-20 object-cover rounded"
                  />
                  <button
                    onClick={async () => {
                      try {
                        await axios.delete(`/campaigns/${campaignId}/thumbnail`);
                        setSuccess('Thumbnail removed!');
                        const detailsRes = await axios.get(`/campaigns/${campaignId}/details`);
                        setDetails(detailsRes.data);
                      } catch {
                        setError('Failed to remove thumbnail');
                      }
                    }}
                    className="text-red-600 text-sm hover:underline"
                    disabled={uploading}
                  >
                    Remove Thumbnail
                  </button>
                </div>
              ) : (
                <form onSubmit={uploadThumbnail} className="flex items-center gap-3">
                  <input
                    type="file"
                    name="thumbnail"
                    accept="image/*"
                    required
                    disabled={uploading}
                    className="block border px-2 py-1 rounded text-sm"
                  />
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-3 py-1 bg-cp-blue text-white rounded shadow hover:bg-cp-indigo text-sm"
                  >
                    {uploading ? 'Uploading...' : 'Upload Thumbnail'}
                  </button>
                </form>
              )}
            </div>

            {/* Campaign Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700 mb-8">
              <Info label="Platforms" value={details.campaign.platforms.join(', ')} />
              <Info label="Countries" value={details.campaign.countries.join(', ')} />
              <Info label="Hashtags" value={details.campaign.hashtags.join(', ')} />
              <Info label="Categories" value={details.campaign.categories.join(', ')} />
              <Info label="Directions" value={details.campaign.directions.join(' | ')} />
              <Info label="Suggested Clips" value={details.campaign.numClipsSuggested} />
              {details.campaign.cta_url && (
                <Info
                  label="CTA URL"
                  value={
                    <a
                      href={details.campaign.cta_url}
                      className="text-blue-600 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {details.campaign.cta_url}
                    </a>
                  }
                />
              )}
              <Info
                label="Created"
                value={new Date(details.campaign.createdAt).toLocaleString()}
              />
            </div>

            {/* Premium Creator Info */}
            {details.campaign.kind === 'premium' && details.campaign.creator && (
              <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h3 className="font-semibold text-amber-800 mb-2">Assigned Premium Creator</h3>
                <div className="text-sm">
                  <strong>{details.campaign.creator.firstName} {details.campaign.creator.lastName}</strong>
                  <span className="text-gray-600 ml-2">({details.campaign.creator.email})</span>
                </div>
              </div>
            )}

            {/* UGC / PGC / Premium Brief & Assets */}
            {['ugc', 'pgc', 'premium'].includes(details.campaign.kind ?? '') && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {details.campaign.kind?.toUpperCase() || 'Campaign'} Details & Assets
                </h3>

                {/* Premium specific */}
                {details.campaign.kind === 'premium' && details.campaign.generatedContent?.brief && (
                  <div className="mb-4">
                    <div className="text-gray-500 text-sm">Brief / Instructions</div>
                    <div className="text-sm whitespace-pre-wrap">{details.campaign.generatedContent.brief}</div>
                  </div>
                )}

                {/* UGC / PGC shared fields */}
                {(details.campaign.kind === 'ugc' || details.campaign.kind === 'pgc') && details.campaign.ugc && (
                  <>
                    {details.campaign.ugc.brief && (
                      <div className="mb-4">
                        <div className="text-gray-500 text-sm">Brief</div>
                        <div className="text-sm whitespace-pre-wrap">{details.campaign.ugc.brief}</div>
                      </div>
                    )}

                    {details.campaign.ugc.deliverables?.length ? (
                      <div className="mb-4">
                        <div className="text-gray-500 text-sm">Deliverables</div>
                        <div className="text-sm">{details.campaign.ugc.deliverables.join(', ')}</div>
                      </div>
                    ) : null}

                    {details.campaign.ugc.captionTemplate && (
                      <div className="mb-4">
                        <div className="text-gray-500 text-sm">Caption Template</div>
                        <div className="text-sm whitespace-pre-wrap">{details.campaign.ugc.captionTemplate}</div>
                      </div>
                    )}

                    {details.campaign.ugc.usageRights && (
                      <div className="mb-4">
                        <div className="text-gray-500 text-sm">Usage Rights</div>
                        <div className="text-sm">{details.campaign.ugc.usageRights}</div>
                      </div>
                    )}

                    {details.campaign.kind === 'pgc' && details.campaign.ugc.approvalCriteria && (
                      <div className="mb-4">
                        <div className="text-gray-500 text-sm">Approval Criteria</div>
                        <div className="text-sm whitespace-pre-wrap">{details.campaign.ugc.approvalCriteria}</div>
                      </div>
                    )}

                    {details.campaign.kind === 'pgc' && details.campaign.ugc.draftRequired !== undefined && (
                      <div className="mb-4">
                        <div className="text-gray-500 text-sm">Draft Required</div>
                        <div className="text-sm">{details.campaign.ugc.draftRequired ? 'Yes' : 'No'}</div>
                      </div>
                    )}

                    {details.campaign.kind === 'pgc' && details.campaign.ugc.creativeDeadline && (
                      <div className="mb-4">
                        <div className="text-gray-500 text-sm">Creative Deadline</div>
                        <div className="text-sm">{new Date(details.campaign.ugc.creativeDeadline).toLocaleString()}</div>
                      </div>
                    )}

                    {details.campaign.kind === 'pgc' && details.campaign.ugc.postDeadline && (
                      <div className="mb-4">
                        <div className="text-gray-500 text-sm">Post Deadline</div>
                        <div className="text-sm">{new Date(details.campaign.ugc.postDeadline).toLocaleString()}</div>
                      </div>
                    )}
                  </>
                )}

                {/* Assets */}
                <AssetsGrid assets={details.campaign.ugc?.assets} />
              </div>
            )}

            {/* Status Actions */}
            {['pending', 'processing'].includes(details.campaign.adWorkerStatus) && (
              <button
                onClick={toggleStatus}
                className="mb-6 px-6 py-2.5 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition font-medium"
              >
                {details.campaign.adWorkerStatus === 'pending'
                  ? 'Start Processing'
                  : 'Mark as Ready'}
              </button>
            )}

            {/* Upload Clip Form */}
            {(details.campaign.adWorkerStatus === 'processing' || details.campaign.adWorkerStatus === 'ready') && (
              <form
                onSubmit={uploadClip}
                className="mt-6 flex flex-col sm:flex-row items-center gap-4 mb-8"
              >
                <input
                  type="file"
                  name="clips"
                  accept="video/*"
                  required
                  multiple
                  disabled={uploading}
                  className="block border px-3 py-2 rounded text-sm w-full sm:w-auto"
                />
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2.5 bg-cp-blue text-white rounded-lg shadow hover:bg-cp-indigo whitespace-nowrap"
                >
                  {uploading ? 'Uploading…' : 'Upload Clip(s)'}
                </button>
                {clips.length >= 6 && (
                  <div className="text-xs text-gray-500">
                    Maximum 6 clips allowed.
                  </div>
                )}
              </form>
            )}

            {/* Uploaded Clips */}
            <div className="mt-8">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Film className="w-5 h-5" />
                Uploaded Clips (last 30 days)
              </h3>
              {clips.length > 0 ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {clips.map((clip) => (
                    <div
                      key={clip._id}
                      className="p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <video
                        src={clip.url}
                        controls
                        className="w-full h-40 rounded mb-3 object-cover"
                      />
                      <div className="text-xs text-gray-500">
                        Uploaded: {new Date(clip.createdAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">
                        Clip {clip.index}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm py-4">
                  No clips uploaded yet (last 30 days).
                </div>
              )}
            </div>

            {(success || error) && (
              <div className="mt-6 text-center p-4 rounded-lg bg-gray-50">
                {success && <p className="text-green-600 font-medium">{success}</p>}
                {error && <p className="text-red-600 font-medium">{error}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs text-gray-400 uppercase mb-1 tracking-wide">{label}</span>
      <span className="block font-medium text-gray-800">{value}</span>
    </div>
  );
}