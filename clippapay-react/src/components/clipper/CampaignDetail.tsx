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
  description: string;
  thumbUrl: string;
  payPerView: number;
  totalViews: number;
  views_left: number;           // <--- ADD THIS LINE to interface if using views_left
  clippersCount: number;
  platforms: string[];
  instructions: string[];
  hashtags: string[];
  status: 'active' | 'paused' | 'completed';
  clips: Clip[];
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
          headers: { Authorization: `Bearer ${token}` }
        });
        setCampaign(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Could not load campaign');
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [id]);

  // Fetch joined state (safe, does not break hooks order)
  useEffect(() => {
    const checkJoined = async () => {
      try {
        const token = localStorage.getItem('token');
        const mySubsRes = await axios.get('/clippers/my-submissions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const joinedIds = mySubsRes.data.map((sub: any) => sub.campaign?._id || sub.campaign);
        setAlreadyJoined(joinedIds.includes(id));
      } catch (err) {
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

  // ---- DISABLE BUTTON LOGIC ----
  const percentLeft = campaign.totalViews > 0 && campaign.views_left !== undefined
    ? (campaign.views_left / campaign.totalViews)
    : 0;
  const is80Done = percentLeft >= 0.8;

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

      <h2 className="text-3xl font-semibold text-gray-800">{campaign.title}</h2>

      {/* <div className="mt-4">
        <img
          src={campaign.thumbUrl}
          alt={campaign.title}
          className="w-full rounded-lg shadow"
        />
      </div> */}

      {/* <div className="mt-6 space-y-4">
        <p className="text-gray-700">{campaign.description}</p>
      </div> */}

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center gap-2">
          <HiOutlineFilm className="w-5 h-5" />
          Download Approved Clips
        </h3>
        {campaign.clips && campaign.clips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campaign.clips.map((clip) => (
              <div key={clip.id} className="bg-gray-50 rounded-lg p-4 shadow flex flex-col items-center">
                <video
                  src={clip.url}
                  controls
                  className="w-full h-40 object-cover mb-2 rounded"
                />
                <a
                  href={clip.url}
                  download
                  className="inline-block w-full px-4 py-2 text-center bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                >
                  <HiDownload className="inline mr-1" />
                  Download Clip {clip.index}
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">No clips available for download yet.</div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <HiOutlineLightningBolt className="w-6 h-6 text-indigo-500" />
          <span>₦{campaign.payPerView.toLocaleString()} per 1,000 views</span>
          <span className="ml-2 text-gray-500 text-xs">
            (₦{(campaign.payPerView / 1000).toFixed(2)} per view)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <HiOutlineClipboardList className="w-6 h-6 text-indigo-500" />
          <span>{campaign.totalViews.toLocaleString()} total views</span>
        </div>
        <div className="flex items-center space-x-2">
          <HiOutlineUserGroup className="w-6 h-6 text-indigo-500" />
          <span>{campaign.clippersCount} clippers joined</span>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-800">Suggested Platforms</h3>
        <ul className="mt-2 flex flex-wrap gap-4">
          {campaign.platforms.map(p => (
            <li
              key={p}
              className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
            >
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-800">Required Hashtags</h3>
        <ul className="mt-2 flex flex-wrap gap-3">
          {campaign.hashtags.map(tag => (
            <li
              key={tag}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
            >
              <HiHashtag className="w-5 h-5" />
              <span>{tag}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
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
