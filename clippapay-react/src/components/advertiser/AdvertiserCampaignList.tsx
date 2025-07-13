import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Film, Loader2 } from 'lucide-react';

interface Campaign {
  _id: string;
  title: string;
  thumb_url?: string;
  status: string;
  adWorkerStatus: 'pending' | 'processing' | 'ready' | 'rejected';
  createdAt: string;
  rate_per_view: number;
  budget_total: number;
  budget_remaining: number;
  views_purchased: number;
  views_left: number;
  numClipsSuggested: number;
}

interface CampaignDetails {
  campaign: {
    _id: string;
    title: string;
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
    rate_per_view: number;
    budget_total: number;
    budget_remaining: number;
    views_left: number;
    views_purchased: number;
    adWorkerPercentage: number;
    clippersCount: number;
    lowFundsThreshold: number;
  };
  clips: {
    _id: string;
    url: string;
    createdAt: string;
    index: number;
    adWorker: { contactName: string, email: string };
  }[];
}

const PER_PAGE = 10;

export default function AdvertiserCampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Pagination and section state
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);

  useEffect(() => {
    axios.get<Campaign[]>('/campaigns')
      .then((res) => setCampaigns(res.data))
      .catch(() => setError('Failed to load campaigns.'))
      .finally(() => setLoading(false));
  }, []);

  // Split active and recently completed (last 30 days)
  const now = Date.now();
  const completedCutoff = now - 30 * 24 * 60 * 60 * 1000;
  const activeCampaigns = campaigns.filter(
    c => c.views_left > 0 || c.adWorkerStatus !== 'ready'
  );
  const completedCampaigns = campaigns.filter(
    c =>
      c.views_left <= 0 &&
      c.adWorkerStatus === 'ready' &&
      new Date(c.createdAt).getTime() >= completedCutoff
  );

  // Pagination logic
  const paginated = (list: Campaign[], page: number) =>
    list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalActivePages = Math.ceil(activeCampaigns.length / PER_PAGE) || 1;
  const totalCompletedPages = Math.ceil(completedCampaigns.length / PER_PAGE) || 1;

  // Helper for section titles
  function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
      <h2 className="text-xl font-semibold mb-4 mt-10 first:mt-0">
        {children}
      </h2>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Your Campaigns
        </h1>
        <button
          onClick={() => navigate('/dashboard/advertiser/create-campaign')}
          className="px-5 py-3 bg-cp-blue text-white rounded-lg font-semibold shadow hover:bg-cp-indigo transition"
        >
          + Create Campaign
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-lg"><Loader2 className="animate-spin" />Loading…</div>
      )}
      {error && <p className="text-center text-red-600">{error}</p>}

      {/* Active Section */}
      {/* --- Live/Active Campaigns Section Header --- */}
      <div className="flex items-center gap-3 my-12">
        <div className="flex-1 border-t border-gray-200"></div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 px-4 tracking-wide bg-white z-10 whitespace-nowrap">
          <span className="inline-block px-2 py-1 bg-cp-blue/10 text-cp-blue rounded">Live/Active Campaigns</span>
        </h2>
        <div className="flex-1 border-t border-gray-200"></div>
      </div>
      {activeCampaigns.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          You have no live or active campaigns.
        </div>
      ) : (
        <>
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {paginated(activeCampaigns, activePage).map(c => <CampaignCard key={c._id} c={c} setSelectedId={setSelectedId} />)}
          </div>
          <Pagination
            page={activePage}
            totalPages={totalActivePages}
            onPageChange={setActivePage}
          />
        </>
      )}

      {/* --- Recently Completed Section Header --- */}
      <div className="flex items-center gap-3 my-12">
        <div className="flex-1 border-t border-gray-200"></div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 px-4 tracking-wide bg-white z-10 whitespace-nowrap">
          <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 rounded">Recently Completed (Last 30 Days)</span>
        </h2>
        <div className="flex-1 border-t border-gray-200"></div>
      </div>
      {completedCampaigns.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No completed campaigns in last 30 days.</div>
      ) : (
        <>
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {paginated(completedCampaigns, completedPage).map(c => <CampaignCard key={c._id} c={c} setSelectedId={setSelectedId} />)}
          </div>
          <Pagination
            page={completedPage}
            totalPages={totalCompletedPages}
            onPageChange={setCompletedPage}
          />
        </>
      )}


      {/* Modal */}
      {selectedId && (
        <CampaignDetailsModal campaignId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

// Card info mini-chip
function InfoChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center space-x-1">
      <span className="text-[11px] font-semibold text-gray-500">{label}:</span>
      <span className="font-bold text-gray-800">{value}</span>
    </div>
  );
}

