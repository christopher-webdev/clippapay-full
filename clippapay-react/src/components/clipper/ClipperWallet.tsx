// components/clipper/ClipperWallet.tsx
// Web conversion of app/(dashboard)/wallet.tsx (mobile)
// Clipper wallet: earn from clipping → withdraw to bank or USDT
// Deposit is NOT available for clippers (earnings come from campaigns)
// Flow: clipper requests withdrawal → funds locked in escrow → admin pays externally
//       → admin clicks "Mark Paid" → escrow debited → withdrawal complete
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://clippapay.com/api';
const getToken = () => localStorage.getItem('token');

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlatformDetails {
  bank:   { name: string; accountNumber: string; accountName: string };
  usdt:   { address: string; network: string; minDeposit: number; minWithdrawal: number };
  limits: { ngnMinDeposit: number; ngnMinWithdrawal: number; usdtRate: number };
}
interface Withdrawal {
  _id: string;
  amount: number;
  currency: 'NGN' | 'USDT';
  paymentMethod: 'bank' | 'usdt';
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  usdt_address?: string;
  usdt_network?: string;
  status: 'pending' | 'completed' | 'declined';
  declineReason?: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtNGN  = (n: number) => `₦${n.toLocaleString('en-NG')}`;
const fmtUSDT = (n: number) => `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
const fmt     = (n: number, cur: 'NGN' | 'USDT') => cur === 'NGN' ? fmtNGN(n) : fmtUSDT(n);

const statusCfg = (s: string) => {
  if (['approved', 'completed'].includes(s)) return { textCls: 'text-emerald-600', bgCls: 'bg-emerald-50', dot: 'bg-emerald-400', label: 'Completed' };
  if (['rejected', 'declined'].includes(s))  return { textCls: 'text-red-600',     bgCls: 'bg-red-50',     dot: 'bg-red-400',     label: 'Declined'  };
  return                                            { textCls: 'text-amber-600',   bgCls: 'bg-amber-50',   dot: 'bg-amber-400',   label: 'Pending'   };
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClipperWallet() {
  const [balance,      setBalance]      = useState(0);
  const [usdtBalance,  setUsdtBalance]  = useState(0);
  const [withdrawals,  setWithdrawals]  = useState<Withdrawal[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [platform,     setPlatform]     = useState<PlatformDetails | null>(null);
  const [currency,     setCurrency]     = useState<'NGN' | 'USDT'>('NGN');

  // Limits from platform (with defaults)
  const minNgnWithdraw  = platform?.limits.ngnMinWithdrawal ?? 1000;
  const minUsdtWithdraw = platform?.usdt.minWithdrawal      ?? 5;

  // Withdrawal modal
  const [wdrOpen,   setWdrOpen]   = useState(false);
  const [wdrAmt,    setWdrAmt]    = useState('');
  const [wdrMethod, setWdrMethod] = useState<'bank' | 'usdt'>('bank');
  const [bankName,  setBankName]  = useState('');
  const [accNum,    setAccNum]    = useState('');
  const [accName,   setAccName]   = useState('');
  const [wdrAddr,   setWdrAddr]   = useState('');
  const [wdrNet,    setWdrNet]    = useState('');
  const [wdrErr,    setWdrErr]    = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const h = { Authorization: `Bearer ${token}` };

      const [walletRes, wdrRes, platformRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/wallet`,                   { headers: h }),
        axios.get(`${API_BASE}/wallet/withdrawals`,       { headers: h }),
        axios.get(`${API_BASE}/wallet/platform-details`,  { headers: h }),
      ]);

      if (walletRes.status   === 'fulfilled') {
        setBalance(walletRes.value.data.balance     || 0);
        setUsdtBalance(walletRes.value.data.usdtBalance || 0);
      }
      if (wdrRes.status      === 'fulfilled') setWithdrawals(wdrRes.value.data     || []);
      if (platformRes.status === 'fulfilled') setPlatform(platformRes.value.data);
    } catch (e) {
      console.error('wallet load:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Open withdraw ────────────────────────────────────────────────────────
  const openWithdraw = () => {
    const bal = currency === 'NGN' ? balance : usdtBalance;
    const min = currency === 'NGN' ? minNgnWithdraw : minUsdtWithdraw;

    if (bal < min) {
      alert(
        `Can't Withdraw Yet\n\nYour ${currency} balance (${fmt(bal, currency)}) is below the minimum withdrawal of ${
          currency === 'NGN' ? fmtNGN(min) : `${min} USDT`
        }.`
      );
      return;
    }

    setWdrAmt(''); setWdrErr('');
    setBankName(''); setAccNum(''); setAccName('');
    setWdrAddr(''); setWdrNet('');
    setWdrMethod(currency === 'NGN' ? 'bank' : 'usdt');
    setWdrOpen(true);
  };

  // ── Submit withdrawal ────────────────────────────────────────────────────
  const submitWithdrawal = async () => {
    setWdrErr('');
    const amt   = currency === 'NGN' ? parseInt(wdrAmt, 10) : parseFloat(wdrAmt);
    const avail = currency === 'NGN' ? balance : usdtBalance;
    const min   = currency === 'NGN' ? minNgnWithdraw : minUsdtWithdraw;

    if (!wdrAmt || isNaN(amt) || amt <= 0) { setWdrErr('Please enter a valid amount.'); return; }
    if (amt > avail) { setWdrErr(`Amount exceeds your ${currency} balance.`); return; }
    if (amt < min)   { setWdrErr(`Minimum ${currency} withdrawal is ${currency === 'NGN' ? fmtNGN(min) : `${min} USDT`}.`); return; }

    if (currency === 'NGN') {
      if (!bankName || !accNum || !accName) { setWdrErr('Please fill in all bank details.'); return; }
    } else {
      if (!wdrAddr || !wdrNet) { setWdrErr('Please provide your USDT address and network.'); return; }
    }

    setSubmitting(true);
    try {
      const token = getToken();
      // POST to /api/wallet/withdrawals — locks funds in escrow until admin approves
      await axios.post(`${API_BASE}/wallet/withdrawals`, {
        amount:        amt,
        currency,
        paymentMethod: currency === 'NGN' ? 'bank' : 'usdt',
        ...(currency === 'NGN'
          ? { bank_name: bankName, account_number: accNum, account_name: accName }
          : { usdt_address: wdrAddr, usdt_network: wdrNet }),
      }, { headers: { Authorization: `Bearer ${token}` } });

      setWdrOpen(false);
      fetchAll();
    } catch (e: any) {
      setWdrErr(e.response?.data?.error || 'Failed to submit withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setWdrAmt(''); setWdrErr('');
    setBankName(''); setAccNum(''); setAccName('');
    setWdrAddr(''); setWdrNet('');
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
      <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400 font-medium">Loading wallet…</p>
    </div>
  );

  const displayBalance = currency === 'NGN' ? fmtNGN(balance) : fmtUSDT(usdtBalance);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">

        {/* ── Header ── */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Wallet</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your earnings and withdrawals</p>
        </div>

        {/* ── Currency toggle ── */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['NGN', 'USDT'] as const).map((c) => (
            <button key={c} onClick={() => setCurrency(c)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                currency === c ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* ── Balance card ── */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-500">
              {currency === 'NGN' ? 'Available Balance' : 'USDT Balance'}
            </span>
          </div>

          <p className="text-4xl font-extrabold text-gray-900 mb-5 tracking-tight">{displayBalance}</p>

          {/* Withdraw button only — clippers earn, they don't deposit */}
          <button
            onClick={openWithdraw}
            className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-3.5 rounded-xl text-base hover:bg-red-600 active:scale-[0.98] transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            Withdraw
          </button>
        </div>

        {/* ── Withdrawal history ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <h2 className="text-lg font-bold text-gray-900">Withdrawal History</h2>
            </div>
            <button onClick={fetchAll} className="text-gray-400 hover:text-gray-600 transition-colors" title="Refresh">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {withdrawals.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <p className="text-base font-bold text-gray-700">No withdrawals yet</p>
              <p className="text-sm text-gray-400">Your withdrawal history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {withdrawals.slice(0, 10).map((w) => {
                const cfg = statusCfg(w.status);
                return (
                  <div key={w._id} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{fmt(w.amount, w.currency)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {w.currency}
                          {w.paymentMethod === 'bank' && w.bank_name ? ` · ${w.bank_name}` : ''}
                          {w.paymentMethod === 'usdt' && w.usdt_network ? ` · USDT ${w.usdt_network}` : ''}
                          {' · '}{new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {w.declineReason && (
                          <p className="text-xs text-red-500 mt-0.5 italic">{w.declineReason}</p>
                        )}
                      </div>
                    </div>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${cfg.bgCls} ${cfg.textCls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════ WITHDRAWAL MODAL ══════════════════ */}
      {wdrOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">

            {/* Drag handle (mobile feel) */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-extrabold text-gray-900">Withdraw {currency}</h2>
              <button
                onClick={() => { setWdrOpen(false); resetForm(); }}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {wdrErr && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
                  {wdrErr}
                </div>
              )}

              {/* Amount */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Amount ({currency === 'NGN' ? '₦' : 'USDT'})
                </p>
                <div className="flex items-center border border-gray-200 bg-gray-50 rounded-2xl px-4">
                  <span className="text-2xl font-bold text-gray-400 mr-2">
                    {currency === 'NGN' ? '₦' : '$'}
                  </span>
                  <input
                    type="number"
                    value={wdrAmt}
                    onChange={(e) => { setWdrAmt(e.target.value); setWdrErr(''); }}
                    placeholder="0"
                    className="flex-1 py-4 bg-transparent text-2xl font-bold text-gray-900 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>Available: {currency === 'NGN' ? fmtNGN(balance) : fmtUSDT(usdtBalance)}</span>
                  <span>Min: {currency === 'NGN' ? fmtNGN(minNgnWithdraw) : `${minUsdtWithdraw} USDT`}</span>
                </div>
              </div>

              {/* NGN: bank details */}
              {currency === 'NGN' && (
                <div className="space-y-3">
                  {([
                    ['Bank Name',      bankName,  setBankName, 'e.g. Zenith Bank',       'text'  ],
                    ['Account Number', accNum,    setAccNum,   '10-digit account number', 'number'],
                    ['Account Name',   accName,   setAccName,  "Account holder's name",   'text'  ],
                  ] as [string, string, React.Dispatch<React.SetStateAction<string>>, string, string][]).map(([lbl, val, setter, ph, type]) => (
                    <div key={lbl}>
                      <p className="text-sm font-semibold text-gray-700 mb-1.5">{lbl}</p>
                      <input
                        type={type}
                        value={val}
                        onChange={(e) => { setter(e.target.value); setWdrErr(''); }}
                        placeholder={ph}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* USDT: address + network */}
              {currency === 'USDT' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1.5">USDT Wallet Address</p>
                    <input
                      type="text"
                      value={wdrAddr}
                      onChange={(e) => { setWdrAddr(e.target.value); setWdrErr(''); }}
                      placeholder="Enter your USDT address"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1.5">Network (TRC20 / ERC20 / BEP20)</p>
                    <input
                      type="text"
                      value={wdrNet}
                      onChange={(e) => { setWdrNet(e.target.value); setWdrErr(''); }}
                      placeholder="e.g. TRC20"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  {/* Warning for USDT */}
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Make sure the network matches your wallet. Wrong network = lost funds.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={submitWithdrawal}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-4 rounded-2xl text-base hover:bg-red-600 transition-colors disabled:opacity-60 active:scale-[0.98]"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Submit Withdrawal Request
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 pb-2">
                Withdrawals are processed within 24–48 hours
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}