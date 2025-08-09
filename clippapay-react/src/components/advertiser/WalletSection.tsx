

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
  Landmark,          // Bank icon
  CircleDollarSign,  // USDT icon
  Info,              // Information icon
  X                  // Close ico

} from 'lucide-react';

import {
  BanknotesIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

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

  // Add this state to your WalletSection component
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });
  const withdrawable = balance;
  // Add this useEffect to fetch bank details
  useEffect(() => {
    const fetchBankDetails = async () => {
      try {
        const res = await axios.get('/wallet/bank-details');
        setBankDetails(res.data);
      } catch (err) {
        console.error('Failed to fetch bank details:', err);
      }
    };
    fetchBankDetails();
  }, []);
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
    fetchAll(); // initial fetch

    const interval = setInterval(fetchAll, 1500000); // 15000ms = 15s

    return () => clearInterval(interval); // cleanup on unmount
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
        {/* <button
          onClick={() => setShowWdrModal(true)}
          disabled={withdrawable <= 0}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
        >
          <ArrowDownCircle className="w-5 h-5" />
          Withdraw Funds
        </button> */}
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
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Method</h3>
              <div className="flex gap-3">
                {(['bank'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDepMethod(m)}
                    className={`px-4 py-2 rounded-lg border transition-all ${depMethod === m
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      {m === 'bank' ? (
                        <>
                          <BanknotesIcon className="w-5 h-5" />
                          Bank Transfer
                        </>
                      ) : (
                        <>
                          <CurrencyDollarIcon className="w-5 h-5" />
                          USDT Transfer
                        </>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {depMethod === 'bank' ? (
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    Please transfer to the bank account details below
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-md border">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Bank Name</p>
                    <p className="font-medium mt-1">{bankDetails.bankName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Account Number</p>
                    <p className="font-medium mt-1">
                      {bankDetails.accountNumber}
                      <button
                        onClick={() => navigator.clipboard.writeText(bankDetails.accountNumber)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                        title="Copy to clipboard"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      </button>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Account Name</p>
                    <p className="font-medium mt-1">{bankDetails.accountName}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-gray-500">
                    Transfers typically process within 5 - 10 mins
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <p className="text-sm text-purple-800">
                    Please send USDT to the wallet address below
                  </p>
                </div>

                <div className="space-y-3 bg-white p-4 rounded-md border">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Wallet Address</p>
                    <div className="flex items-center mt-1">
                      <p className="font-medium font-mono">TXXXXXXXXXXXXXXXXXXX</p>
                      <button
                        onClick={() => navigator.clipboard.writeText("TXXXXXXXXXXXXXXXXXXX")}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                        title="Copy to clipboard"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Network</p>
                    <p className="font-medium mt-1">TRC20</p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-gray-500">
                    USDT transfers typically confirm within 15-30 minutes
                  </p>
                </div>
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
        <Dialog.Panel className="relative bg-white rounded-xl p-6 w-full max-w-md space-y-6 shadow-xl">
          <div className="flex justify-between items-start">
            <Dialog.Title className="text-xl font-bold text-gray-900">
              Withdraw Funds
            </Dialog.Title>
            <button
              onClick={() => setShowWdrModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                Available for withdrawal: <span className="font-bold">₦{withdrawable.toLocaleString()}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setWdrAmt(withdrawable * 0.25)}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
              >
                25%
              </button>
              <button
                onClick={() => setWdrAmt(withdrawable * 0.5)}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
              >
                50%
              </button>
              <button
                onClick={() => setWdrAmt(withdrawable * 0.75)}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
              >
                75%
              </button>
              <button
                onClick={() => setWdrAmt(withdrawable)}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
              >
                100%
              </button>
            </div>
          </div>

          <form onSubmit={submitWithdraw} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {(['bank',] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setWdrMethod(m)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${wdrMethod === m
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {m === 'bank' ? (
                      <>
                        <Landmark className="w-5 h-5" />
                        Bank Transfer
                      </>
                    ) : (
                      <>
                        <CircleDollarSign className="w-5 h-5" />
                        USDT
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                <input
                  type="number"
                  min="1000" // Minimum withdrawal amount
                  max={withdrawable}
                  value={wdrAmt}
                  onChange={e => setWdrAmt(parseFloat(e.target.value))}
                  required
                  className="pl-8 pr-4 py-2 block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Minimum withdrawal: ₦1,000
              </p>
            </div>

            {wdrMethod === 'bank' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={wdrBankName}
                    onChange={e => setWdrBankName(e.target.value)}
                    required
                    className="block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Access Bank"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={wdrAcctNum}
                      onChange={e => setWdrAcctNum(e.target.value)}
                      required
                      className="block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10 digits"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={wdrAcctName}
                      onChange={e => setWdrAcctName(e.target.value)}
                      required
                      className="block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="As it appears on bank"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">USDT Address</label>
                  <input
                    type="text"
                    value={wdrUsdtAddr}
                    onChange={e => setWdrUsdtAddr(e.target.value)}
                    required
                    className="block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="TXXXXXXXXXXXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                  <select
                    value={wdrUsdtNet}
                    onChange={e => setWdrUsdtNet(e.target.value)}
                    required
                    className="block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select network</option>
                    <option value="TRC20">TRC20</option>
                    <option value="ERC20">ERC20</option>
                    <option value="BEP20">BEP20</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Ensure network matches your wallet
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowWdrModal(false)}
                className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Withdraw Funds'
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
}