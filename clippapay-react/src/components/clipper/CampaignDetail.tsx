import React, { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiDownload,
  HiOutlineClipboardList,
  HiOutlineLightningBolt,
  HiHashtag,
  HiOutlineUserGroup,
  HiOutlineFilm,
} from 'react-icons/hi';
import axios from 'axios';

interface Clip {
  id: string;
  url: string;
  index: number;
}

interface CampaignDetail {
  id: string;
  title: string;
  advertiser: string;
  directions: string;
  thumbUrl: string;
  payPerView: number; // label displays per 1,000 views
  totalViews: number;
  views_left: number;
  clippersCount: number;
  platforms: string[];
  instructions: string[];
  hashtags: string[];
  status: 'active' | 'paused' | 'completed';
  clips: Clip[];

  // NEW for UGC
  kind?: 'normal' | 'ugc';
  ugc?: {
    assets: string[];
    brief: string;
    deliverables: string[];
    captionTemplate: string;
    usageRights: string;
  };
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  // Fetch campaign details
  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchCampaign = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/clippers/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setCampaign(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Could not load campaign');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCampaign();
  }, [id]);

  // Fetch joined state (safe, does not break hooks order)
  useEffect(() => {
    const checkJoined = async () => {
      try {
        const token = localStorage.getItem('token');
        const mySubsRes = await axios.get('/clippers/my-submissions', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const joinedIds = mySubsRes.data.map((sub: any) => sub.campaign?._id || sub.campaign);
        setAlreadyJoined(joinedIds.includes(id));
      } catch {
        setAlreadyJoined(false);
      }
    };
    if (id) checkJoined();
  }, [id]);

  // Early return
  if (loading) {
    return <p className="text-center py-10 text-gray-500">Loading campaign…</p>;
  }
  if (error) {
    return <p className="text-center py-10 text-red-500">{error}</p>;
  }
  if (!campaign) {
    return <p className="text-center py-10 text-red-500">Campaign not found.</p>;
  }

  // ---- DISABLE BUTTON LOGIC (fixed) ----
  const completedRatio = campaign.totalViews > 0
    ? (campaign.totalViews - campaign.views_left) / campaign.totalViews
    : 0;
  const is80Done = completedRatio >= 0.8;

  const handleStart = async (e: FormEvent) => {
    e.preventDefault();
    setJoining(true);
    navigate(`/dashboard/clipper/submissions?campaign=${campaign.id}`);
  };

  const handleSubmitProof = () => {
    navigate(`/dashboard/clipper/submissions?campaign=${campaign.id}`);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to campaigns
      </button>

      {/* Title & Tag */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{campaign.title}</h2>
        {campaign.kind === 'ugc' && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
            UGC
          </span>
        )}
      </div>

      {/* Download Approved Clips */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <HiOutlineFilm className="w-5 h-5 text-indigo-500" />
          Download Approved Clips
        </h3>
        {campaign.clips && campaign.clips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {campaign.clips.map((clip) => (
              <div
                key={clip.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                <video
                  src={clip.url}
                  controls
                  className="w-full h-48 object-contain bg-black"
                />
                <div className="p-3">
                  <a
                    href={clip.url}
                    download
                    className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                  >
                    <HiDownload className="mr-2 w-4 h-4" />
                    Download Clip {clip.index}
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 italic">No clips available for download yet.</div>
        )}
      </div>

      {/* Top Stats */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <HiOutlineLightningBolt className="w-6 h-6 text-indigo-500" />
          <div>
            <div className="font-medium text-gray-800">
              ₦{campaign.payPerView.toLocaleString()} per 1,000 views
            </div>
            <div className="text-xs text-gray-500">
              (₦{(campaign.payPerView / 1000).toFixed(2)} per view)
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <HiOutlineClipboardList className="w-6 h-6 text-indigo-500" />
          <div className="font-medium text-gray-800">
            {campaign.totalViews.toLocaleString()} total views
          </div>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <HiOutlineUserGroup className="w-6 h-6 text-indigo-500" />
          <div className="font-medium text-gray-800">
            {campaign.clippersCount} clippers joined
          </div>
        </div>
      </div>

      {/* Suggested Platforms */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900">Suggested Platforms</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {campaign.platforms.map(p => (
            <li
              key={p}
              className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-700"
            >
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Required Hashtags */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900">Required Hashtags</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {campaign.hashtags.map(tag => (
            <li
              key={tag}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-700"
            >
              <HiHashtag className="w-4 h-4 text-gray-500" />
              <span>{tag}</span>
            </li>
          ))}
        </ul>
      </div>


      {/* UGC Creative Pack */}
      {campaign.kind === 'ugc' && (
        <section className="mt-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            {/* header */}
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                UGC
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">UGC Creative Pack</h3>
            </div>

            {/* body */}
            <div className="px-5 sm:px-6 py-5 space-y-5">
              {campaign.ugc?.brief && (
                <div>
                  <div className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-1.5">
                    Brief
                  </div>
                  <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {campaign.ugc.brief}
                  </p>
                </div>
              )}

              {!!campaign.ugc?.deliverables?.length && (
                <div className="pt-5 border-t border-dashed border-gray-200">
                  <div className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-1.5">
                    Deliverables
                  </div>
                  <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                    {campaign.ugc.deliverables.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}

              {campaign.ugc?.captionTemplate && (
                <div className="pt-5 border-t border-dashed border-gray-200">
                  <div className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-1.5">
                    Caption Template
                  </div>
                  <pre className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-mono text-[13px] leading-6 text-gray-800 whitespace-pre-wrap">
                    {campaign.ugc.captionTemplate}
                  </pre>
                </div>
              )}

              {campaign.ugc?.usageRights && (
                <div className="pt-5 border-t border-dashed border-gray-200">
                  <div className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-1.5">
                    Usage Rights
                  </div>
                  <p className="text-sm text-gray-800">
                    {campaign.ugc.usageRights}
                  </p>
                </div>
              )}

              <div className="pt-5 border-t border-dashed border-gray-200">
                <div className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-2">
                  Assets
                </div>
                <AssetsGrid assets={campaign.ugc?.assets || []} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="mt-6">
        {alreadyJoined ? (
          <button
            type="button"
            className="w-full px-6 py-3 text-white rounded-md text-lg font-medium bg-blue-600 hover:bg-blue-700"
            onClick={handleSubmitProof}
          >
            Submit Proof / View Submission
          </button>
        ) : (
          <form onSubmit={handleStart}>
            <button
              type="submit"
              disabled={campaign.status !== 'active' || is80Done}
              className={`w-full px-6 py-3 text-white rounded-md text-lg font-medium ${campaign.status === 'active' && !is80Done
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-300 cursor-not-allowed'
                }`}
            >
              {joining ? 'Starting…' : 'Start Promoting'}
            </button>
            {is80Done && (
              <div className="text-xs text-red-500 mt-2 text-center font-medium">
                This campaign is now locked for new submissions
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

/** =======================
 *  Helpers
 *  =======================
 */
function AssetsGrid({ assets }: { assets: string[] }) {
  if (!assets || assets.length === 0) {
    return <div className="text-sm text-gray-500">No assets uploaded.</div>;
  }

  const kind = (url: string) => {
    const u = url.toLowerCase();
    if (/\.(png|jpe?g|webp|gif|svg)$/.test(u)) return 'image';
    if (/\.(mp4|mov|webm|avi|mkv)$/.test(u)) return 'video';
    if (/\.(mp3|wav|m4a|aac|ogg)$/.test(u)) return 'audio';
    if (u.endsWith('.pdf')) return 'pdf';
    return 'file';
  };

  const FileChip = ({ url }: { url: string }) => (
    <div className="px-2.5 py-1 text-[11px] rounded-md bg-gray-100 text-gray-600 truncate">
      {url.split('/').pop()}
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {assets.map((url, i) => {
        const k = kind(url);

        // common card wrapper
        const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {children}
          </div>
        );

        // 16:9 box with object-contain so media never looks zoomed
        const MediaBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
          <div className="relative w-full bg-gray-50">
            <div className="relative w-full pb-[56.25%]">
              <div className="absolute inset-0 flex items-center justify-center">
                {children}
              </div>
            </div>
          </div>
        );

        if (k === 'image') {
          return (
            <Card key={i}>
              <MediaBox>
                <img src={url} alt={`asset-${i}`} className="max-w-full max-h-full object-contain" />
              </MediaBox>
              <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <FileChip url={url} />
                <a href={url} target="_blank" rel="noreferrer"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Open
                </a>
              </div>
            </Card>
          );
        }

        if (k === 'video') {
          return (
            <Card key={i}>
              <MediaBox>
                <video controls src={url} className="w-full h-full object-contain" />
              </MediaBox>
              <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <FileChip url={url} />
                <a href={url} download
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Download
                </a>
              </div>
            </Card>
          );
        }

        if (k === 'audio') {
          return (
            <Card key={i}>
              <div className="p-3">
                <audio controls src={url} className="w-full" />
              </div>
              <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <FileChip url={url} />
                <a href={url} download
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Download
                </a>
              </div>
            </Card>
          );
        }

        if (k === 'pdf') {
          return (
            <Card key={i}>
              <div className="p-4 flex items-center justify-between gap-3">
                <FileChip url={url} />
                <a href={url} target="_blank" rel="noreferrer"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Open PDF
                </a>
              </div>
            </Card>
          );
        }

        return (
          <Card key={i}>
            <div className="p-4 flex items-center justify-between gap-3">
              <FileChip url={url} />
              <a href={url} target="_blank" rel="noreferrer"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                Open
              </a>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
