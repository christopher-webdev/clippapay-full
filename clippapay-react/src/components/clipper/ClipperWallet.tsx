import React, { useEffect, useState, FormEvent } from 'react';
import axios from 'axios';
import { HiOutlineArrowDown } from 'react-icons/hi';

type Withdrawal = {
  _id: string;
  amount: number;
  paymentMethod: 'bank' | 'usdt';
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  usdt_address?: string;
  usdt_network?: string;
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
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'usdt'>('bank');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [usdtNetwork, setUsdtNetwork] = useState('');
  const usdtRate = 1500; // ₦1500 per 1 USDT
  const usdtEquivalent = wdrAmt > 0 ? (wdrAmt / usdtRate).toFixed(2) : '0.00';


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

    // Check basic amount validity
    if (wdrAmt <= 0 || wdrAmt > balance) {
      setMsg('Invalid withdrawal amount.');
      setProcessing(false);
      return;
    }

    // Payment method–specific validation
    if (paymentMethod === 'bank') {
      if (!wdrBankName || !wdrAcctNum || !wdrAcctName) {
        setMsg('All bank details are required.');
        setProcessing(false);
        return;
      }
    } else if (paymentMethod === 'usdt') {
      if (!usdtAddress || !usdtNetwork) {
        setMsg('USDT address and network are required.');
        setProcessing(false);
        return;
      }
    }

    try {
      await axios.post('/withdrawals', {
        amount: wdrAmt,
        paymentMethod,
        ...(paymentMethod === 'bank'
          ? {
            bankName: wdrBankName,
            accountNumber: wdrAcctNum,
            accountName: wdrAcctName,
          }
          : {
            usdtAddress,
            usdtNetwork,
          }),
      });

      setMsg('Withdrawal requested – admin will process within 30 mins.');
      setShowWdrModal(false);

      // Clear all fields
      setWdrAmt(0);
      setWdrBankName('');
      setWdrAcctNum('');
      setWdrAcctName('');
      setUsdtAddress('');
      setUsdtNetwork('');

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
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Payment Method</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Details</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {withdrawals.map(w => (
              <tr key={w._id}>
                <td className="px-4 py-2 text-sm">{new Date(w.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-sm">₦{w.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-sm capitalize">{w.paymentMethod}</td>
                <td className="px-4 py-2 text-sm">
                  {w.paymentMethod === 'bank' ? (
                    <>
                      <div><strong>Bank:</strong> {w.bank_name}</div>
                      <div><strong>Acct #:</strong> {w.account_number}</div>
                      <div><strong>Name:</strong> {w.account_name}</div>
                    </>
                  ) : (
                    <>
                      <div><strong>Address:</strong> {w.usdt_address}</div>
                      <div><strong>Network:</strong> {w.usdt_network}</div>
                    </>
                  )}
                </td>
                <td className="px-4 py-2 text-sm">
                  {w.status === 'declined' ? (
                    <span className="text-red-600">Declined{w.declineReason ? ': ' + w.declineReason : ''}</span>
                  ) : w.status === 'completed' || w.status === 'paid' ? (
                    <span className="text-green-600">Paid</span>
                  ) : (
                    <span className="text-yellow-600">Pending</span>
                  )}
                </td>
              </tr>
            ))}
            {withdrawals.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">
                  No withdrawal requests yet.
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>

      {showWdrModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-600 text-white p-6">
              <h3 className="text-xl font-bold">Withdraw Funds</h3>
              <p className="text-blue-100 text-sm mt-1">Available balance: ₦{balance.toLocaleString()}</p>
            </div>

            <form onSubmit={submitWithdraw} className="p-6 space-y-6">
              <div>
                {/* Payment Method Tabs */}
                <div className="flex space-x-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border
                ${paymentMethod === 'bank' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Bank Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('usdt')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border
                ${paymentMethod === 'usdt' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700'}`}
                  >
                    USDT Wallet
                  </button>
                </div>
              </div>

              {/* Common Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  min={1}
                  max={balance}
                  value={wdrAmt}
                  onChange={e => setWdrAmt(Number(e.target.value))}
                  required
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="Enter amount"
                />
              </div>

              {/* Bank Transfer Fields */}
              {paymentMethod === 'bank' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={wdrBankName}
                      onChange={e => setWdrBankName(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="e.g. Zenith Bank"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={wdrAcctNum}
                      onChange={e => setWdrAcctNum(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="10-digit account number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={wdrAcctName}
                      onChange={e => setWdrAcctName(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="Account holder’s name"
                    />
                  </div>
                </>
              )}

              {/* USDT Wallet Fields */}
              {paymentMethod === 'usdt' && (
                <>
                  <div className="text-sm text-gray-600 mb-2">
                    You will receive approximately <span className="font-semibold text-black">{usdtEquivalent} USDT</span> (₦{usdtRate} = 1 USDT)
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">USDT Wallet Address</label>
                    <input
                      type="text"
                      value={usdtAddress}
                      onChange={e => setUsdtAddress(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="Enter your USDT address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">USDT Network</label>
                    <input
                      type="text"
                      value={usdtNetwork}
                      onChange={e => setUsdtNetwork(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="e.g. TRC20 or ERC20"
                    />
                  </div>
                </>
              )}


              {/* ACTION BUTTONS */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWdrModal(false)}
                  disabled={processing}
                  className="px-5 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {processing ? 'Processing…' : 'Withdraw Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
