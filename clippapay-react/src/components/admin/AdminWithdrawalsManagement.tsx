// components/admin/AdminWithdrawalsManagement.tsx
// Auth: cookie-based (httpOnly) — withCredentials: true on all calls, matching codebase pattern
// Backend statuses: pending | completed | declined  ("completed" shown as "Paid")
import React, { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

type BackendStatus = 'pending' | 'completed' | 'declined';

interface Withdrawal {
  id: string;
  user: { id: string; email: string; name: string; role: string };
  amount: number;
  currency: 'NGN' | 'USDT';
  paymentMethod: 'bank' | 'usdt';
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  usdtAddress?: string;
  usdtNetwork?: string;
  status: BackendStatus;
  declineReason?: string;
  createdAt: string;
  processedAt?: string;
  txHash?: string;
}

const fmtAmount = (n: number, cur: 'NGN' | 'USDT') =>
  cur === 'NGN' ? `₦${n.toLocaleString()}` : `${n.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT`;

const STATUS: Record<BackendStatus, { label: string; cls: string; icon: string }> = {
  pending:   { label: 'Pending',  cls: 'bg-amber-100 text-amber-800',    icon: '⏳' },
  completed: { label: 'Paid',     cls: 'bg-emerald-100 text-emerald-800', icon: '✓'  },
  declined:  { label: 'Declined', cls: 'bg-red-100 text-red-800',        icon: '✗'  },
};

export default function AdminWithdrawalsManagement() {
  const [requests, setRequests]       = useState<Withdrawal[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState('');
  const [page, setPage]               = useState(1);
  const PER_PAGE = 10;

  const [filterStatus,   setFilterStatus]   = useState<'all' | BackendStatus>('all');
  const [filterCurrency, setFilterCurrency] = useState<'all' | 'NGN' | 'USDT'>('all');
  const [search,         setSearch]         = useState('');

  const [processing,    setProcessing]    = useState<Withdrawal | null>(null);
  const [actionType,    setActionType]    = useState<'approve' | 'decline'>('approve');
  const [declineReason, setDeclineReason] = useState('');
  const [txHash,        setTxHash]        = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [modalError,    setModalError]    = useState('');

  const load = async () => {
    setLoading(true); setLoadError('');
    try {
      const { data } = await axios.get<Withdrawal[]>(
        `${API_BASE}/admin/withdrawals`,
        { withCredentials: true }
      );
      setRequests(data);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to load withdrawals.';
      setLoadError(msg);
      console.error('adminWithdrawals load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openApprove = (r: Withdrawal) => {
    setProcessing(r); setActionType('approve'); setDeclineReason(''); setTxHash(''); setModalError('');
  };
  const openDecline = (r: Withdrawal) => {
    setProcessing(r); setActionType('decline'); setDeclineReason(''); setTxHash(''); setModalError('');
  };

  const handleAction = async (e: FormEvent) => {
    e.preventDefault();
    if (!processing) return;
    if (actionType === 'decline' && !declineReason.trim()) {
      setModalError('Decline reason is required.'); return;
    }
    setSubmitting(true); setModalError('');
    try {
      if (actionType === 'approve') {
        await axios.post(
          `${API_BASE}/admin/withdrawals/${processing.id}/approve`,
          txHash ? { txHash } : {},
          { withCredentials: true }
        );
      } else {
        await axios.post(
          `${API_BASE}/admin/withdrawals/${processing.id}/decline`,
          { reason: declineReason.trim() },
          { withCredentials: true }
        );
      }
      setProcessing(null);
      load();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Error processing request.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!window.confirm('Delete this record permanently?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/withdrawals/${id}`, { withCredentials: true });
      setRequests((rs) => rs.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete.');
    }
  };

  const filtered = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterCurrency !== 'all' && r.currency !== filterCurrency) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.user.email.toLowerCase().includes(q) &&
        !r.user.name.toLowerCase().includes(q) &&
        !(r.accountNumber || '').includes(q) &&
        !(r.usdtAddress || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const ngnTotal     = requests.reduce((s, r) => s + (r.currency === 'NGN'  ? r.amount : 0), 0);
  const usdtTotal    = requests.reduce((s, r) => s + (r.currency === 'USDT' ? r.amount : 0), 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400 font-medium">Loading withdrawals…</p>
    </div>
  );

  if (loadError) return (
    <div className="p-6 max-w-md mx-auto mt-10">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
        <p className="text-red-600 font-bold">Could not load withdrawals</p>
        <p className="text-sm text-red-400 font-mono">{loadError}</p>
        <button onClick={load} className="px-5 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Withdrawals Management</h1>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests',  val: String(requests.length),                       color: 'text-gray-900'   },
          { label: 'Pending',         val: String(pendingCount),                           color: 'text-amber-600'  },
          { label: 'Total NGN',       val: `₦${ngnTotal.toLocaleString()}`,               color: 'text-emerald-600'},
          { label: 'Total USDT',      val: `${usdtTotal.toFixed(2)} USDT`,                color: 'text-blue-600'   },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-extrabold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search name, email, account, USDT address…"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl w-full bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as any); setPage(1); }}
          className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Paid</option>
          <option value="declined">Declined</option>
        </select>
        <select value={filterCurrency} onChange={(e) => { setFilterCurrency(e.target.value as any); setPage(1); }}
          className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
          <option value="all">All Currencies</option>
          <option value="NGN">NGN</option>
          <option value="USDT">USDT</option>
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {paginated.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">No withdrawal requests found.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {paginated.map((r) => {
              const cfg = STATUS[r.status] || STATUS.pending;
              const isUsdt = r.paymentMethod === 'usdt' || !!r.usdtAddress;
              return (
                <li key={r.id} className="p-5 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">

                      {/* Top row */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="font-semibold text-gray-900 text-sm">{r.user.name || r.user.email}</span>
                        <span className="text-xs text-gray-400">{r.user.email}</span>
                        {r.user.role && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{r.user.role}</span>
                        )}
                      </div>

                      {/* Detail grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Amount</p>
                          <p className="font-bold text-indigo-600 text-base">{fmtAmount(r.amount, r.currency)}</p>
                          <span className="text-[11px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-medium">{r.currency}</span>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400 mb-1">Payment Details</p>
                          {isUsdt ? (
                            <>
                              <p className="font-medium text-gray-700">USDT — {r.usdtNetwork || '—'}</p>
                              <p className="text-xs text-gray-500 font-mono break-all mt-0.5">{r.usdtAddress || '—'}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-gray-700">{r.bankName || '—'}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{r.accountNumber} · {r.accountName}</p>
                            </>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-gray-400 mb-1">Timeline</p>
                          <p className="text-xs text-gray-600">Requested: {new Date(r.createdAt).toLocaleString()}</p>
                          {r.processedAt && <p className="text-xs text-gray-600 mt-0.5">Processed: {new Date(r.processedAt).toLocaleString()}</p>}
                          {r.txHash && <p className="text-xs font-mono text-gray-400 mt-0.5 truncate" title={r.txHash}>TX: {r.txHash}</p>}
                        </div>
                      </div>

                      {r.declineReason && (
                        <div className="mt-2.5 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          <svg className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-red-600">{r.declineReason}</p>
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {r.status === 'pending' ? (
                        <>
                          <button onClick={() => openApprove(r)}
                            className="px-4 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold transition-colors">
                            Mark Paid
                          </button>
                          <button onClick={() => openDecline(r)}
                            className="px-4 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold transition-colors">
                            Decline
                          </button>
                        </>
                      ) : (
                        <button onClick={() => deleteRecord(r.id)}
                          className="px-4 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">
            ← Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages} ({filtered.length} results)</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">
            Next →
          </button>
        </div>
      )}

      {/* ══ ACTION MODAL ══ */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleAction} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <h3 className="text-lg font-extrabold text-gray-900 text-center">
              {actionType === 'approve' ? '✓ Confirm Payment' : '✗ Decline Withdrawal'}
            </h3>

            {modalError && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">{modalError}</div>
            )}

            {/* Details */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <SRow label="User"     val={processing.user.email} />
              <SRow label="Amount"   val={fmtAmount(processing.amount, processing.currency)} bold />
              <SRow label="Currency" val={processing.currency} />
              {processing.paymentMethod === 'usdt' || processing.usdtAddress ? (
                <>
                  <SRow label="Method"       val="USDT" />
                  <SRow label="USDT Address" val={processing.usdtAddress || '—'} mono />
                  <SRow label="Network"      val={processing.usdtNetwork || '—'} />
                </>
              ) : (
                <>
                  <SRow label="Method"      val="Bank Transfer" />
                  <SRow label="Bank"        val={processing.bankName || '—'} />
                  <SRow label="Account No." val={processing.accountNumber || '—'} />
                  <SRow label="Name"        val={processing.accountName || '—'} />
                </>
              )}
            </div>

            {/* TX hash for USDT approval */}
            {actionType === 'approve' && (processing.paymentMethod === 'usdt' || processing.usdtAddress) && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Transaction Hash <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input type="text" value={txHash} onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste TXID after sending USDT"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
            )}

            {/* Decline reason */}
            {actionType === 'decline' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason for Decline *</label>
                <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
                  required rows={3} placeholder="Explain why this withdrawal is being declined…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200" />
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setProcessing(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors text-sm">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className={`flex-1 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
                  actionType === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
                }`}>
                {submitting
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : actionType === 'approve' ? 'Mark as Paid' : 'Decline'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function SRow({ label, val, bold = false, mono = false }: { label: string; val: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400 shrink-0 text-sm">{label}</span>
      <span className={`text-right break-all text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-700'} ${mono ? 'font-mono text-xs' : ''}`}>
        {val}
      </span>
    </div>
  );
}