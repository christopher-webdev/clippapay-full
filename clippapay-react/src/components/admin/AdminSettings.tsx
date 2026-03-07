import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';

export interface PlatformSettings {
  // Bank settings
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  
  // USDT settings
  usdtAddress: string;
  usdtNetwork: string;
  usdtMinDeposit: number;
  usdtMinWithdrawal: number;
  
  // NGN limits
  ngnMinDeposit: number;
  ngnMinWithdrawal: number;
  
  // Exchange rate
  usdtRate: number;
}

export default function AdminSettings() {
  // --- State ---
  const [settings, setSettings] = useState<PlatformSettings>({
    // Bank settings
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    
    // USDT settings
    usdtAddress: '',
    usdtNetwork: 'TRC20',
    usdtMinDeposit: 10,
    usdtMinWithdrawal: 5,
    
    // NGN limits
    ngnMinDeposit: 20000,
    ngnMinWithdrawal: 1000,
    
    // Exchange rate
    usdtRate: 1500,
  });
  
  const [form, setForm] = useState(settings);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // --- Load from backend ---
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get<PlatformSettings>('/admin/settings');
        setSettings(data);
        setForm(data);
      } catch (err: any) {
        console.error(err);
        setLoadError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleChange<K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) {
    setForm(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveError(null);
    setSaveSuccess(null);
  }

  function handleCancel() {
    setForm(settings);
    setIsDirty(false);
    setSaveError(null);
    setSaveSuccess(null);
  }

  // --- Save to backend ---
  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const { data } = await axios.put<PlatformSettings>('/admin/settings', form);
      setSettings(data);
      setForm(data);
      setIsDirty(false);
      setSaveSuccess('Settings saved successfully.');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="p-10 text-center text-gray-500">Loading settings…</p>;
  }
  if (loadError) {
    return <p className="p-10 text-center text-red-500">{loadError}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h2 className="text-3xl font-extrabold mb-8 text-cp-blue text-center tracking-tight">
        Platform Settings
      </h2>

      <form
        onSubmit={handleSave}
        className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 shadow-xl rounded-2xl p-8 space-y-8"
      >
        {/* Bank Details Section */}
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-cp-blue text-white text-2xl font-bold shadow">
              🏦
            </div>
            <div>
              <h3 className="text-lg font-bold text-cp-blue">Bank Details</h3>
              <div className="text-xs text-gray-500">For NGN deposits and withdrawals</div>
            </div>
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-cp-indigo">
              Bank Name
            </label>
            <input
              type="text"
              value={form.bankName}
              onChange={e => handleChange('bankName', e.target.value)}
              required
              className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-blue"
              placeholder="e.g. Access Bank"
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-cp-indigo">
              Account Number
            </label>
            <input
              type="text"
              value={form.bankAccountNumber}
              onChange={e => handleChange('bankAccountNumber', e.target.value)}
              required
              className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-blue"
              placeholder="e.g. 1234567890"
            />
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-cp-indigo">
              Account Name
            </label>
            <input
              type="text"
              value={form.bankAccountName}
              onChange={e => handleChange('bankAccountName', e.target.value)}
              required
              className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-blue"
              placeholder="e.g. ClippaPay Ltd"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 my-2"></div>

        {/* USDT Settings Section */}
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-600 text-white text-2xl font-bold shadow">
              ₮
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-600">USDT Settings</h3>
              <div className="text-xs text-gray-500">For cryptocurrency transactions</div>
            </div>
          </div>

          {/* USDT Address */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-cp-indigo">
              USDT Wallet Address
            </label>
            <input
              type="text"
              value={form.usdtAddress}
              onChange={e => handleChange('usdtAddress', e.target.value)}
              required
              className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-green-600 font-mono"
              placeholder="e.g. TXmz7jY7yY9Zy9Zy9Zy9Zy9Zy9Zy9Zy9Zy9"
            />
            <p className="text-xs text-gray-500 mt-1">
              The wallet address where users will send USDT
            </p>
          </div>

          {/* USDT Network */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-cp-indigo">
              Network
            </label>
            <select
              value={form.usdtNetwork}
              onChange={e => handleChange('usdtNetwork', e.target.value)}
              required
              className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-green-600"
            >
              <option value="TRC20">TRC20 (Tron)</option>
              <option value="ERC20">ERC20 (Ethereum)</option>
              <option value="BEP20">BEP20 (Binance)</option>
              <option value="SOL">SOL (Solana)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              The blockchain network for USDT transfers
            </p>
          </div>

          {/* USDT Limits Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-cp-indigo">
                Min Deposit (USDT)
              </label>
              <input
                type="number"
                value={form.usdtMinDeposit}
                onChange={e => handleChange('usdtMinDeposit', parseFloat(e.target.value) || 0)}
                required
                min="1"
                step="1"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-cp-indigo">
                Min Withdrawal (USDT)
              </label>
              <input
                type="number"
                value={form.usdtMinWithdrawal}
                onChange={e => handleChange('usdtMinWithdrawal', parseFloat(e.target.value) || 0)}
                required
                min="1"
                step="1"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 my-2"></div>

        {/* NGN Limits Section */}
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-purple-600 text-white text-2xl font-bold shadow">
              ₦
            </div>
            <div>
              <h3 className="text-lg font-bold text-purple-600">NGN Limits</h3>
              <div className="text-xs text-gray-500">For Nigerian Naira transactions</div>
            </div>
          </div>

          {/* NGN Limits Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-cp-indigo">
                Min Deposit (NGN)
              </label>
              <input
                type="number"
                value={form.ngnMinDeposit}
                onChange={e => handleChange('ngnMinDeposit', parseFloat(e.target.value) || 0)}
                required
                min="100"
                step="100"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-cp-indigo">
                Min Withdrawal (NGN)
              </label>
              <input
                type="number"
                value={form.ngnMinWithdrawal}
                onChange={e => handleChange('ngnMinWithdrawal', parseFloat(e.target.value) || 0)}
                required
                min="100"
                step="100"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 my-2"></div>

        {/* Exchange Rate Section */}
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-amber-600 text-white text-2xl font-bold shadow">
              ↔️
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-600">Exchange Rate</h3>
              <div className="text-xs text-gray-500">For display purposes</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-cp-indigo">
              USDT to NGN Rate
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">₦</span>
              <input
                type="number"
                value={form.usdtRate}
                onChange={e => handleChange('usdtRate', parseFloat(e.target.value) || 0)}
                required
                min="1"
                step="1"
                className="w-full pl-8 px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-amber-600"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Example: 1 USDT = ₦{form.usdtRate}
            </p>
          </div>
        </div>

        {/* Save / Cancel */}
        <div className="flex items-center gap-4 pt-4 border-t mt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={!isDirty || saving}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isDirty || saving}
            className="px-6 py-2 bg-cp-blue text-white font-semibold rounded-xl shadow hover:bg-cp-indigo transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

        {/* Feedback */}
        {saveError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{saveError}</p>
          </div>
        )}
        {saveSuccess && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-green-600 text-sm">{saveSuccess}</p>
          </div>
        )}
      </form>

      {/* Preview Section */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Preview - What users will see:</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-24 font-medium text-gray-600">Bank:</span>
            <span className="text-gray-800">{form.bankName || 'Not set'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 font-medium text-gray-600">Account:</span>
            <span className="text-gray-800">{form.bankAccountNumber || 'Not set'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 font-medium text-gray-600">Account Name:</span>
            <span className="text-gray-800">{form.bankAccountName || 'Not set'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 font-medium text-gray-600">USDT Address:</span>
            <span className="text-gray-800 font-mono text-xs">
              {form.usdtAddress ? `${form.usdtAddress.substring(0, 10)}...` : 'Not set'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 font-medium text-gray-600">USDT Network:</span>
            <span className="text-gray-800">{form.usdtNetwork}</span>
          </div>
        </div>
      </div>
    </div>
  );
}