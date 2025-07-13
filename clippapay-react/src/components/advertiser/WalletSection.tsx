

// File: src/components/WalletSection.tsx

import React, {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
} from 'react';
import axios from 'axios';
import { Dialog } from '@headlessui/react';
import {
  UploadCloud,
  ArrowDownCircle,
  FileText,
} from 'lucide-react';

type Deposit = {
  _id: string;
  amount: number;
  receiptUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

type Withdrawal = {
  _id: string;
  amount: number;
  method: 'bank' | 'usdt';
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  usdtAddress?: string;
  usdtNetwork?: string;
  status: 'pending' | 'completed' | 'declined';
  createdAt: string;
};

export default function WalletSection() {
  // balances
  const [balance, setBalance] = useState(0);
  const [escrow, setEscrow] = useState(0);

  // lists
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  // loading / messages
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // Deposit modal
  const [showDepModal, setShowDepModal] = useState(false);
  const [depAmt, setDepAmt] = useState(0);
  const [depFile, setDepFile] = useState<File | null>(null);
  const [depMethod, setDepMethod] = useState<'bank' | 'usdt'>('bank');

  // Withdrawal modal
  const [showWdrModal, setShowWdrModal] = useState(false);
  const [wdrAmt, setWdrAmt] = useState(0);
  const [wdrMethod, setWdrMethod] = useState<'bank' | 'usdt'>('bank');
  const [wdrBankName, setWdrBankName] = useState('');
  const [wdrAcctNum, setWdrAcctNum] = useState('');
  const [wdrAcctName, setWdrAcctName] = useState('');
  const [wdrUsdtAddr, setWdrUsdtAddr] = useState('');
  const [wdrUsdtNet, setWdrUsdtNet] = useState('');

  const withdrawable = balance - escrow;

  // fetch wallet, deposits, withdrawals
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [wRes, dRes, wdRes] = await Promise.all([
        axios.get<{ balance: number; escrowLocked: number }>('/wallet'),
        axios.get<Deposit[]>('/wallet/deposits'),
        axios.get<Withdrawal[]>('/withdrawals'),
      ]);
      setBalance(wRes.data.balance);
      setEscrow(wRes.data.escrowLocked);
      setDeposits(dRes.data);
      setWithdrawals(wdRes.data);
    } catch (e) {
      console.error(e);
      setMsg('Failed to load wallet data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // submit deposit request
  const submitDeposit = async (e: FormEvent) => {
    e.preventDefault();
    if (depAmt <= 0 || !depFile) {
      setMsg('Please enter an amount and upload your receipt.');
      return;
    }
    const form = new FormData();
    form.append('amount', depAmt.toString());
    form.append('receipt', depFile);
    form.append('paymentMethod', depMethod);
    try {
      await axios.post('/wallet/deposits', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMsg('Deposit request sent – awaiting approval.');
      setShowDepModal(false);
      setDepAmt(0);
      setDepFile(null);
      fetchAll();
    } catch (err: any) {
      console.error(err);
      setMsg(err.response?.data?.error || 'Deposit submission failed.');
    }
  };

  // submit withdrawal request
  const submitWithdraw = async (e: FormEvent) => {
    e.preventDefault();
    if (wdrAmt <= 0 || wdrAmt > withdrawable) {
      setMsg('Invalid withdrawal amount.');
      return;
    }
    const payload: any = { amount: wdrAmt, paymentMethod: wdrMethod };
    if (wdrMethod === 'bank') {
      if (!wdrBankName || !wdrAcctNum || !wdrAcctName) {
        setMsg('Bank details are required.');
        return;
      }
      payload.bankName = wdrBankName;
      payload.accountNumber = wdrAcctNum;
      payload.accountName = wdrAcctName;
    } else {
      if (!wdrUsdtAddr || !wdrUsdtNet) {
        setMsg('USDT address & network required.');
        return;
      }
      payload.usdtAddress = wdrUsdtAddr;
      payload.usdtNetwork = wdrUsdtNet;
    }
    try {
      await axios.post('/withdrawals', payload);
      setMsg('Withdrawal requested – admin will process within 30 mins.');
      setShowWdrModal(false);
      setWdrAmt(0);
      fetchAll();
    } catch (err: any) {
      console.error(err);
      setMsg(err.response?.data?.error || 'Withdrawal request failed.');
    }
  };

  if (loading) return <p className="text-center py-8">Loading…</p>;

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {msg && (
        <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded">
          {msg}
        </div>
      )}

      {/* Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">
            Available Balance
          </p>
          <p className="mt-2 text-2xl font-bold">
            ₦{balance.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">In Escrow</p>
          <p className="mt-2 text-2xl font-bold">
            ₦{escrow.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => setShowDepModal(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <UploadCloud className="w-5 h-5" />
          Add Funds
        </button>
        <button
          onClick={() => setShowWdrModal(true)}
          disabled={withdrawable <= 0}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
        >
          <ArrowDownCircle className="w-5 h-5" />
          Withdraw Funds
        </button>
      </div>

      {/* Deposit Requests */}
      <section>
        <h2 className="text-lg font-semibold mb-2">
          Your Deposit Requests
        </h2>
        <ul className="space-y-2">
          {deposits.length ? deposits.map((d, idx) => (
            <li
              key={d._id}
              className="flex items-center justify-between bg-white rounded-lg p-4 shadow"
            >
              <div className="flex items-center gap-4">
                <FileText className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium">₦{d.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${d.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : d.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                >
                  {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                </span>
                <a
                  href={d.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Receipt
                </a>
              </div>
            </li>
          )) : (
            <p className="text-gray-500">No deposit requests yet.</p>
          )}
        </ul>
      </section>

      {/* Withdrawal Requests */}
      <section>
        <h2 className="text-lg font-semibold mb-2">
          Your Withdrawal Requests
        </h2>
        <ul className="space-y-2">
          {withdrawals.length ? withdrawals.map((w, idx) => (
            <li
              key={w._id}
              className="flex items-center justify-between bg-white rounded-lg p-4 shadow"
            >
              <div className="flex items-center gap-4">
                <FileText className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium">₦{w.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${w.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : w.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
              >
                {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
              </span>
            </li>
          )) : (
            <p className="text-gray-500">No withdrawal requests yet.</p>
          )}
        </ul>
      </section>

      {/* Deposit Modal */}
      <Dialog
        open={showDepModal}
        onClose={() => setShowDepModal(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <Dialog.Panel className="relative bg-white rounded-lg p-6 w-full max-w-md space-y-4">
          <Dialog.Title className="text-xl font-semibold">
            Add Funds
          </Dialog.Title>
          <div className="space-y-2 text-sm text-gray-700">
            <p>Select payment method:</p>
            <div className="flex gap-4">
              {(['bank', 'usdt'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDepMethod(m)}
                  className={`px-3 py-1 rounded-full border ${depMethod === m
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300'
                    }`}
                >
                  {m === 'bank' ? 'Bank Transfer' : 'USDT Transfer'}
                </button>
              ))}
            </div>
            {depMethod === 'bank' ? (
              <div className="space-y-1">
                <p>Please transfer to:</p>
                <p className="font-medium">Access Bank PLC</p>
                <p className="font-medium">Account: 0030604306</p>
                <p className="font-medium">Name: ClippaPay Inc</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p>Please send USDT to:</p>
                <p className="font-medium">Addr: TXXXXXXXXXXXXXXXXXXX</p>
                <p className="font-medium">Network: TRC20</p>
              </div>
            )}
          </div>
          <form onSubmit={submitDeposit} className="space-y-4">
            <div>
              <label className="block text-sm">Amount (₦)</label>
              <input
                type="number"
                min="1"
                value={depAmt}
                onChange={e => setDepAmt(parseFloat(e.target.value))}
                required
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm">Upload Receipt</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDepFile(e.target.files?.[0] ?? null)
                }
                required
                className="mt-1 block w-full"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDepModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </Dialog>

      {/* Withdrawal Modal */}
      <Dialog
        open={showWdrModal}
        onClose={() => setShowWdrModal(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <Dialog.Panel className="relative bg-white rounded-lg p-6 w-full max-w-md space-y-4">
          <Dialog.Title className="text-xl font-semibold">
            Withdraw Funds
          </Dialog.Title>
          <div className="space-y-2 text-sm text-gray-700">
            <p>You may withdraw up to ₦{withdrawable.toLocaleString()}</p>
            <p>Select payment method:</p>
            <div className="flex gap-4">
              {(['bank', 'usdt'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setWdrMethod(m)}
                  className={`px-3 py-1 rounded-full border ${wdrMethod === m
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300'
                    }`}
                >
                  {m === 'bank' ? 'Bank' : 'USDT'}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={submitWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm">Amount (₦)</label>
              <input
                type="number"
                min="1"
                max={withdrawable}
                value={wdrAmt}
                onChange={e => setWdrAmt(parseFloat(e.target.value))}
                required
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>
            {wdrMethod === 'bank' ? (
              <>
                <div>
                  <label className="block text-sm">Bank Name</label>
                  <input
                    type="text"
                    value={wdrBankName}
                    onChange={e => setWdrBankName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm">Account Number</label>
                  <input
                    type="text"
                    value={wdrAcctNum}
                    onChange={e => setWdrAcctNum(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm">Account Name</label>
                  <input
                    type="text"
                    value={wdrAcctName}
                    onChange={e => setWdrAcctName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm">USDT Address</label>
                  <input
                    type="text"
                    value={wdrUsdtAddr}
                    onChange={e => setWdrUsdtAddr(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm">Network</label>
                  <input
                    type="text"
                    value={wdrUsdtNet}
                    onChange={e => setWdrUsdtNet(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300"
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWdrModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
}