import React, { useEffect, useState, FormEvent } from 'react';
import axios from 'axios';
import { HiOutlineArrowDown } from 'react-icons/hi';

type Withdrawal = {
  _id: string;
  amount: number;
  paymentMethod: 'bank';
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  status: 'pending' | 'completed' | 'declined';
  declineReason?: string;
  createdAt: string;
};

export default function ClipperWallet() {
  const [balance, setBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  // Withdrawal dialog state
  const [showWdrModal, setShowWdrModal] = useState(false);
  const [wdrAmt, setWdrAmt] = useState(0);
  const [wdrBankName, setWdrBankName] = useState('');
  const [wdrAcctNum, setWdrAcctNum] = useState('');
  const [wdrAcctName, setWdrAcctName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // fetch wallet & withdrawals
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [wRes, wdRes] = await Promise.all([
        axios.get<{ balance: number }>('/wallet'),
        axios.get<Withdrawal[]>('/withdrawals'),
      ]);
      setBalance(wRes.data.balance);
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

  // submit withdrawal request
  const submitWithdraw = async (e: FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setMsg(null);
    if (wdrAmt <= 0 || wdrAmt > balance) {
      setMsg('Invalid withdrawal amount.');
      setProcessing(false);
      return;
    }
    if (!wdrBankName || !wdrAcctNum || !wdrAcctName) {
      setMsg('All bank details are required.');
      setProcessing(false);
      return;
    }
    try {
      await axios.post('/withdrawals', {
        amount: wdrAmt,
        paymentMethod: 'bank',
        bankName: wdrBankName,
        accountNumber: wdrAcctNum,
        accountName: wdrAcctName,
      });
      setMsg('Withdrawal requested – admin will process within 30 mins.');
      setShowWdrModal(false);
      setWdrAmt(0);
      setWdrBankName('');
      setWdrAcctNum('');
      setWdrAcctName('');
      fetchAll();
    } catch (err: any) {
      console.error(err);
      setMsg(err.response?.data?.error || 'Withdrawal request failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <p className="text-center py-10">Loading wallet…</p>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-4">
      {msg && (
        <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded">{msg}</div>
      )}

      <h2 className="text-2xl font-semibold">My Wallet</h2>
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <p className="text-sm text-gray-600">Available Balance</p>
        <p className="text-3xl font-bold">₦{balance.toLocaleString()}</p>
      </div>
      <button
        onClick={() => setShowWdrModal(true)}
        disabled={balance <= 0}
        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50"
      >
        <HiOutlineArrowDown className="w-5 h-5 mr-2" />
        Withdraw Funds
      </button>

      {/* WITHDRAWAL REQUESTS TABLE */}
      <h3 className="text-xl font-semibold mt-8">My Withdrawal Requests</h3>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Amount</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Bank</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Acct #</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Acct Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {withdrawals.map(w => (
              <tr key={w._id}>
                <td className="px-4 py-2 text-sm">{new Date(w.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-sm">₦{w.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-sm">{w.bank_name}</td>
                <td className="px-4 py-2 text-sm">{w.account_number}</td>
                <td className="px-4 py-2 text-sm">{w.account_name}</td>
                <td className="px-4 py-2 text-sm">
                  {w.status === 'declined'
                    ? <span className="text-red-600">Declined{w.declineReason ? ': ' + w.declineReason : ''}</span>
                    : (w.status === 'completed' || w.status === 'paid')
                      ? <span className="text-green-600">Paid</span>
                      : <span className="text-yellow-600">Pending</span>
                  }
                </td>

              </tr>
            ))}
            {withdrawals.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">No withdrawal requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* WITHDRAWAL MODAL */}
      {showWdrModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
              <h3 className="text-xl font-bold">Withdraw Funds</h3>
              <p className="text-blue-100 text-sm mt-1">Available balance: ₦{balance.toLocaleString()}</p>
            </div>

            <form onSubmit={submitWithdraw} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={balance}
                      value={wdrAmt}
                      onChange={e => setWdrAmt(Number(e.target.value))}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      placeholder="Enter amount"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <span className="text-gray-500">NGN</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={wdrBankName}
                    onChange={e => setWdrBankName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="e.g. Zenith Bank"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={wdrAcctNum}
                    onChange={e => setWdrAcctNum(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="10-digit account number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    value={wdrAcctName}
                    onChange={e => setWdrAcctName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Account holder's name"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWdrModal(false)}
                  disabled={processing}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 flex items-center justify-center"
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : 'Withdraw Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
