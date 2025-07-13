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
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 8;

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
          headers: { Authorization: `Bearer ${token}` }
        });
        const joinedIds = mySubsRes.data.map((sub: any) => sub.campaign?._id).filter(Boolean);
        setJoinedCampaignIds(Array.from(new Set(joinedIds)));
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Could not load campaigns');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchAll();

    // Set up interval for periodic fetching
    const intervalId = setInterval(fetchAll, 15000); // 15 seconds

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const navigate = (url: string) => window.location.href = url;

  // Filter campaigns by search
  const filtered = campaigns.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Handle search or campaign count change: reset to page 1
  useEffect(() => { setPage(1); }, [search, campaigns.length]);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Browse Jobs</h1>
        <input
          type="text"
          placeholder="Search by campaign name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-7">
            {paged.map(c => {
              const percentCompleted = 1 - c.views_left / c.views_purchased;
              const is80Done = percentCompleted >= 0.8;
              const fullyCompleted = c.views_left === 0;
              const alreadyJoined = joinedCampaignIds.includes(c._id);

              return (
                <div
                  key={c._id}
                  className="bg-white rounded-2xl border shadow-sm hover:shadow-xl transition overflow-hidden flex flex-col px-4 py-4 relative"
                  style={{ minWidth: 270 }}
                >
                  {/* Icon + Status Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <HiOutlineFilm className="w-6 h-6 text-gray-300" />
                      </div>
                      <span className="font-semibold text-lg text-gray-900">{c.title}</span>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-medium
                        ${c.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : c.status === 'completed'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                    >
                      {c.status === 'active' ? 'Live' : c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-2 text-[13px] text-gray-700">
                    <div>
                      <span className="block font-medium">Budget:</span>
                      ₦{c.budget_total.toLocaleString()}
                    </div>
                    <div>
                      <span className="block font-medium">Budget Rem.:</span>
                      ₦{c.budget_remaining.toLocaleString()}
                    </div>
                    <div>
                      <span className="block font-medium">Views Purchased:</span>
                      {c.views_purchased.toLocaleString()}
                    </div>
                    <div>
                      <span className="block font-medium">Views Left:</span>
                      {c.views_left.toLocaleString()}
                    </div>
                    <div>
                      <span className="block font-medium">Created:</span>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Progress</span>
                      <span className="text-xs text-gray-700 font-semibold">{Math.round(percentCompleted * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-lg">
                      <div
                        className={`h-2 rounded-lg ${percentCompleted === 1
                          ? 'bg-gray-400'
                          : 'bg-cp-blue'
                          }`}
                        style={{ width: `${Math.round(percentCompleted * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    disabled={is80Done || fullyCompleted}
                    className={`mt-2 w-full text-center px-4 py-2 rounded-lg font-semibold ${!is80Done && !fullyCompleted
                        ? 'bg-cp-blue text-white hover:bg-cp-indigo'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      } transition`}
                    onClick={() => {
                      if (!is80Done && !fullyCompleted) {
                        navigate(`/dashboard/clipper/campaigns/${c._id}`);
                      }
                    }}
                  >
                    View Clips
                  </button>
                  {(is80Done || fullyCompleted) && (
                    <div className="text-xs text-red-500 mt-2 text-center font-medium">
                      {fullyCompleted
                        ? "Campaign fully completed"
                        : "Campaign is now locked for new submissions"}
                    </div>
                  )}
                </div>
              );
            })}
            {paged.length === 0 && (
              <div className="text-center col-span-full text-gray-500 py-10">
                No campaigns match your search.
              </div>
            )}
          </div>

          {/* Pagination Controls & Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-3">
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 rounded-lg font-semibold text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