function CampaignCard({ c, setSelectedId }: { c: Campaign; setSelectedId: (id: string) => void }) {
  // Progress bar calculation
  const deliveredViews = Math.max((c.views_purchased ?? 0) - (c.views_left ?? 0), 0);
  const progress =
    c.views_purchased && c.views_purchased > 0
      ? Math.min((deliveredViews / c.views_purchased) * 100, 100)
      : 0;

  // Status handling
  let statusColor = "bg-yellow-50 text-yellow-800 border-yellow-200";
  let statusLabel = "Pending Approval";
  if (c.views_left <= 0) {
    statusColor = "bg-gray-100 text-gray-500 border-gray-200";
    statusLabel = "Completed";
  } else if (c.adWorkerStatus === 'ready') {
    statusColor = "bg-green-50 text-green-800 border-green-200";
    statusLabel = "Live";
  } else if (c.adWorkerStatus === 'processing') {
    statusColor = "bg-blue-50 text-blue-800 border-blue-200";
    statusLabel = "In Progress";
  } else if (c.adWorkerStatus === 'rejected') {
    statusColor = "bg-red-50 text-red-700 border-red-200";
    statusLabel = "Rejected";
  }

  return (
    <div
      className="relative group border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-xl cursor-pointer transition overflow-hidden p-6 flex flex-col min-h-[270px]"
      onClick={() => setSelectedId(c._id)}
    >
      <div className="flex items-center gap-3 mb-4">
        {c.thumb_url ? (
          <img
            src={c.thumb_url}
            alt={c.title}
            className="w-14 h-14 object-cover rounded-lg border"
          />
        ) : (
          <div className="w-14 h-14 bg-gray-100 flex items-center justify-center rounded-lg border">
            <Film className="w-7 h-7 text-gray-300" />
          </div>
        )}
        <div>
          <div className="text-lg font-bold text-gray-900">{c.title}</div>
          <span
            className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700 mb-3">
        <InfoChip label="Budget" value={`₦${c.budget_total?.toLocaleString()}`} />
        <InfoChip label="Budget Rem." value={`₦${c.budget_remaining?.toLocaleString()}`} />
        <InfoChip label="Views Purchased" value={c.views_purchased?.toLocaleString()} />
        <InfoChip label="Views Left" value={c.views_left?.toLocaleString()} />
        <InfoChip label="Created" value={new Date(c.createdAt).toLocaleDateString()} />
        <InfoChip label="Clippers Engaged" value={c.clippersCount?.toLocaleString()} />
      </div>

      <div className="w-full mb-4 mt-2">
        <div className="flex justify-between items-center text-[11px] font-semibold mb-1">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all`}
            style={{
              width: `${progress}%`,
              background: progress >= 100
                ? "#A3A3A3"
                : progress > 80
                  ? "#16a34a"
                  : "#4f46e5"
            }}
          />
        </div>
      </div>

      <div className="flex-1" />
      <div className="flex gap-3 mt-2">
        {c.adWorkerStatus === 'ready' && c.views_left > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setSelectedId(c._id); }}
            className="px-4 py-2 text-green-700 bg-green-100 hover:bg-green-200 rounded font-semibold transition"
          >
            View Clips
          </button>
        )}
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (n: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-50"
      >
        Prev
      </button>
      <span className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

function CampaignDetailsModal({ campaignId, onClose }: {
  campaignId: string;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<CampaignDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`/campaigns/${campaignId}/details`)
      .then(res => setDetails(res.data))
      .catch(() => setError('Failed to fetch details.'))
      .finally(() => setLoading(false));
  }, [campaignId]);

  // Only show clips uploaded within the last 30 days
  const clips = details?.clips?.filter(
    clip => (new Date().getTime() - new Date(clip.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000
  );

  const progress = details?.campaign?.views_purchased
    ? Math.min(
      ((details.campaign.views_purchased - details.campaign.views_left) / details.campaign.views_purchased) * 100,
      100
    )
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto relative animate-fadeIn">
        <button className="absolute top-4 right-4 text-3xl text-gray-400 hover:text-gray-900"
          onClick={onClose} aria-label="Close">&times;</button>
        {loading ? (
          <div className="p-12 text-center flex items-center justify-center">
            <Loader2 className="animate-spin mr-2" />Loading…
          </div>
        ) : !details ? (
          <div className="p-12 text-center text-red-500">{error || 'Failed to load details.'}</div>
        ) : (
          <div className="p-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">{details.campaign.title}</h2>
                <div className="text-gray-500 text-sm">
                  Campaign created: {new Date(details.campaign.createdAt).toLocaleString()}
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
                      : details.campaign.views_left <= 0
                        ? 'bg-gray-100 text-gray-500 border-gray-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                {details.campaign.views_left <= 0
                  ? "COMPLETED"
                  : details.campaign.adWorkerStatus.toUpperCase()}
              </span>
            </div>
            {/* Progress Bar in Modal */}
            <div className="w-full mb-6">
              <div className="flex justify-between items-center text-[11px] font-semibold mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all`}
                  style={{
                    width: `${progress}%`,
                    background: progress >= 100
                      ? "#A3A3A3"
                      : progress > 80
                        ? "#16a34a"
                        : "#4f46e5"
                  }}
                />
              </div>
            </div>
            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-700 mb-6">
              <InfoRow label="Rate Per Thousand View (₦)" value={details.campaign.rate_per_view} />
              <InfoRow label="Total Budget (₦)" value={details.campaign.budget_total.toLocaleString()} />
              <InfoRow label="Budget Remaining (₦)" value={details.campaign.budget_remaining.toLocaleString()} />
              <InfoRow label="Views Purchased" value={details.campaign.views_purchased?.toLocaleString()} />
              <InfoRow label="Views Left" value={details.campaign.views_left?.toLocaleString()} />
              <InfoRow label="Clippers Engaged" value={details.campaign.clippersCount} />
              <InfoRow label="Platforms" value={details.campaign.platforms.join(', ')} />
              <InfoRow label="Countries" value={details.campaign.countries.length ? details.campaign.countries.join(', ') : "Worldwide"} />
              <InfoRow label="Hashtags" value={details.campaign.hashtags.join(', ')} />
              <InfoRow label="Categories" value={details.campaign.categories.join(', ')} />
              <InfoRow label="Directions" value={details.campaign.directions.join(' | ')} />
              <InfoRow label="Suggested Clips" value={details.campaign.numClipsSuggested} />
              {details.campaign.cta_url && (
                <InfoRow label="CTA URL" value={
                  <a href={details.campaign.cta_url} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                    {details.campaign.cta_url}
                  </a>
                } />
              )}
              <InfoRow label="Status" value={details.campaign.status} />
            </div>
            {/* Clips section */}
            <div className="mt-7">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Film className="w-5 h-5" />
                Processed Clips (last 30 days)
              </h3>
              {clips && clips.length > 0 ? (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {clips.map(clip => (
                    <div key={clip._id} className="p-3 rounded-lg border bg-gray-50">
                      <video src={clip.url} controls className="w-full h-36 rounded mb-2" />
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
                <div className="text-gray-500 text-sm">No clips uploaded yet (last 30 days).</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Info grid row for modal
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs text-gray-400 uppercase mb-1">{label}</span>
      <span className="block font-medium">{value}</span>
    </div>
  );
}
