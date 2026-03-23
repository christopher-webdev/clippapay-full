// components/advertiser/WalletSection.tsx
// FIXED:
//  1. Correct minimums: ₦20,000 deposit / ₦5,000 withdrawal / $50 USDT deposit / $5 USDT withdrawal
//  2. Withdrawal sends currency + correct snake_case field names the server expects
//  3. Withdrawal checks available balance only (escrow separate)
//  4. Deposit endpoint: POST /api/wallet/deposits (multipart)
//  5. Withdrawal endpoint: POST /api/withdrawals (JSON)
//  6. Auth: Bearer token from localStorage
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://clippapay.com/api';

// ─── minimums (single source of truth) ───────────────────────────────────────
const MIN = {
  NGN_DEPOSIT:    20_000,
  USDT_DEPOSIT:   50,
  NGN_WITHDRAWAL: 5_000,
  USDT_WITHDRAWAL: 5,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface WalletData {
  balance: number; usdtBalance: number;
  escrowLocked: number; usdtEscrowLocked: number;
}
interface PlatformDetails {
  bank: { name: string; accountNumber: string; accountName: string };
  usdt: { address: string; network: string };
}
interface TxItem {
  _id: string; type: string; amount: number;
  currency: 'NGN' | 'USDT'; status: string;
  description?: string; note?: string; createdAt: string;
}
interface Deposit {
  _id: string; amount: number; currency: 'NGN' | 'USDT';
  status: 'pending' | 'approved' | 'rejected'; createdAt: string;
}
interface Withdrawal {
  _id: string; amount: number; currency: 'NGN' | 'USDT';
  status: 'pending' | 'completed' | 'declined'; createdAt: string;
  declineReason?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtNGN  = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
const fmtUSDT = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt     = (n: number, cur: 'NGN' | 'USDT') => cur === 'NGN' ? fmtNGN(n) : fmtUSDT(n);
const getToken = () => localStorage.getItem('token');

const TX_ICONS: Record<string, { color: string; bg: string; label: string }> = {
  deposit:          { color: 'text-emerald-600', bg: 'bg-emerald-50',  label: 'Deposit'          },
  campaign_funding: { color: 'text-amber-600',   bg: 'bg-amber-50',    label: 'Campaign Funding' },
  escrow:           { color: 'text-amber-600',   bg: 'bg-amber-50',    label: 'Escrow Lock'      },
  escrow_release:   { color: 'text-indigo-600',  bg: 'bg-indigo-50',   label: 'Escrow Release'   },
  clipping_reward:  { color: 'text-emerald-600', bg: 'bg-emerald-50',  label: 'Clipping Reward'  },
  withdrawal:       { color: 'text-red-600',     bg: 'bg-red-50',      label: 'Withdrawal'       },
  payment:          { color: 'text-purple-600',  bg: 'bg-purple-50',   label: 'Payment'          },
  refund:           { color: 'text-cyan-600',    bg: 'bg-cyan-50',     label: 'Refund'           },
};
const txIcon = (type: string) => TX_ICONS[type] || { color: 'text-gray-600', bg: 'bg-gray-100', label: type };
const statusColor = (s: string) =>
  ['approved', 'completed'].includes(s)  ? 'text-emerald-600'
  : ['rejected', 'declined'].includes(s) ? 'text-red-600'
  : 'text-amber-600';
const isCredit = (type: string) => ['deposit', 'clipping_reward', 'escrow_release', 'refund'].includes(type);

// ─── Component ────────────────────────────────────────────────────────────────
export default function WalletSection() {
  const [wallet, setWallet]             = useState<WalletData>({ balance: 0, usdtBalance: 0, escrowLocked: 0, usdtEscrowLocked: 0 });
  const [platform, setPlatform]         = useState<PlatformDetails | null>(null);
  const [deposits, setDeposits]         = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals]   = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [historyTab, setHistoryTab]     = useState<'all' | 'deposits' | 'withdrawals'>('all');

  // Deposit modal
  const [depositModal, setDepositModal] = useState(false);
  const [depositCur, setDepositCur]     = useState<'NGN' | 'USDT'>('NGN');
  const [depositAmt, setDepositAmt]     = useState('');
  const [receipt, setReceipt]           = useState<File | null>(null);
  const [txHash, setTxHash]             = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [depositErr, setDepositErr]     = useState('');
  const [depositOk, setDepositOk]       = useState(false);

  // Withdrawal modal
  const [wdrModal, setWdrModal]         = useState(false);
  const [wdrCur, setWdrCur]             = useState<'NGN' | 'USDT'>('NGN');
  const [wdrAmt, setWdrAmt]             = useState('');
  const [bankName, setBankName]         = useState('');
  const [accNum, setAccNum]             = useState('');
  const [accName, setAccName]           = useState('');
  const [wdrAddr, setWdrAddr]           = useState('');
  const [wdrNet, setWdrNet]             = useState('');
  const [wdrErr, setWdrErr]             = useState('');
  const [wdrOk, setWdrOk]               = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const h = { Authorization: `Bearer ${token}` };

      const [walletRes, depositsRes, wdrRes, txRes, platformRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/wallet`,                    { headers: h }),
        axios.get(`${API_BASE}/wallet/deposits`,           { headers: h }),
        axios.get(`${API_BASE}/withdrawals`,               { headers: h }),
        axios.get(`${API_BASE}/transactions`,              { headers: h }),
        axios.get(`${API_BASE}/wallet/platform-details`,   { headers: h }),
      ]);

      if (walletRes.status === 'fulfilled') {
        const d = walletRes.value.data;
        setWallet({
          balance:          d.balance          || 0,
          usdtBalance:      d.usdtBalance      || 0,
          escrowLocked:     d.escrowLocked     || 0,
          usdtEscrowLocked: d.usdtEscrowLocked || 0,
        });
      }
      if (depositsRes.status === 'fulfilled')  setDeposits(depositsRes.value.data   || []);
      if (wdrRes.status === 'fulfilled')        setWithdrawals(wdrRes.value.data     || []);
      if (txRes.status === 'fulfilled')         setTransactions(txRes.value.data     || []);
      if (platformRes.status === 'fulfilled')   setPlatform(platformRes.value.data);
    } catch (e) {
      console.error('wallet load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Deposit submit ──────────────────────────────────────────────────────────
  const submitDeposit = async () => {
    setDepositErr(''); setDepositOk(false);
    const amt = depositCur === 'NGN' ? parseInt(depositAmt) : parseFloat(depositAmt);
    const min = depositCur === 'NGN' ? MIN.NGN_DEPOSIT : MIN.USDT_DEPOSIT;

    if (!amt || isNaN(amt) || amt < min) {
      setDepositErr(`Minimum deposit: ${depositCur === 'NGN' ? fmtNGN(min) : `$${min} USDT`}`);
      return;
    }
    if (!receipt) { setDepositErr('Please attach your payment receipt or screenshot.'); return; }
    if (depositCur === 'USDT' && !txHash.trim()) { setDepositErr('Transaction hash (TXID) is required for USDT deposits.'); return; }

    setSubmitting(true);
    try {
      const token = getToken();
      const form  = new FormData();
      form.append('amount',        amt.toString());
      form.append('currency',      depositCur);
      form.append('paymentMethod', depositCur === 'NGN' ? 'bank_transfer' : 'usdt');
      form.append('receipt',       receipt);
      if (depositCur === 'USDT') {
        form.append('txHash',  txHash.trim());
        form.append('network', platform?.usdt.network || 'TRC20');
      }

      await axios.post(`${API_BASE}/wallet/deposits`, form, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        timeout: 30_000,
      });

      setDepositOk(true);
      setTimeout(() => {
        setDepositModal(false); setDepositAmt(''); setReceipt(null);
        setTxHash(''); setDepositOk(false);
      }, 2000);
      load();
    } catch (e: any) {
      setDepositErr(e.response?.data?.error || 'Could not submit deposit. Please try again.');
    } finally { setSubmitting(false); }
  };

  // ── Withdrawal submit ───────────────────────────────────────────────────────
  const submitWithdrawal = async () => {
    setWdrErr(''); setWdrOk(false);
    const amt   = wdrCur === 'NGN' ? parseInt(wdrAmt) : parseFloat(wdrAmt);
    const avail = wdrCur === 'NGN' ? wallet.balance : wallet.usdtBalance;
    const minW  = wdrCur === 'NGN' ? MIN.NGN_WITHDRAWAL : MIN.USDT_WITHDRAWAL;

    if (!amt || isNaN(amt) || amt <= 0) { setWdrErr('Enter a valid amount.'); return; }
    if (amt < minW)   { setWdrErr(`Minimum withdrawal: ${wdrCur === 'NGN' ? fmtNGN(minW) : `$${minW} USDT`}`); return; }
    if (amt > avail)  { setWdrErr(`Exceeds available ${wdrCur} balance (${fmt(avail, wdrCur)}).`); return; }

    if (wdrCur === 'NGN') {
      if (!bankName.trim())  { setWdrErr('Bank name is required.'); return; }
      if (!accNum.trim())    { setWdrErr('Account number is required.'); return; }
      if (!accName.trim())   { setWdrErr('Account name is required.'); return; }
    } else {
      if (!wdrAddr.trim()) { setWdrErr('USDT wallet address is required.'); return; }
      if (!wdrNet.trim())  { setWdrErr('USDT network is required.'); return; }
    }

    setSubmitting(true);
    try {
      const token = getToken();
      await axios.post(
        `${API_BASE}/withdrawals`,
        {
          amount:        amt,
          currency:      wdrCur,
          paymentMethod: wdrCur === 'NGN' ? 'bank' : 'usdt',
          // Bank fields (snake_case matches model)
          ...(wdrCur === 'NGN'
            ? { bank_name: bankName.trim(), account_number: accNum.trim(), account_name: accName.trim() }
            : { usdt_address: wdrAddr.trim(), usdt_network: wdrNet.trim() }),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setWdrOk(true);
      setTimeout(() => {
        setWdrModal(false); setWdrAmt(''); setBankName(''); setAccNum('');
        setAccName(''); setWdrAddr(''); setWdrNet(''); setWdrOk(false);
      }, 2000);
      load();
    } catch (e: any) {
      setWdrErr(e.response?.data?.error || 'Could not submit withdrawal. Please try again.');
    } finally { setSubmitting(false); }
  };

  // ── History list ────────────────────────────────────────────────────────────
  const historyItems = (() => {
    if (historyTab === 'deposits')    return deposits.map((d) => ({ ...d, type: 'deposit' }));
    if (historyTab === 'withdrawals') return withdrawals.map((w) => ({ ...w, type: 'withdrawal' }));
    const merged = [
      ...transactions,
      ...deposits.map((d) => ({ ...d, type: 'deposit' })),
      ...withdrawals.map((w) => ({ ...w, type: 'withdrawal' })),
    ];
    const seen = new Set<string>();
    return merged
      .filter((x) => { if (seen.has(x._id)) return false; seen.add(x._id); return true; })
      .sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime())
      .slice(0, 40);
  })();

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm font-medium">Loading wallet…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero gradient ── */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 px-6 pt-8 pb-6">
        <h1 className="text-2xl font-extrabold text-white mb-1">My Wallet</h1>
        <p className="text-emerald-200 text-sm mb-5">Available balances · deposit & withdraw anytime</p>

        <div className="grid grid-cols-2 gap-3">
          <BalanceCard
            label="NGN Balance"
            amount={fmtNGN(wallet.balance)}
            sub={wallet.escrowLocked > 0 ? `+ ${fmtNGN(wallet.escrowLocked)} pending` : 'No pending withdrawals'}
            accentText="text-emerald-200"
            subText="text-emerald-200/80"
            onDeposit={() => { setDepositCur('NGN'); setDepositModal(true); setDepositErr(''); }}
            onWithdraw={() => { setWdrCur('NGN'); setWdrModal(true); setWdrErr(''); }}
          />
          <BalanceCard
            label="USDT Balance"
            amount={fmtUSDT(wallet.usdtBalance)}
            sub={wallet.usdtEscrowLocked > 0 ? `+ ${fmtUSDT(wallet.usdtEscrowLocked)} pending` : 'No pending withdrawals'}
            accentText="text-yellow-200"
            subText="text-yellow-200/80"
            onDeposit={() => { setDepositCur('USDT'); setDepositModal(true); setDepositErr(''); }}
            onWithdraw={() => { setWdrCur('USDT'); setWdrModal(true); setWdrErr(''); }}
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">

        {/* Pending-withdrawal info */}
        {(wallet.escrowLocked > 0 || wallet.usdtEscrowLocked > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">Notice</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {wallet.escrowLocked > 0 && <span>{fmtNGN(wallet.escrowLocked)} NGN </span>}
                  {wallet.usdtEscrowLocked > 0 && <span>{fmtUSDT(wallet.usdtEscrowLocked)} USDT </span>}
                  reserved in escrow for your campaign processing. Deposits and withdrawals are processed within 30 Minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Transaction History ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-base font-bold text-gray-900 mb-4">Transaction History</h2>

          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            {(['all', 'deposits', 'withdrawals'] as const).map((t) => (
              <button key={t} onClick={() => setHistoryTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  historyTab === t ? 'bg-white shadow-sm text-emerald-600 font-bold' : 'text-gray-600'
                }`}>
                {t}
              </button>
            ))}
          </div>

          {historyItems.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm text-gray-400 font-medium">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {historyItems.map((item: any) => {
                const ic  = txIcon(item.type || 'payment');
                const cur: 'NGN' | 'USDT' = item.currency || 'NGN';
                const credit = isCredit(item.type);
                return (
                  <div key={item._id} className="flex items-center gap-3 py-3">
                    <div className={`w-10 h-10 rounded-xl ${ic.bg} flex items-center justify-center shrink-0`}>
                      <span className={`text-sm ${ic.color}`}>
                        {credit ? '↓' : item.type === 'withdrawal' ? '↑' : '⇄'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 capitalize truncate">
                        {item.description || item.note || ic.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${credit ? 'text-emerald-600' : 'text-red-500'}`}>
                        {credit ? '+' : '-'}{fmt(item.amount, cur)}
                      </p>
                      <span className={`text-xs font-semibold capitalize ${statusColor(item.status)}`}>
                        {item.status === 'completed' ? 'paid' : item.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          DEPOSIT MODAL
      ══════════════════════════════════════════════════════ */}
      {depositModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <h2 className="text-lg font-extrabold text-gray-900">Deposit Funds</h2>
              <button onClick={() => { setDepositModal(false); setDepositErr(''); setDepositOk(false); }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {depositOk && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-semibold text-center">
                  ✅ Deposit submitted! Pending admin approval.
                </div>
              )}
              {depositErr && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                  {depositErr}
                </div>
              )}

              {/* Currency toggle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
                <div className="flex bg-gray-100 rounded-xl p-1">
                  {(['NGN', 'USDT'] as const).map((c) => (
                    <button key={c}
                      onClick={() => { setDepositCur(c); setDepositErr(''); setReceipt(null); setTxHash(''); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        depositCur === c ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                <div className="flex items-center border border-gray-200 bg-gray-50 rounded-xl px-4">
                  <span className="text-xl font-bold text-gray-400 mr-2">{depositCur === 'NGN' ? '₦' : '$'}</span>
                  <input type="number" value={depositAmt}
                    onChange={(e) => { setDepositAmt(e.target.value); setDepositErr(''); }}
                    placeholder={depositCur === 'NGN' ? '20000' : '50'}
                    className="flex-1 py-3.5 bg-transparent text-xl font-bold text-gray-900 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">
                  Minimum: {depositCur === 'NGN' ? fmtNGN(MIN.NGN_DEPOSIT) : `$${MIN.USDT_DEPOSIT} USDT`}
                </p>
              </div>

              {/* NGN bank details */}
              {depositCur === 'NGN' && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-gray-700 mb-3">
                    1. Transfer to this account first
                  </p>
                  {platform ? (
                    [['Bank', platform.bank.name], ['Account No.', platform.bank.accountNumber], ['Name', platform.bank.accountName]].map(([l, v]) => (
                      <div key={l} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                        <span className="text-sm text-gray-500">{l}</span>
                        <span className="text-sm font-bold text-gray-800">{v}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">Loading bank details…</p>
                  )}
                  <p className="text-xs text-gray-500 mt-3 font-medium">2. Then upload your receipt below</p>
                </div>
              )}

              {/* USDT details */}
              {depositCur === 'USDT' && (
                <div className="space-y-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-gray-700 mb-3">
                      1. Send USDT {platform ? `(${platform.usdt.network})` : ''} to:
                    </p>
                    {platform ? (
                      <>
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2.5 mb-3">
                          <span className="flex-1 text-xs font-mono text-gray-800 truncate">{platform.usdt.address}</span>
                          <button onClick={() => navigator.clipboard.writeText(platform.usdt.address)}
                            className="text-emerald-600 hover:text-emerald-700 shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-2.5">
                          <svg className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-xs text-amber-800">Only send on {platform.usdt.network}. Wrong network = lost funds.</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Loading USDT details…</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">2. Paste Transaction Hash (TXID) *</label>
                    <textarea value={txHash}
                      onChange={(e) => { setTxHash(e.target.value); setDepositErr(''); }}
                      placeholder="Paste transaction hash from your wallet"
                      rows={2}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Receipt upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {depositCur === 'NGN' ? '3. Upload Bank Receipt *' : '3. Upload Screenshot *'}
                </label>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-6 cursor-pointer transition-colors ${
                  receipt ? 'border-emerald-400 bg-emerald-50' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                }`}>
                  <svg className={`w-7 h-7 mb-2 ${receipt ? 'text-emerald-600' : 'text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={receipt ? 'M5 13l4 4L19 7' : 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'} />
                  </svg>
                  <span className="text-sm font-semibold text-emerald-600">
                    {receipt ? `✓ ${receipt.name}` : 'Click to attach receipt'}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">JPG, PNG or PDF</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) { setReceipt(e.target.files[0]); setDepositErr(''); } }} />
                </label>
              </div>

              <button onClick={submitDeposit} disabled={submitting || depositOk}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting
                  ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
                  : 'Submit Deposit Request'}
              </button>
              <p className="text-center text-xs text-gray-400">Your deposit will be credited after admin approval</p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          WITHDRAWAL MODAL
      ══════════════════════════════════════════════════════ */}
      {wdrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <h2 className="text-lg font-extrabold text-gray-900">Withdraw Funds</h2>
              <button onClick={() => { setWdrModal(false); setWdrErr(''); setWdrOk(false); }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {wdrOk && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-semibold text-center">
                  ✅ Withdrawal request submitted! Processing within 30 Minutes.
                </div>
              )}
              {wdrErr && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                  {wdrErr}
                </div>
              )}

              {/* Currency */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
                <div className="flex bg-gray-100 rounded-xl p-1">
                  {(['NGN', 'USDT'] as const).map((c) => (
                    <button key={c} onClick={() => { setWdrCur(c); setWdrErr(''); setBankName(''); setAccNum(''); setAccName(''); setWdrAddr(''); setWdrNet(''); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        wdrCur === c ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                <div className="flex items-center border border-gray-200 bg-gray-50 rounded-xl px-4">
                  <span className="text-xl font-bold text-gray-400 mr-2">{wdrCur === 'NGN' ? '₦' : '$'}</span>
                  <input type="number" value={wdrAmt}
                    onChange={(e) => { setWdrAmt(e.target.value); setWdrErr(''); }}
                    placeholder="0"
                    className="flex-1 py-3.5 bg-transparent text-xl font-bold text-gray-900 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between mt-1.5 px-0.5">
                  <p className="text-xs text-gray-500">
                    Min: {wdrCur === 'NGN' ? fmtNGN(MIN.NGN_WITHDRAWAL) : `$${MIN.USDT_WITHDRAWAL} USDT`}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    Available: <span className="text-emerald-600 font-bold">
                      {wdrCur === 'NGN' ? fmtNGN(wallet.balance) : fmtUSDT(wallet.usdtBalance)}
                    </span>
                  </p>
                </div>
              </div>

              {/* NGN bank fields */}
              {wdrCur === 'NGN' && (
                <div className="space-y-3">
                  {([
                    ['Bank Name',      bankName,  setBankName, 'e.g. Zenith Bank',        'text'],
                    ['Account Number', accNum,    setAccNum,   '10-digit NUBAN',           'text'],
                    ['Account Name',   accName,   setAccName,  'Exact account holder name','text'],
                  ] as [string, string, React.Dispatch<React.SetStateAction<string>>, string, string][]).map(([lbl, val, setter, ph]) => (
                    <div key={lbl}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{lbl}</label>
                      <input type="text" value={val}
                        onChange={(e) => { setter(e.target.value); setWdrErr(''); }}
                        placeholder={ph}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* USDT fields */}
              {wdrCur === 'USDT' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">USDT Wallet Address</label>
                    <input type="text" value={wdrAddr}
                      onChange={(e) => { setWdrAddr(e.target.value); setWdrErr(''); }}
                      placeholder="Your USDT address"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Network</label>
                    <div className="flex gap-2">
                      {['TRC20', 'ERC20', 'BEP20'].map((net) => (
                        <button key={net} onClick={() => { setWdrNet(net); setWdrErr(''); }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            wdrNet === net ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}>
                          {net}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={wdrNet}
                      onChange={(e) => { setWdrNet(e.target.value); setWdrErr(''); }}
                      placeholder="or type network manually"
                      className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                </div>
              )}

              {/* Info banner */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-700">
                  Funds are reserved from your balance immediately. If your request is declined, the amount is returned to your wallet automatically.
                </p>
              </div>

              <button onClick={submitWithdrawal} disabled={submitting || wdrOk}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting
                  ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
                  : 'Submit Withdrawal Request'}
              </button>
              <p className="text-center text-xs text-gray-400">Processed within 24–48 hours</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BalanceCard ──────────────────────────────────────────────────────────────
function BalanceCard({ label, amount, sub, accentText, subText, onDeposit, onWithdraw }: {
  label: string; amount: string; sub: string;
  accentText: string; subText: string;
  onDeposit: () => void; onWithdraw: () => void;
}) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
      <p className={`text-xs font-bold uppercase tracking-wide mb-1.5 ${accentText}`}>{label}</p>
      <p className="text-white font-extrabold text-xl truncate mb-1">{amount}</p>
      <p className={`text-xs mb-4 truncate ${subText}`}>{sub}</p>
      <div className="flex gap-2">
        <button onClick={onDeposit}
          className="flex-1 flex items-center justify-center gap-1 bg-white/20 text-white text-xs font-bold py-2 rounded-lg hover:bg-white/30 transition-colors">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Deposit
        </button>
        <button onClick={onWithdraw}
          className="flex-1 flex items-center justify-center gap-1 bg-white text-emerald-700 text-xs font-bold py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          Withdraw
        </button>
      </div>
    </div>
  );
}