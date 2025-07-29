import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

interface Campaign {
  _id: string;
  title: string;
}
interface HistoryPoint {
  date: string;
  views: number;
}
interface ClipperPerformance {
  id: string;
  name: string;
  platform: string;
  views: number;
  status: 'approved' | 'pending';
  link: string;
}

export default function CampaignAnalytics() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [clippers, setClippers] = useState<ClipperPerformance[]>([]);
  const [totalVerified, setTotalVerified] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get('/campaigns/full?fields=title')
      .then((res) => {
        const data = res.data;
        setCampaigns(data);
        if (data.length > 0) setSelectedId(data[0]._id);
      })
      .catch(() => setCampaigns([]));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setErr(null);

    axios
      .get(`/campaigns/${selectedId}/analytics`)
      .then((res) => {
        const data = res.data;
        const filteredClippers = (data.clippers || [])
          .filter((c: any) => c.status === 'approved' || c.status === 'pending')
          .map((c: any) => ({
            ...c,
            name: c.name?.split(' ')[0] || c.name,
            status: c.status === 'approved' ? 'approved' : 'pending',
          }));

        setHistory(data.history || []);
        setClippers(filteredClippers);
        setTotalVerified(data.totalVerifiedViews || 0);
      })
      .catch(() => {
        setHistory([]);
        setClippers([]);
        setTotalVerified(0);
        setErr('Failed to load analytics for this campaign.');
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <div className="space-y-10 p-6 sm:p-8 bg-gray-50 min-h-screen">
      {/* Campaign Selector */}
      <div className="max-w-md">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Select Campaign
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition"
        >
          {campaigns.map((c) => (
            <option key={c._id} value={c._id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {err && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm animate-pulse">
          {err}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="text-xl font-medium text-gray-400 animate-pulse">
            Loading campaign analytics...
          </span>
        </div>
      ) : (
        <>
          {/* Total Verified Views */}
          <div className="bg-white shadow-lg rounded-2xl p-8 flex items-center justify-between hover:shadow-xl transition">
            <p className="text-lg font-semibold text-gray-700">
              Total Verified Views
            </p>
            <p className="text-4xl font-extrabold text-indigo-600">
              {totalVerified.toLocaleString()}
            </p>
          </div>

          {/* Views History Graph */}
          <div className="bg-white shadow-lg rounded-2xl p-8 hover:shadow-xl transition">
            <p className="text-lg font-semibold text-gray-700 mb-6">
              Views Over Time
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid stroke="#f0f0f0" strokeDasharray="5 5" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Clipper Performance Table */}
          <div className="bg-white shadow-lg rounded-2xl p-8 overflow-x-auto hover:shadow-xl transition">
            <p className="text-lg font-semibold text-gray-700 mb-6">
              Clipper Performance
            </p>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase">
                    Clipper
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-600 uppercase">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clippers.map((c, index) => (
                  <tr
                    key={`${c.id}-${index}`}
                    className="hover:bg-indigo-50 transition"
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {c.name}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{c.platform}</td>
                    <td className="px-6 py-3 text-gray-900 text-right font-semibold">
                      {c.views.toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                          c.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Repost Link Table */}
          <div className="bg-white shadow-lg rounded-2xl p-8 overflow-x-auto hover:shadow-xl transition">
            <p className="text-lg font-semibold text-gray-700 mb-6">
              Repost Links
            </p>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase">
                    Clipper
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600 uppercase">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clippers.map((c, index) => (
                  <tr
                    key={`${c.id}-link-${index}`}
                    className="hover:bg-indigo-50 transition"
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {c.name}
                    </td>
                    <td className="px-6 py-3">
                      <a
                        href={c.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline break-all"
                      >
                        {c.link}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
