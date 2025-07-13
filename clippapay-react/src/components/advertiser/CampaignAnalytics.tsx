import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
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
  status: 'approved' | 'pending'; // only approved or pending
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

  // Fetch campaign list on mount
  useEffect(() => {
    fetch('/api/campaigns/full?fields=title')
      .then(res => res.json())
      .then(data => {
        setCampaigns(data);
        if (data.length > 0) setSelectedId(data[0]._id);
      })
      .catch(() => setCampaigns([]));
  }, []);

  // Fetch campaign analytics when selectedId changes
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setErr(null);
    fetch(`/api/campaigns/${selectedId}/analytics`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        // Only allow status "approved" or "pending" in UI
        const filteredClippers = (data.clippers || [])
          .filter((c: any) => c.status === 'approved' || c.status === 'pending')
          .map((c: any) => ({
            ...c,
            // Only show first name (if space, use only first part)
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
    <div className="space-y-8">
      {/* Campaign selector */}
      <div className="max-w-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Campaign
        </label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-cp-blue focus:border-cp-blue"
        >
          {campaigns.map(c => (
            <option key={c._id} value={c._id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {err && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{err}</div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="text-xl text-gray-400">Loading campaign analytics...</span>
        </div>
      ) : (
        <>
          {/* Total Verified Views */}
          <div className="bg-white shadow rounded-lg p-6 flex items-center justify-between">
            <p className="text-lg font-medium text-gray-700">
              Total Verified Views
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {totalVerified.toLocaleString()}
            </p>
          </div>

          {/* Views History Graph */}
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-lg font-medium text-gray-700 mb-4">
              Views Over Time
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={history}>
                <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Clipper Performance Breakdown */}
          <div className="bg-white shadow rounded-lg p-6 overflow-x-auto">
            <p className="text-lg font-medium text-gray-700 mb-4">
              Clipper Performance
            </p>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Clipper
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Platform
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Views
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clippers.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{c.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{c.platform}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{c.views.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 inline-flex text-xs font-semibold rounded-full ${c.status === 'approved'
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
          <div className="bg-white shadow rounded-lg p-6 overflow-x-auto">
            <p className="text-lg font-medium text-gray-700 mb-4">
              Repost Links
            </p>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Clipper
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clippers.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{c.name}</td>
                    <td className="px-4 py-2 text-sm">
                      <a
                        href={c.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
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
