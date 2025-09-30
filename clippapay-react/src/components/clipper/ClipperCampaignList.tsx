import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineFilm } from 'react-icons/hi';
import { Loader2, Info } from 'lucide-react';
import axios from 'axios';

interface Campaign {
  _id: string;
  title: string;
  thumb_url?: string;
  rate_per_1000?: number;
  clipper_cpm?: number;
  payPerView?: number;
  budget_total: number;
  budget_remaining: number;
  views_purchased?: number;
  views_left?: number;
  desiredVideos?: number;
  approvedVideosCount?: number;
  categories: string[];
  hashtags: string[];
  status: 'active' | 'paused' | 'completed';
  adWorkerStatus: 'pending' | 'processing' | 'ready' | 'rejected';
  kind?: 'normal' | 'ugc' | 'pgc';
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 50;

export default function ClipperCampaignList() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [joinedCampaignIds, setJoinedCampaignIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchAll = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('You are not logged in!');

        const res = await axios.get('/clippers/available', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCampaigns(res.data);

        const mySubsRes = await axios.get('/clippers/my-submissions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const joinedIds = mySubsRes.data
          .map((sub: any) => sub.campaign?._id)
          .filter(Boolean);
        setJoinedCampaignIds(Array.from(new Set(joinedIds)));
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.error || err.message || 'Could not load campaigns');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    const intervalId = setInterval(fetchAll, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const filtered = campaigns.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, campaigns.length]);

  const formatNaira = (n?: number) =>
    typeof n === 'number' ? n.toLocaleString() : '0';

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Browse Jobs</h1>
        <input
          type="text"
          placeholder="Search by campaign name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-4 py-2 border rounded-xl shadow-sm focus:ring-cp-blue focus:border-cp-blue bg-white"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-lg justify-center py-10">
          <Loader2 className="animate-spin" /> Loading jobs…
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">{error}</div>
      ) : (
        <>
          <div className="flex flex-wrap justify-center sm:justify-start gap-4">
            {paged.map((c) => {
              const isPgc = c.kind === 'pgc';
              const progress = isPgc
                ? c.desiredVideos ? Math.round((c.approvedVideosCount || 0) / c.desiredVideos * 100) : 0
                : c.views_purchased && c.views_purchased > 0
                  ? Math.min(Math.round(((c.views_purchased - c.views_left) / c.views_purchased) * 100), 100)
                  : 0;
              const alreadyJoined = joinedCampaignIds.includes(c._id);

              return (
                <div
                  key={c._id}
                  className="relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer"
                  style={{ width: '260px', height: '330px', backgroundColor: '#1a1f2b' }}
                  onClick={() => navigate(`/dashboard/clipper/campaigns/${c._id}`)}
                >
                  <div className="absolute top-2 left-2 bg-cp-blue text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
                    ₦{formatNaira(c.payPerView ?? c.clipper_cpm ?? c.rate_per_1000 ?? 0)} / {isPgc ? 'video' : '1k views'}
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                    <div className="bg-green-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full animate-pulse">
                      LIVE
                    </div>
                    <div className="flex items-center gap-1">
                      {c.kind === 'ugc' || c.kind === 'pgc' ? (
                        <>
                          <div className="bg-red-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-sm">
                            {c.kind === 'ugc' ? 'UGC' : 'PGC'}
                          </div>
                          <div
                            className="relative"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTooltip(showTooltip === c._id ? null : c._id);
                            }}
                          >
                            <Info
                              size={25}
                              className="text-gray-300 cursor-pointer hover:text-white"
                              onMouseEnter={() => setShowTooltip(c._id)}
                              onMouseLeave={() => setShowTooltip(null)}
                            />
                            {showTooltip === c._id && (
                              <div
                                className="absolute top-6 right-0 w-48 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-20"
                                onMouseEnter={() => setShowTooltip(c._id)}
                                onMouseLeave={() => setShowTooltip(null)}
                              >
                                <div className="font-bold mb-1">{c.kind === 'ugc' ? 'UGC Campaign' : 'PGC Campaign'}</div>
                                <p>
                                  {c.kind === 'ugc'
                                    ? 'User-Generated Content: Create and post your own video showcasing this product for higher earnings!'
                                    : 'Professional-Generated Content: Submit high-quality videos for approval to earn a fixed payout per video!'}
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="bg-orange-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-sm">
                          REPOST
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex mt-8 items-center justify-center h-48 px-4 pt-8">
                    {c.thumb_url ? (
                      <img
                        src={c.thumb_url}
                        alt={c.title}
                        className="object-contain h-49 w-49 rounded-md"
                      />
                    ) : (
                      <HiOutlineFilm className="text-gray-500 w-49 h-49" />
                    )}
                  </div>

                  <div className="text-white text-xl font-medium text-center px-3 mt-0 truncate">
                    {c.title}
                  </div>

                  <div className="absolute bottom-12 left-0 right-0 px-4 z-10">
                    <div className="w-full bg-gray-700 h-1 rounded-full mb-1 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          background: progress >= 100
                            ? "#A3A3A3"
                            : progress >= 80
                              ? "#16a34a"
                              : "#4f46e5"
                        }}
                      />
                    </div>
                    <div className="text-gray-300 text-xs text-center">
                      {progress}% completed
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/clipper/campaigns/${c._id}`);
                      }}
                      className={`${alreadyJoined ? 'bg-gray-500 hover:bg-gray-600' : 'bg-cp-blue hover:bg-blue-700'
                        } text-white font-semibold px-4 py-2 rounded-lg text-sm transition`}
                    >
                      {alreadyJoined ? 'Joined' : 'Join'}
                    </button>
                  </div>
                </div>
              );
            })}

            {paged.length === 0 && (
              <div className="text-center w-full text-gray-500 py-10">
                No campaigns match your search.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-3">
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 rounded-lg font-semibold text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-100 rounded-lg font-semibold text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}