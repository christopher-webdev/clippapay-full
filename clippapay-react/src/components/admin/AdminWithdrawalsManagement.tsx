
import React, { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';

interface Withdrawal {
  id: string;
  userEmail: string;
  userName: string;
  role: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  usdtAddress?: string;
  usdtNetwork?: string;
  createdAt: string;
  processedAt?: string;
  status: 'pending' | 'paid' | 'declined';
  declineReason?: string;
}

const statusColors: Record<Withdrawal['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800'
};

const statusIcons: Record<Withdrawal['status'], string> = {
  pending: '⏳',
  paid: '✓',
  declined: '✗'
};

export default function AdminWithdrawalsManagement() {
  const [requests, setRequests] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | Withdrawal['status']>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal state
  const [processing, setProcessing] = useState<Withdrawal | null>(null);
  const [actionType, setActionType] = useState<'paid' | 'declined'>('paid');
  const [declineReason, setDeclineReason] = useState<string>('');

  // Load and refresh
  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<Withdrawal[]>('/admin/withdrawals');
      setRequests(data);
    } catch (err) {
      console.error(err);
      alert('Failed to load withdrawals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const openModal = (req: Withdrawal, type: 'paid' | 'declined') => {
    setProcessing(req);
    setActionType(type);
    setDeclineReason('');
  };

  const handleAction = async (e: FormEvent) => {
    e.preventDefault();
    if (!processing) return;
    const base = '/admin/withdrawals';
    const url = actionType === 'paid'
      ? `${base}/${processing.id}/approve`
      : `${base}/${processing.id}/decline`;

    try {
      await axios.post(url, actionType === 'declined' ? { reason: declineReason } : {});
      setProcessing(null);
      loadRequests();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Error processing request.');
    }
  };

  const deleteWithdrawal = async (id: string) => {
    if (!window.confirm('Delete this record permanently?')) return;
    try {
      await axios.delete(`/admin/withdrawals/${id}`);
      setRequests(rs => rs.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete record.');
    }
  };

  // Filter and paginate data
  const filtered = requests.filter(r =>
    (filterStatus === 'all' || r.status === filterStatus) &&
    (!searchTerm ||
      r.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.accountNumber.includes(searchTerm))
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-lg text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Withdrawals Management</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or account"
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 pr-4 py-2 border rounded-lg w-full bg-white shadow-sm"
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => {
            setFilterStatus(e.target.value as any);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border rounded-lg bg-white shadow-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-gray-500 text-sm">Total Requests</div>
          <div className="text-2xl font-bold">{requests.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-gray-500 text-sm">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {requests.filter(r => r.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-gray-500 text-sm">Total Amount</div>
          <div className="text-2xl font-bold text-green-600">
            ₦{requests.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Withdrawals List */}
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        {paginatedData.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-lg">
            No withdrawal requests found.
          </div>
        ) : (
          <ul className="divide-y">
            {paginatedData.map((r) => (
              <li key={r.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status]}`}>
                        {statusIcons[r.status]} {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                      <span className="font-medium text-gray-900">{r.userName || r.userEmail}</span>
                      <span className="text-xs text-gray-500">{r.role}</span>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Amount</div>
                        <div className="font-bold text-blue-600">₦{r.amount.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Bank Details</div>
                        <div>
                          {r.bankName && (
                            <div>
                              {r.bankName} • {r.accountNumber}
                              <div className="text-sm">{r.accountName}</div>
                            </div>
                          )}
                          {r.usdtAddress && (
                            <div className="text-sm">
                              USDT ({r.usdtNetwork}): {r.usdtAddress}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Dates</div>
                        <div className="text-sm">
                          <div>Requested: {new Date(r.createdAt).toLocaleString()}</div>
                          {r.processedAt && (
                            <div>Processed: {new Date(r.processedAt).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {r.declineReason && (
                      <div className="mt-2">
                        <div className="text-sm text-gray-500">Decline Reason</div>
                        <div className="text-sm text-red-500">{r.declineReason}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {r.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => openModal(r, 'paid')}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openModal(r, 'declined')}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => deleteWithdrawal(r.id)}
                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>

          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <form
            onSubmit={handleAction}
            className="bg-white p-7 rounded-xl shadow-xl w-full max-w-md space-y-6"
          >
            <h3 className="text-xl font-bold text-center mb-2">
              {actionType === 'paid' ? 'Confirm Payment' : 'Decline Withdrawal'}
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-base">
              <div>
                <span className="font-semibold">User:</span> {processing.userEmail}
              </div>
              <div>
                <span className="font-semibold">Amount:</span> ₦{processing.amount.toLocaleString()}
              </div>

              {processing.usdtAddress ? (
                <>
                  <div>
                    <span className="font-semibold">Payment Method:</span> USDT
                  </div>
                  <div>
                    <span className="font-semibold">USDT Address:</span> {processing.usdtAddress}
                  </div>
                  <div>
                    <span className="font-semibold">Network:</span> {processing.usdtNetwork}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="font-semibold">Payment Method:</span> Bank Transfer
                  </div>
                  <div>
                    <span className="font-semibold">Bank:</span> {processing.bankName}
                  </div>
                  <div>
                    <span className="font-semibold">Account No:</span> {processing.accountNumber}
                  </div>
                  <div>
                    <span className="font-semibold">Account Name:</span> {processing.accountName}
                  </div>
                </>
              )}
            </div>


            {actionType === 'declined' && (
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                required
                rows={3}
                placeholder="Reason for decline"
                className="w-full border rounded p-2"
              />
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProcessing(null)}
                className="px-5 py-2 rounded bg-gray-200 hover:bg-gray-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded font-semibold text-white ${actionType === 'paid' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                {actionType === 'paid' ? 'Mark as Paid' : 'Decline'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}