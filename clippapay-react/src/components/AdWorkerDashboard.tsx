//component adworker
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Briefcase, Film, User, Loader2 } from 'lucide-react'; // Example icons

interface CampaignSummary {
  _id: string;
  title: string;
  advertiser: { contactName: string };
  adWorkerStatus: 'pending' | 'processing' | 'ready' | 'rejected';
}

interface CampaignDetails {
  campaign: {
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
    video_url: string;
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
      setCampaigns(res.data);
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

      {/* --- Grid of assigned campaigns --- */}
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
                <div className="font-semibold text-lg text-gray-900">{c.title}</div>
                <div className="text-gray-500 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 inline" />
                  {
                    c.advertiser?.contactName ||
                    c.advertiser?.company ||
                    `${c.advertiser?.firstName || ''} ${c.advertiser?.lastName || ''}`.trim() ||
                    "Unknown Advertiser"
                  }
                </div>
                <div className="text-gray-500 text-sm flex items-center gap-2">
                  <div className="w-4 h-4 inline" />
                  {
                    c.advertiser?.creatorTypes.join(', ')
                  },
                  {
                    c.advertiser?.otherCreatorType
                  }
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

// -------------- Modal/Details component ---------------
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

  // --- Handlers ---
  const toggleStatus = async () => {
    if (!details) return;
    let nextStatus: CampaignDetails['campaign']['adWorkerStatus'] | undefined;
    switch (details.campaign.adWorkerStatus) {
      case 'pending': nextStatus = 'processing'; break;
      case 'processing': nextStatus = 'ready'; break;
      default: return;
    }
    try {
      await axios.put(`/campaigns/${details.campaign._id}`, { adWorkerStatus: nextStatus });
      setSuccess('Status updated!');
      setTimeout(() => {
        setSuccess(null);
        onStatusChange();
      }, 1200);
    } catch {
      setError('Could not update status.');
    }
  };
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
      // Refresh the details to show the new thumbnail
      const detailsRes = await axios.get(`/campaigns/${campaignId}/details`);
      setDetails(detailsRes.data);
    } catch (err) {
      setError('Failed to upload thumbnail');
    } finally {
      setUploading(false);
    }
  };

  // Allow uploading up to 6 at once, or as many as needed to reach 6 total
  const uploadClip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true); setError(null); setSuccess(null);
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
      setTimeout(() => window.location.reload(), 1200); // Or refetch details
    } catch {
      setError('Failed to upload clip(s).');
    } finally {
      setUploading(false);
    }
  };

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

  // Show only clips uploaded within last 30 days
  const clips = details?.clips.filter(
    clip => (new Date().getTime() - new Date(clip.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000
  );

  // Modal UI
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto relative animate-fadeIn">
        <button
          className="absolute top-4 right-4 text-3xl text-gray-400 hover:text-gray-900"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
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
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">{details.campaign.title}</h2>
                <div className="text-gray-500 text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {details.campaign.advertiser.contactName} &middot; {details.campaign.advertiser.email}
                </div>


              </div>

              <span
                className={`
                px-4 py-2 rounded-full text-sm font-semibold tracking-wide border
                ${details.campaign.adWorkerStatus === 'pending'
                    ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                    : details.campaign.adWorkerStatus === 'processing'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : details.campaign.adWorkerStatus === 'ready'
                        ? 'bg-green-50 text-green-800 border-green-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                  }`}
              >
                {details.campaign.adWorkerStatus.toUpperCase()}
              </span>
            </div>

            {/* Download and Delete Buttons */}
            {details.campaign.video_url && (
              <div className="mb-4 flex flex-wrap items-center gap-4">
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
            {/* Thumbnail Upload Section */}
            <div className="mb-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-700 mb-6">
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

            {/* Status Actions */}
            {['pending', 'processing'].includes(details.campaign.adWorkerStatus) && (
              <button
                onClick={toggleStatus}
                className="mb-4 px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition"
              >
                {details.campaign.adWorkerStatus === 'pending'
                  ? 'Start Processing'
                  : 'Mark as Ready'}
              </button>
            )}

            {/* Upload Clip Form */}
            {(details.campaign.adWorkerStatus === 'processing' || details.campaign.adWorkerStatus === 'ready') &&
              (!clips || clips.length < 6) && (
                <form
                  onSubmit={uploadClip}
                  className="mt-6 flex flex-col sm:flex-row items-center gap-3"
                >
                  <input
                    type="file"
                    name="clips"
                    accept="video/*"
                    required
                    multiple
                    disabled={uploading}
                    className="block border px-2 py-1 rounded"
                  />
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2 bg-cp-blue text-white rounded shadow hover:bg-cp-indigo"
                  >
                    {uploading ? 'Uploading…' : 'Upload Clip(s)'}
                  </button>
                  {clips && clips.length >= 6 && (
                    <div className="text-xs text-gray-500 ml-3">
                      Maximum 6 clips uploaded.
                    </div>
                  )}
                </form>
              )}


            {/* Uploaded Clips */}
            <div className="mt-7">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Film className="w-5 h-5" />
                Uploaded Clips (last 30 days)
              </h3>
              {clips && clips.length > 0 ? (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {clips.map((clip) => (
                    <div
                      key={clip._id}
                      className="p-3 rounded-lg border bg-gray-50"
                    >
                      <video
                        src={clip.url}
                        controls
                        className="w-full h-36 rounded mb-2"
                      />
                      <div className="text-xs text-gray-500">
                        Uploaded: {new Date(clip.createdAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">
                        Clip {clip.index}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">
                  No clips uploaded yet (last 30 days).
                </div>
              )}
            </div>

            {(success || error) && (
              <div className="mt-4 text-center">
                {success && (
                  <p className="text-green-600 font-medium">{success}</p>
                )}
                {error && <p className="text-red-600 font-medium">{error}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// Reusable info row
function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs text-gray-400 uppercase mb-1">{label}</span>
      <span className="block font-medium">{value}</span>
    </div>
  );
}
