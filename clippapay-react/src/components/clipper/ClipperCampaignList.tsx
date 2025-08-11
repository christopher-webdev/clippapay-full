import React, { useEffect, useState } from 'react';
import { HiOutlineFilm } from 'react-icons/hi';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

interface Campaign {
  _id: string;
  title: string;
  thumb_url?: string;
  rate_per_1000: number;
  clipper_cpm: number;
  budget_total: number;
  budget_remaining: number;
  views_purchased: number;
  views_left: number;
  categories: string[];
  hashtags: string[];
  status: 'active' | 'paused' | 'completed';
  adWorkerStatus: 'pending' | 'processing' | 'ready' | 'rejected';
  kind?: 'normal' | 'ugc'; // ← added
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 50;

export default function ClipperCampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [joinedCampaignIds, setJoinedCampaignIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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
        setError(err.response?.data?.error || err.message || 'Could not load campaigns');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    const intervalId = setInterval(fetchAll, 15000); // 15 seconds
    return () => clearInterval(intervalId);
  }, []);

  const navigate = (url: string) => (window.location.href = url);

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
              const percentCompleted = 1 - c.views_left / c.views_purchased;
              const is80Done = percentCompleted >= 0.8;
              const fullyCompleted = c.views_left === 0;
              const alreadyJoined = joinedCampaignIds.includes(c._id);

              return (
                <div
                  key={c._id}
                  className="relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer"
                  style={{ width: '260px', height: '330px', backgroundColor: '#1a1f2b' }}
                  onClick={() => {
                    if (!is80Done && !fullyCompleted) {
                      navigate(`/dashboard/clipper/campaigns/${c._id}`);
                    }
                  }}
                >
                  {/* CPM Badge (formatted like ₦2,000 / 1k) */}
                  <div className="absolute top-2 left-2 bg-cp-blue text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
                    ₦{formatNaira(c.clipper_cpm || c.rate_per_1000)} / 1k
                  </div>

                  {/* LIVE + HOT (UGC) Badges */}
                  <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                    <div className="bg-green-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full animate-pulse">
                      LIVE
                    </div>
                    {c.kind === 'ugc' && (
                      <div className="bg-red-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-sm">
                        HOT
                      </div>
                    )}
                  </div>

                  {/* Thumbnail */}
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

                  {/* Title */}
                  <div className="text-white text-xl font-medium text-center px-3 mt-0 truncate">
                    {c.title}
                  </div>

                  {/* Progress */}
                  <div className="absolute bottom-12 left-0 right-0 px-4 z-10">
                    <div className="w-full bg-gray-700 h-1 rounded-full mb-1">
                      <div
                        className="h-1 bg-cp-blue rounded-full"
                        style={{ width: `${Math.round(percentCompleted * 100)}%` }}
                      />
                    </div>
                    <div className="text-gray-300 text-xs text-center">
                      {Math.round(percentCompleted * 100)}% completed
                    </div>
                  </div>

                  {/* View / Join Button */}
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-10">
                    <button
                      className={`${
                        alreadyJoined ? 'bg-gray-500 hover:bg-gray-600' : 'bg-cp-blue hover:bg-blue-700'
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

          {/* Pagination Controls */}
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
