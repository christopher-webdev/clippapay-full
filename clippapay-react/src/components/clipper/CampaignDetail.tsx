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

import ugcBanner from "@/assets/ugc-banner.png";

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
  clipperPayoutRate?: number;
  payPerView?: number;
  totalViews: number;
  views_left: number;
  clippersCount: number;
  platforms: string[];
  instructions: string[];
  hashtags: string[];
  status: 'active' | 'paused' | 'completed';
  clips: Clip[];
  kind?: 'normal' | 'ugc' | 'pgc' | null | undefined;
  desiredVideos?: number;
  approvedVideosCount?: number;
  ugc?: {
    assets: string[];
    brief: string;
    directions?: string[] | string;
    deliverables: string[];
    captionTemplate: string;
    usageRights: string;
    approvalCriteria?: string;
    draftRequired?: boolean;
    creativeDeadline?: string;
    postDeadline?: string;
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
  const [showUgcModal, setShowUgcModal] = useState(false);

  // Fetch campaign details
  useEffect(() => {
    if (!id) return;
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
        setError(err.response?.data?.error || 'Could not load campaign');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id]);

  // Show UGC/PGC banner modal
  // useEffect(() => {
  //   if (campaign && (campaign.kind === 'ugc' || campaign.kind === 'pgc')) {
  //     setShowUgcModal(true);
  //   }
  // }, [campaign]);
  useEffect(() => {
    if (!campaign || campaign.kind !== "ugc") return;

    const lastSeen = localStorage.getItem("seen_ugc_modal_date");
    const today = new Date().toDateString(); // e.g., "Sat Nov 30 2025"

    if (lastSeen !== today) {
      setShowUgcModal(true);
      localStorage.setItem("seen_ugc_modal_date", today); // mark as seen today
    }
  }, [campaign]);

  // Check if user already joined
  useEffect(() => {
    if (!id) return;

    const checkJoined = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/clippers/my-submissions', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const joinedIds = res.data.map((sub: any) =>
          String(sub.campaign?._id || sub.campaign)
        );
        setAlreadyJoined(joinedIds.includes(String(id)));
      } catch (err) {
        setAlreadyJoined(false);
      }
    };

    checkJoined();
  }, [id]);

  // Early returns
  if (loading) return <p className="text-center py-20 text-gray-500">Loading campaign…</p>;
  if (error) return <p className="text-center py-20 text-red-500">{error}</p>;
  if (!campaign) return <p className="text-center py-20 text-red-500">Campaign not found.</p>;

  // Determine campaign type
  const isPgc = campaign.kind === 'pgc';
  const isUgc = campaign.kind === 'ugc';
  const isNormal = !campaign.kind || campaign.kind === 'normal' || campaign.kind === null;

  // Payout & stats
  const payoutRate = campaign.clipperPayoutRate ?? campaign.payPerView ?? 0;
  const payoutLabel = isPgc ? 'per video' : 'per 1,000 views';
  const totalLabel = isPgc ? 'videos requested' : 'total views';

  // Button text — now super clear for UGC earners
  const buttonText = alreadyJoined
    ? 'View My Submission'
    : isPgc
    ? 'Submit Video → Earn ₦2,000'
    : isUgc
    ? 'Create Video → Earn ₦2,000'
    : 'Start Promoting';

  // Progress
  const completedRatio = isPgc
    ? (campaign.approvedVideosCount ?? 0) / (campaign.desiredVideos ?? 1)
    : campaign.totalViews > 0
    ? (campaign.totalViews - campaign.views_left) / campaign.totalViews
    : 0;
  const is80Done = completedRatio >= 0.8;

  // Correct submission path
  const submissionsPath = isPgc
    ? '/dashboard/clipper/pgc-submissions'
    : '/dashboard/clipper/submissions';

  // JOIN + REDIRECT
  const handleStart = async (e: FormEvent) => {
    e.preventDefault();
    if (joining || alreadyJoined) return;

    setJoining(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/clippers/${id}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate(`${submissionsPath}?campaign=${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not join campaign. Try again.');
      setJoining(false);
    }
  };

  const handleViewSubmission = () => {
    navigate(`${submissionsPath}?campaign=${id}`);
  };

  return (
    <>
      {/* UGC/PGC Intro Modal - Now with payout upfront */}
      {showUgcModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative">
            <button
              onClick={() => setShowUgcModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl font-light"
            >
              ×
            </button>
            <img src={ugcBanner} alt="UGC/PGC" className="w-full rounded-xl mb-6" />
            <div className="mb-6">
              <div className="text-5xl font-black text-green-600 mb-2">₦2,000</div>
              <h3 className="text-2xl font-bold text-gray-800">
                {isPgc ? 'Per Approved Professional Video' : 'Per Approved UGC Video'}
              </h3>
              <p className="text-gray-600 mt-3">Create high-quality content → Get paid instantly on approval</p>
            </div>
            <button
              onClick={() => setShowUgcModal(false)}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-lg shadow-lg"
            >
              Yes, I Want to Earn ₦2,000
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${showUgcModal ? 'blur-sm pointer-events-none' : ''} max-w-4xl mx-auto px-4 py-8`}>
        <button onClick={() => navigate(-1)} className="text-indigo-600 hover:underline mb-6">
          ← Back to campaigns
        </button>

        {/* Title + Badge */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
          {isUgc && <span className="px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">UGC</span>}
          {isPgc && <span className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">PGC</span>}
          {isNormal && <span className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-bold">NORMAL</span>}
        </div>

        {/* Download Clips */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HiOutlineFilm className="w-6 h-6 text-indigo-600" />
            Download Approved Clips
          </h3>
          {campaign.clips?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaign.clips.map((clip) => (
                <div key={clip.id} className="bg-white rounded-xl shadow border overflow-hidden">
                  <video src={clip.url} controls className="w-full h-48 bg-black object-contain" />
                  <div className="p-3">
                    <a
                      href={clip.url}
                      download
                      className="block text-center bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium"
                    >
                      <HiDownload className="inline mr-2" />
                      Download Clip {clip.index}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No clips available yet.</p>
          )}
        </div>

        {/* Stats - Now shows ₦2,000 clearly for UGC/PGC */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200 text-center">
            <HiOutlineLightningBolt className="w-12 h-12 text-green-600 mx-auto mb-3" />
            {(isUgc || isPgc) ? (
              <>
                <div className="font-black text-4xl text-green-600">₦2,000</div>
                <div className="text-base font-bold text-gray-800 mt-1">Per Approved Video</div>
                <div className="text-xs text-gray-600">Fixed payout • Paid on approval</div>
              </>
            ) : (
              <>
                <div className="font-bold text-2xl">₦{payoutRate.toLocaleString()}</div>
                <div className="text-sm text-gray-600">{payoutLabel}</div>
              </>
            )}
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border text-center">
            <HiOutlineClipboardList className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
            <div className="font-bold text-2xl">
              {(isPgc ? campaign.desiredVideos : campaign.totalViews)?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-600">{totalLabel}</div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border text-center">
            <HiOutlineUserGroup className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
            <div className="font-bold text-2xl">{campaign.clippersCount}</div>
            <div className="text-sm text-gray-600">clippers joined</div>
          </div>
        </div>

        {/* Platforms & Hashtags */}
        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="font-semibold mb-3">Suggested Platforms</h3>
            <div className="flex flex-wrap gap-2">
              {campaign.platforms.map((p) => (
                <span key={p} className="px-4 py-2 bg-gray-100 rounded-full text-sm">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Required Hashtags</h3>
            <div className="flex flex-wrap gap-2">
              {campaign.hashtags.map((tag) => (
                <span key={tag} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-1">
                  <HiHashtag className="w-4 h-4" /> {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* UGC/PGC Creative Pack - With big payout banner */}
        {(isUgc || isPgc) && campaign.ugc && (
          <div className="bg-white rounded-2xl shadow border p-8 mb-10">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <span className="px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                {campaign.kind?.toUpperCase()}
              </span>
              <h2 className="text-2xl font-bold">Creative Pack</h2>
            </div>

            {/* BIG PAYOUT BANNER */}
            <div className="mb-8 p-8 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-4 border-green-300 rounded-2xl text-center">
              <div className="text-6xl font-black text-green-600 mb-3">₦2,000</div>
              <div className="text-2xl font-bold text-gray-800">Fixed Payout Per Approved Video</div>
              <p className="text-gray-700 mt-2">Create → Submit → Get Paid ₦2,000 (No views needed)</p>
            </div>

            <div className="space-y-8">
              {campaign.ugc.brief && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Brief</h4>
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{campaign.ugc.brief}</p>
                </div>
              )}

              <div className="pt-6 border-t">
                <h4 className="font-semibold mb-4">Assets</h4>
                <AssetsGrid assets={campaign.ugc.assets || []} />
              </div>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <div className="text-center">
          {alreadyJoined ? (
            <button
              onClick={handleViewSubmission}
              className="w-full max-w-md px-8 py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl rounded-xl shadow-lg"
            >
              {buttonText}
            </button>
          ) : (
            <form onSubmit={handleStart}>
              <button
                type="submit"
                disabled={joining || campaign.status !== 'active' || is80Done}
                className={`w-full max-w-md px-8 py-5 font-bold text-xl rounded-xl shadow-lg transition ${
                  campaign.status === 'active' && !is80Done
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                {joining ? 'Joining…' : buttonText}
              </button>
            </form>
          )}
          {is80Done && (
            <p className="text-red-600 font-medium mt-4">
              This campaign is nearly full — hurry!
            </p>
          )}
          {error && <p className="text-red-600 font-medium mt-4">{error}</p>}
        </div>
      </div>
    </>
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

        const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {children}
          </div>
        );

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